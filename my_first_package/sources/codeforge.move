module my_first_package::codeforge {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::string::{ String};

    // Error codes
    const E_INVALID_PARTICIPANT_COUNT: u64 = 1;
    const E_INVALID_POSITION: u64 = 2;
    const E_INSUFFICIENT_FUNDS: u64 = 3;
    const E_NOT_CONTRIBUTION_TIME: u64 = 4;
    const E_NOT_PAYOUT_TIME: u64 = 5;
    const E_CYCLE_NOT_STARTED: u64 = 6;
    const E_ALREADY_CONTRIBUTED: u64 = 7;
    const E_DUPLICATE_POSITION: u64 = 8;
    const E_INVALID_CYCLE_DURATION: u64 = 9;
    const E_INVALID_THRESHOLD: u64 = 10;
    const E_NOT_AUTHORIZED_SIGNER: u64 = 11;
    const E_ALREADY_SIGNED: u64 = 12;
    const E_PAYOUT_NOT_READY: u64 = 13;
    const E_INSUFFICIENT_SIGNATURES: u64 = 14;
    const E_PAYOUT_ALREADY_EXECUTED: u64 = 15;

    // Multisig structures
    public struct PendingPayout has store, drop {
        recipient: address,
        amount: u64,
        cycle: u64,
        signatures: vector<address>,
        executed: bool,
        created_at: u64,
    }

    public struct MultisigConfig has store, drop {
        signers: vector<address>,
        threshold: u64, // Minimum number of signatures required
    }

    // Existing structures
    public struct Participant has store, copy, drop {
        wallet: address,
        position: u8,
        has_contributed_current_cycle: bool,
    }

    public struct SavingsGroup has key, store {
        id: UID,
        name: String,
        cycle_duration_days: u64,
        start_cycle: u64,
        contribution_amount: u64,
        participants: vector<Participant>,
        savings_balance: Balance<SUI>,
        current_cycle: u64,
        cycle_start_time: u64,
        is_active: bool,
        total_cycles_completed: u64,
        multisig_config: MultisigConfig,
        pending_payout: Option<PendingPayout>,
    }

    // Events
    public struct GroupCreated has copy, drop {
        group_id: address,
        name: String,
        participants_count: u64,
        multisig_threshold: u64,
    }

    public struct ContributionMade has copy, drop {
        group_id: address,
        contributor: address,
        cycle: u64,
        amount: u64,
    }

    public struct PayoutProposed has copy, drop {
        group_id: address,
        recipient: address,
        cycle: u64,
        amount: u64,
        required_signatures: u64,
    }

    public struct PayoutSigned has copy, drop {
        group_id: address,
        signer: address,
        cycle: u64,
        current_signatures: u64,
        required_signatures: u64,
    }

    public struct PayoutExecuted has copy, drop {
        group_id: address,
        recipient: address,
        cycle: u64,
        amount: u64,
        final_signatures: u64,
    }

    public struct CycleCompleted has copy, drop {
        group_id: address,
        cycle: u64,
        next_recipient_position: u8,
    }

    // Initialize a new savings group with multisig
    public entry fun create_savings_group(
        name: String,
        cycle_duration_days: u64,
        start_cycle: u64,
        contribution_amount: u64,
        participant_wallets: vector<address>,
        participant_positions: vector<u8>,
        multisig_signers: vector<address>,
        multisig_threshold: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(cycle_duration_days > 0, E_INVALID_CYCLE_DURATION);
        assert!(vector::length(&participant_wallets) == vector::length(&participant_positions), E_INVALID_PARTICIPANT_COUNT);
        assert!(vector::length(&participant_wallets) > 0, E_INVALID_PARTICIPANT_COUNT);
        assert!(vector::length(&multisig_signers) > 0, E_INVALID_THRESHOLD);
        assert!(multisig_threshold > 0 && multisig_threshold <= vector::length(&multisig_signers), E_INVALID_THRESHOLD);

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

        let multisig_config = MultisigConfig {
            signers: multisig_signers,
            threshold: multisig_threshold,
        };

        let group = SavingsGroup {
            id: object::new(ctx),
            name,
            cycle_duration_days,
            start_cycle,
            contribution_amount,
            participants,
            savings_balance: balance::zero<SUI>(),
            current_cycle: 1,
            cycle_start_time: clock::timestamp_ms(clock),
            is_active: true,
            total_cycles_completed: 0,
            multisig_config,
            pending_payout: option::none(),
        };

        let group_id = object::uid_to_address(&group.id);
        
        event::emit(GroupCreated {
            group_id,
            name,
            participants_count: len,
            multisig_threshold,
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

    // Propose payout (creates pending payout that needs multisig approval)
    // Propose payout (creates pending payout that needs multisig approval)
public entry fun propose_payout(
    group: &mut SavingsGroup,
    clock: &Clock,
    ctx: &mut TxContext
) {
    assert!(group.is_active, E_CYCLE_NOT_STARTED);
    assert!(option::is_none(&group.pending_payout), E_PAYOUT_ALREADY_EXECUTED);
    
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

    // FIXED: Changed > to >= to include the start_cycle
    if (group.current_cycle >= group.start_cycle && all_contributed) {
        let payout_cycle = group.current_cycle - group.start_cycle + 1; // Also add +1 here
        let recipient_position = ((payout_cycle - 1) % (len as u64)) + 1;
        
        // Find recipient by position
        let mut recipient_address = @0x0;
        let mut i = 0;
        while (i < len) {
            let participant = vector::borrow(&group.participants, i);
            if ((participant.position as u64) == recipient_position) {
                recipient_address = participant.wallet;
                break
            };
            i = i + 1;
        };

        let payout_amount = balance::value(&group.savings_balance);
        if (payout_amount > 0) {
            let pending_payout = PendingPayout {
                recipient: recipient_address,
                amount: payout_amount,
                cycle: group.current_cycle,
                signatures: vector::empty<address>(),
                executed: false,
                created_at: current_time,
            };

            group.pending_payout = option::some(pending_payout);

            event::emit(PayoutProposed {
                group_id,
                recipient: recipient_address,
                cycle: group.current_cycle,
                amount: payout_amount,
                required_signatures: group.multisig_config.threshold,
            });
        };
    };
}

    // Sign pending payout and auto-execute if threshold reached
    public entry fun sign_payout(
        group: &mut SavingsGroup,
        ctx: &mut TxContext
    ) {
        let signer = tx_context::sender(ctx);
        let group_id = object::uid_to_address(&group.id);
        
        // Check if signer is authorized
        let mut is_authorized = false;
        let mut i = 0;
        let signers_len = vector::length(&group.multisig_config.signers);
        while (i < signers_len) {
            if (*vector::borrow(&group.multisig_config.signers, i) == signer) {
                is_authorized = true;
                break
            };
            i = i + 1;
        };
        assert!(is_authorized, E_NOT_AUTHORIZED_SIGNER);

        // Check if there's a pending payout
        assert!(option::is_some(&group.pending_payout), E_PAYOUT_NOT_READY);
        
        let pending_payout = option::borrow_mut(&mut group.pending_payout);
        assert!(!pending_payout.executed, E_PAYOUT_ALREADY_EXECUTED);

        // Check if signer hasn't already signed
        let mut i = 0;
        let signatures_len = vector::length(&pending_payout.signatures);
        while (i < signatures_len) {
            assert!(*vector::borrow(&pending_payout.signatures, i) != signer, E_ALREADY_SIGNED);
            i = i + 1;
        };

        // Add signature
        vector::push_back(&mut pending_payout.signatures, signer);
        let current_signatures = vector::length(&pending_payout.signatures);

        event::emit(PayoutSigned {
            group_id,
            signer,
            cycle: pending_payout.cycle,
            current_signatures,
            required_signatures: group.multisig_config.threshold,
        });

        // Auto-execute if we have enough signatures
        if (current_signatures >= group.multisig_config.threshold) {
            execute_payout_internal(group, ctx);
        };
    }

    // Internal function to execute payout (can be called by contract)
    fun execute_payout_internal(
        group: &mut SavingsGroup,
        ctx: &mut TxContext
    ) {
        let group_id = object::uid_to_address(&group.id);
        
        // Check if there's a pending payout
        assert!(option::is_some(&group.pending_payout), E_PAYOUT_NOT_READY);
        
        let pending_payout = option::borrow_mut(&mut group.pending_payout);
        assert!(!pending_payout.executed, E_PAYOUT_ALREADY_EXECUTED);

        let current_signatures = vector::length(&pending_payout.signatures);
        assert!(current_signatures >= group.multisig_config.threshold, E_INSUFFICIENT_SIGNATURES);

        // Execute the payout
        let payout_balance = balance::split(&mut group.savings_balance, pending_payout.amount);
        let payout_coin = coin::from_balance(payout_balance, ctx);
        transfer::public_transfer(payout_coin, pending_payout.recipient);

        // Mark as executed
        pending_payout.executed = true;
        
        // Increment total_cycles_completed
        group.total_cycles_completed = group.total_cycles_completed + 1;
        
        // Check if all participants have received their payout
        let participants_len = vector::length(&group.participants);
        if (group.total_cycles_completed >= (participants_len as u64)) {
            group.is_active = false;
        };

        event::emit(PayoutExecuted {
            group_id,
            recipient: pending_payout.recipient,
            cycle: pending_payout.cycle,
            amount: pending_payout.amount,
            final_signatures: current_signatures,
        });

        // Clear the pending payout
        group.pending_payout = option::none();

        // Emit cycle completed event
        let next_recipient_position = if (group.current_cycle > group.start_cycle) {
            let next_cycle = group.current_cycle - group.start_cycle + 1;
            ((next_cycle - 1) % (participants_len as u64) + 1) as u8
        } else {
            1
        };

        event::emit(CycleCompleted {
            group_id,
            cycle: group.current_cycle,
            next_recipient_position,
        });
    }

    // Execute payout once enough signatures are collected
    public entry fun execute_payout(
        group: &mut SavingsGroup,
        ctx: &mut TxContext
    ) {
        let group_id = object::uid_to_address(&group.id);
        
        // Check if there's a pending payout
        assert!(option::is_some(&group.pending_payout), E_PAYOUT_NOT_READY);
        
        let pending_payout = option::borrow_mut(&mut group.pending_payout);
        assert!(!pending_payout.executed, E_PAYOUT_ALREADY_EXECUTED);

        let current_signatures = vector::length(&pending_payout.signatures);
        assert!(current_signatures >= group.multisig_config.threshold, E_INSUFFICIENT_SIGNATURES);

        // Execute the payout
        let payout_balance = balance::split(&mut group.savings_balance, pending_payout.amount);
        let payout_coin = coin::from_balance(payout_balance, ctx);
        transfer::public_transfer(payout_coin, pending_payout.recipient);

        // Mark as executed
        pending_payout.executed = true;
        
        // Increment total_cycles_completed
        group.total_cycles_completed = group.total_cycles_completed + 1;
        
        // Check if all participants have received their payout
        let participants_len = vector::length(&group.participants);
        if (group.total_cycles_completed >= (participants_len as u64)) {
            group.is_active = false;
        };

        event::emit(PayoutExecuted {
            group_id,
            recipient: pending_payout.recipient,
            cycle: pending_payout.cycle,
            amount: pending_payout.amount,
            final_signatures: current_signatures,
        });

        // Clear the pending payout
        group.pending_payout = option::none();

        // Emit cycle completed event
        let next_recipient_position = if (group.current_cycle > group.start_cycle) {
            let next_cycle = group.current_cycle - group.start_cycle + 1;
            ((next_cycle - 1) % (participants_len as u64) + 1) as u8
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

    public fun get_multisig_info(group: &SavingsGroup): (vector<address>, u64) {
        (group.multisig_config.signers, group.multisig_config.threshold)
    }

    public fun get_pending_payout_info(group: &SavingsGroup): (bool, address, u64, u64, u64, u64) {
        if (option::is_some(&group.pending_payout)) {
            let payout = option::borrow(&group.pending_payout);
            (
                true,
                payout.recipient,
                payout.amount,
                payout.cycle,
                vector::length(&payout.signatures),
                group.multisig_config.threshold
            )
        } else {
            (false, @0x0, 0, 0, 0, group.multisig_config.threshold)
        }
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

    public fun has_signed_current_payout(group: &SavingsGroup, signer: address): bool {
        if (option::is_some(&group.pending_payout)) {
            let payout = option::borrow(&group.pending_payout);
            let mut i = 0;
            let len = vector::length(&payout.signatures);
            while (i < len) {
                if (*vector::borrow(&payout.signatures, i) == signer) {
                    return true
                };
                i = i + 1;
            };
        };
        false
    }

    // NEW VIEWING FUNCTIONS

    /// Get total contributions for current cycle
    /// Returns (current_contributions, expected_total, contribution_count)
    public fun get_current_cycle_contributions(group: &SavingsGroup): (u64, u64, u64) {
        let mut contribution_count = 0;
        let mut i = 0;
        let len = vector::length(&group.participants);
        
        while (i < len) {
            let participant = vector::borrow(&group.participants, i);
            if (participant.has_contributed_current_cycle) {
                contribution_count = contribution_count + 1;
            };
            i = i + 1;
        };

        let current_contributions = contribution_count * group.contribution_amount;
        let expected_total = len * group.contribution_amount;
        
        (current_contributions, expected_total, contribution_count)
    }

    /// Get who is next to receive payout
    /// Returns (has_next_recipient, recipient_address, recipient_position)
    public fun get_next_payout_recipient(group: &SavingsGroup): (bool, address, u8) {
        if (!group.is_active || group.current_cycle <= group.start_cycle) {
            return (false, @0x0, 0)
        };

        let participants_len = vector::length(&group.participants);
        let next_payout_cycle = (group.current_cycle - group.start_cycle) + 1;
        let recipient_position = ((next_payout_cycle - 1) % (participants_len as u64)) + 1;
        
        // Find recipient by position
        let mut i = 0;
        while (i < participants_len) {
            let participant = vector::borrow(&group.participants, i);
            if ((participant.position as u64) == recipient_position) {
                return (true, participant.wallet, participant.position)
            };
            i = i + 1;
        };

        (false, @0x0, 0)
    }

    /// Get list of participants who have contributed in current cycle
    /// Returns vector of addresses of contributors
    public fun get_current_cycle_contributors(group: &SavingsGroup): vector<address> {
        let mut contributors = vector::empty<address>();
        let mut i = 0;
        let len = vector::length(&group.participants);
        
        while (i < len) {
            let participant = vector::borrow(&group.participants, i);
            if (participant.has_contributed_current_cycle) {
                vector::push_back(&mut contributors, participant.wallet);
            };
            i = i + 1;
        };

        contributors
    }

    /// Get list of participants who haven't contributed in current cycle
    /// Returns vector of addresses of non-contributors
    public fun get_pending_contributors(group: &SavingsGroup): vector<address> {
        let mut pending = vector::empty<address>();
        let mut i = 0;
        let len = vector::length(&group.participants);
        
        while (i < len) {
            let participant = vector::borrow(&group.participants, i);
            if (!participant.has_contributed_current_cycle) {
                vector::push_back(&mut pending, participant.wallet);
            };
            i = i + 1;
        };

        pending
    }

    /// Get detailed contribution status for current cycle
    /// Returns (total_contributed, total_expected, contributors_list, pending_list)
    public fun get_contribution_status(group: &SavingsGroup): (u64, u64, vector<address>, vector<address>) {
        let (current_contributions, expected_total, _) = get_current_cycle_contributions(group);
        let contributors = get_current_cycle_contributors(group);
        let pending = get_pending_contributors(group);
        
        (current_contributions, expected_total, contributors, pending)
    }

    /// Get comprehensive cycle information
    /// Returns (cycle_number, contributions_received, total_expected, next_recipient_address, next_recipient_position, all_contributed)
    public fun get_cycle_summary(group: &SavingsGroup): (u64, u64, u64, address, u8, bool) {
        let (current_contributions, expected_total, contribution_count) = get_current_cycle_contributions(group);
        let (has_next, next_address, next_position) = get_next_payout_recipient(group);
        let participants_len = vector::length(&group.participants);
        let all_contributed = contribution_count == (participants_len as u64);
        
        let recipient_address = if (has_next) { next_address } else { @0x0 };
        let recipient_position = if (has_next) { next_position } else { 0 };
        
        (group.current_cycle, current_contributions, expected_total, recipient_address, recipient_position, all_contributed)
    }

    /// Check if a specific participant has contributed in current cycle
    public fun has_participant_contributed(group: &SavingsGroup, participant_address: address): bool {
        let mut i = 0;
        let len = vector::length(&group.participants);
        
        while (i < len) {
            let participant = vector::borrow(&group.participants, i);
            if (participant.wallet == participant_address) {
                return participant.has_contributed_current_cycle
            };
            i = i + 1;
        };
        
        false
    }

    /// Get participant information by address
    /// Returns (is_participant, position, has_contributed_current_cycle)
    public fun get_participant_info(group: &SavingsGroup, participant_address: address): (bool, u8, bool) {
        let mut i = 0;
        let len = vector::length(&group.participants);
        
        while (i < len) {
            let participant = vector::borrow(&group.participants, i);
            if (participant.wallet == participant_address) {
                return (true, participant.position, participant.has_contributed_current_cycle)
            };
            i = i + 1;
        };
        
        (false, 0, false)
    }
}