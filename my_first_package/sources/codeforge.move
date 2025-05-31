module my_first_package::codeforge {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::string::{ String};

    // Error codes new version
    const E_INVALID_PARTICIPANT_COUNT: u64 = 1;
    const E_INVALID_POSITION: u64 = 2;
    const E_INSUFFICIENT_FUNDS: u64 = 3;
    const E_NOT_CONTRIBUTION_TIME: u64 = 4;
    const E_NOT_PAYOUT_TIME: u64 = 5;
    const E_CYCLE_NOT_STARTED: u64 = 6;
    const E_ALREADY_CONTRIBUTED: u64 = 7;
    const E_DUPLICATE_POSITION: u64 = 8;
    const E_INVALID_CYCLE_DURATION: u64 = 9;

    // public Structs
    public struct Participant has store, copy, drop {
        wallet: address,
        position: u8,
        has_contributed_current_cycle: bool,
    }

    public struct SavingsGroup has key, store {
        id: UID,
        name: String,
        cycle_duration_days: u64, // Duration of each cycle in days
        start_cycle: u64, // Number of cycles before first payout
        contribution_amount: u64,
        participants: vector<Participant>,
        savings_balance: Balance<SUI>,
        current_cycle: u64,
        cycle_start_time: u64,
        is_active: bool,
        total_cycles_completed: u64,
    }

    // Events
    public struct GroupCreated has copy, drop {
        group_id: address,
        name: String,
        participants_count: u64,
    }

    public struct ContributionMade has copy, drop {
        group_id: address,
        contributor: address,
        cycle: u64,
        amount: u64,
    }

    public struct PayoutMade has copy, drop {
        group_id: address,
        recipient: address,
        cycle: u64,
        amount: u64,
    }

    public struct CycleCompleted has copy, drop {
        group_id: address,
        cycle: u64,
        next_recipient_position: u8,
    }

    // Initialize a new savings group
    public entry fun create_savings_group(
        name: String,
        cycle_duration_days: u64,
        start_cycle: u64,
        contribution_amount: u64,
        participant_wallets: vector<address>,
        participant_positions: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(cycle_duration_days > 0, E_INVALID_CYCLE_DURATION);
        assert!(vector::length(&participant_wallets) == vector::length(&participant_positions), E_INVALID_PARTICIPANT_COUNT);
        assert!(vector::length(&participant_wallets) > 0, E_INVALID_PARTICIPANT_COUNT);

        let mut participants = vector::empty<Participant>();
        let mut i = 0;
        let len = vector::length(&participant_wallets);
        
        // Validate positions and create participants
        while (i < len) {
            let wallet = *vector::borrow(&participant_wallets, i);
            let position = *vector::borrow(&participant_positions, i);
            
            assert!(position > 0 && position <= (len as u8), E_INVALID_POSITION);
            
            // Check for duplicate positions
            let mut j = 0;
            while (j < vector::length(&participants)) {
                let existing_participant = vector::borrow(&participants, j);
                assert!(existing_participant.position != position, E_DUPLICATE_POSITION);
                j = j + 1;
            };

            let participant = Participant {
                wallet,
                position,
                has_contributed_current_cycle: false,
            };
            
            vector::push_back(&mut participants, participant);
            i = i + 1;
        };

        let group = SavingsGroup {
            id: object::new(ctx),
            name,
            cycle_duration_days,
            start_cycle,
            contribution_amount,
            participants,
            savings_balance: balance::zero<SUI>(),
            current_cycle: 1, // Start with cycle 1 instead of 0
            cycle_start_time: clock::timestamp_ms(clock),
            is_active: true,
            total_cycles_completed: 0,
        };

        let group_id = object::uid_to_address(&group.id);
        
        event::emit(GroupCreated {
            group_id,
            name,
            participants_count: len,
        });

        transfer::share_object(group);
    }

    // Start a new cycle
    public entry fun start_new_cycle(
        group: &mut SavingsGroup,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        assert!(group.is_active, E_CYCLE_NOT_STARTED);
        
        let current_time = clock::timestamp_ms(clock);
        let cycle_duration_ms = group.cycle_duration_days * 24 * 60 * 60 * 1000;
        
        // Check if enough time has passed for a new cycle
        if (group.current_cycle > 1) {
            assert!(current_time >= group.cycle_start_time + cycle_duration_ms, E_NOT_CONTRIBUTION_TIME);
        };

        // Reset contribution flags for all participants
        let mut i = 0;
        let len = vector::length(&group.participants);
        while (i < len) {
            let participant = vector::borrow_mut(&mut group.participants, i);
            participant.has_contributed_current_cycle = false;
            i = i + 1;
        };

        group.current_cycle = group.current_cycle + 1;
        group.cycle_start_time = current_time;
    }

    // Make contribution to the savings group
    public entry fun contribute(
        group: &mut SavingsGroup,
        payment: Coin<SUI>,
        _clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(group.is_active, E_CYCLE_NOT_STARTED);
        assert!(coin::value(&payment) >= group.contribution_amount, E_INSUFFICIENT_FUNDS);
        
        let sender = tx_context::sender(ctx);
        let group_id = object::uid_to_address(&group.id);
        
        // Find the participant and check if they haven't contributed yet
        let mut participant_found = false;
        let mut i = 0;
        let len = vector::length(&group.participants);
        
        while (i < len) {
            let participant = vector::borrow_mut(&mut group.participants, i);
            if (participant.wallet == sender) {
                assert!(!participant.has_contributed_current_cycle, E_ALREADY_CONTRIBUTED);
                participant.has_contributed_current_cycle = true;
                participant_found = true;
                break
            };
            i = i + 1;
        };
        
        assert!(participant_found, E_INVALID_PARTICIPANT_COUNT);

        // Add contribution to savings balance
        let contribution_balance = coin::into_balance(payment);
        balance::join(&mut group.savings_balance, contribution_balance);

        event::emit(ContributionMade {
            group_id,
            contributor: sender,
            cycle: group.current_cycle,
            amount: group.contribution_amount,
        });
    }

    // Process payout at the end of cycle
    public entry fun process_payout(
        group: &mut SavingsGroup,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(group.is_active, E_CYCLE_NOT_STARTED);
        
        let current_time = clock::timestamp_ms(clock);
        let cycle_duration_ms = group.cycle_duration_days * 24 * 60 * 60 * 1000;
        
        // Check if cycle is complete
        assert!(current_time >= group.cycle_start_time + cycle_duration_ms, E_NOT_PAYOUT_TIME);
        
        // Check if all participants have contributed
        let mut all_contributed = true;
        let mut i = 0;
        let len = vector::length(&group.participants);
        
        while (i < len) {
            let participant = vector::borrow(&group.participants, i);
            if (!participant.has_contributed_current_cycle) {
                all_contributed = false;
                break
            };
            i = i + 1;
        };

        let group_id = object::uid_to_address(&group.id);

        // Only make payout if we're past the start_cycle and all contributed
        if (group.current_cycle > group.start_cycle && all_contributed) {
            let payout_cycle = group.current_cycle - group.start_cycle;
            let recipient_position = ((payout_cycle - 1) % (len as u64)) + 1;
            
            // Find recipient by position
            let mut i = 0;
            while (i < len) {
                let participant = vector::borrow(&group.participants, i);
                if ((participant.position as u64) == recipient_position) {
                    let payout_amount = balance::value(&group.savings_balance);
                    if (payout_amount > 0) {
                        let payout_balance = balance::split(&mut group.savings_balance, payout_amount);
                        let payout_coin = coin::from_balance(payout_balance, ctx);
                        transfer::public_transfer(payout_coin, participant.wallet);
                        
                        event::emit(PayoutMade {
                            group_id,
                            recipient: participant.wallet,
                            cycle: group.current_cycle,
                            amount: payout_amount,
                        });
                    };
                    break
                };
                i = i + 1;
            };

            // Increment total_cycles_completed only when a payout is made
            group.total_cycles_completed = group.total_cycles_completed + 1;
            
            // Check if all participants have received their payout
            if (group.total_cycles_completed >= (len as u64)) {
                group.is_active = false;
            };
        };

        let next_recipient_position = if (group.current_cycle > group.start_cycle) {
            let next_cycle = group.current_cycle - group.start_cycle + 1;
            ((next_cycle - 1) % (len as u64) + 1) as u8
        } else {
            1
        };

        event::emit(CycleCompleted {
            group_id,
            cycle: group.current_cycle,
            next_recipient_position,
        });
    }

    // View functions
    public fun get_group_info(group: &SavingsGroup): (String, u64, u64, u64, u64, bool) {
        (
            group.name,
            group.cycle_duration_days,
            group.contribution_amount,
            group.current_cycle,
            balance::value(&group.savings_balance),
            group.is_active
        )
    }


    public fun get_participant_count(group: &SavingsGroup): u64 {
        vector::length(&group.participants)
    }

    public fun get_current_savings_balance(group: &SavingsGroup): u64 {
        balance::value(&group.savings_balance)
    }

    public fun is_group_active(group: &SavingsGroup): bool {
        group.is_active
    }

    public fun get_current_cycle(group: &SavingsGroup): u64 {
        group.current_cycle
    }
}