#[test_only]
module my_first_package::codeforge_tests {
    use sui::test_scenario::{Self, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use std::string;
    use my_first_package::codeforge::{Self, SavingsGroup};

    // Test constants
    const ADMIN: address = @0x04578f4e372dd9ffa71b119dfb6ca1e47be3185610453c93c8baea5788685be8;
    const ALICE: address = @0x04578f4e372dd9ffa71b119dfb6ca1e47be3185610453c93c8baea5788685be8;
    const BOB: address = @0x759ec3af549220f11151e6093b4ae8f96f25c27293be86bc677a38df63b3835b;
    const CHARLIE: address = @0x9c419f4aae91757a2471b2e60a4d75b394b1448f0023da3609c0085b6fddfe28;
    const DAVE: address = @0xade0debe0fa31077aa7646c384d8f94b516cfc48c8a5b9b5b418f0dc0da28985;
    const EVE: address = @0xba7cc4f6f12aaa67599bf1b15815b4d426a1bc32be08706922c0e66da7718c2f;
    
    const CONTRIBUTION_AMOUNT: u64 = 1000;
    const CYCLE_DURATION_DAYS: u64 = 7;
    const START_CYCLE: u64 = 0;
    
    // Helper function to create a test scenario
    fun create_test_scenario(): Scenario {
        test_scenario::begin(ADMIN)
    }
    
    // Helper function to create a clock for testing
    fun create_test_clock(scenario: &mut Scenario): Clock {
        let mut clock = clock::create_for_testing(scenario.ctx());
        clock::set_for_testing(&mut clock, 0);
        clock
    }
    
    // Helper function to advance time
    fun advance_time(clock: &mut Clock, days: u64) {
        let current_time = clock::timestamp_ms(clock);
        let advance_ms = days * 24 * 60 * 60 * 1000;
        clock::set_for_testing(clock, current_time + advance_ms);
    }
    
    // Helper function to create test coins
    fun create_test_coin(scenario: &mut Scenario, amount: u64): Coin<SUI> {
        coin::mint_for_testing<SUI>(amount, scenario.ctx())
    }

    #[test]
    fun test_create_savings_group_success() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB, CHARLIE];
        let positions = vector[1u8, 2u8, 3u8];
        
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        scenario.next_tx(ADMIN);
        
        let group = scenario.take_shared<SavingsGroup>();
        assert!(codeforge::is_group_active(&group), 0);
        assert!(codeforge::get_participant_count(&group) == 3, 1);
        assert!(codeforge::get_current_cycle(&group) == 1, 2);
        
        test_scenario::return_shared(group);
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    fun test_contribution_success() {
        let mut scenario = create_test_scenario();
        let mut clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB, CHARLIE];
        let positions = vector[1u8, 2u8, 3u8];
        
        // Create group
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        scenario.next_tx(ALICE);
        
        let mut group = scenario.take_shared<SavingsGroup>();
        let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
        
        codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
        
        assert!(codeforge::get_current_savings_balance(&group) == CONTRIBUTION_AMOUNT, 0);
        
        test_scenario::return_shared(group);
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    fun test_multiple_cycles_with_payouts() {
        let mut scenario = create_test_scenario();
        let mut clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB, CHARLIE, DAVE, EVE];
        let positions = vector[1u8, 2u8, 3u8, 4u8, 5u8];
        
        // Create group
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        scenario.next_tx(ADMIN);
        let mut group = scenario.take_shared<SavingsGroup>();
        
        // Test multiple cycles
        let mut cycle = 1;
        while (cycle <= 7) {
            // All participants contribute
            scenario.next_tx(ALICE);
            let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
            codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
            
            scenario.next_tx(BOB);
            let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
            codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
            
            scenario.next_tx(CHARLIE);
            let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
            codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
            
            scenario.next_tx(DAVE);
            let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
            codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
            
            scenario.next_tx(EVE);
            let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
            codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
            
            // Advance time to end of cycle
            advance_time(&mut clock, CYCLE_DURATION_DAYS);
            
            // Process payout
            scenario.next_tx(ADMIN);
            codeforge::process_payout(&mut group, &clock, scenario.ctx());
            
            // Check payout for cycles after start_cycle
            if (cycle > START_CYCLE) {
                let payout_cycle = cycle - START_CYCLE;
                let recipient_position = ((payout_cycle - 1) % 5) + 1;
                let recipient = if (recipient_position == 1) { ALICE }
                              else if (recipient_position == 2) { BOB }
                              else if (recipient_position == 3) { CHARLIE }
                              else if (recipient_position == 4) { DAVE }
                              else { EVE };
                
                scenario.next_tx(recipient);
                let recipient_coin = scenario.take_from_sender<Coin<SUI>>();
                assert!(coin::value(&recipient_coin) == CONTRIBUTION_AMOUNT * 5, cycle);
                coin::burn_for_testing(recipient_coin);
            };
            
            // Start new cycle if not the last one
            if (cycle < 7) {
                scenario.next_tx(ADMIN);
                codeforge::start_new_cycle(&mut group, &clock, scenario.ctx());
            };
            
            cycle = cycle + 1;
        };
        
        test_scenario::return_shared(group);
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    fun test_payout_after_start_cycle() {
        let mut scenario = create_test_scenario();
        let mut clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB, CHARLIE];
        let positions = vector[1u8, 2u8, 3u8];
        
        // Create group with start_cycle = 1
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            1, // start_cycle = 1
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        scenario.next_tx(ADMIN);
        let mut group = scenario.take_shared<SavingsGroup>();
        
        // First cycle - no payout expected
        scenario.next_tx(ALICE);
        let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
        codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
        
        scenario.next_tx(BOB);
        let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
        codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
        
        scenario.next_tx(CHARLIE);
        let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
        codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
        
        advance_time(&mut clock, CYCLE_DURATION_DAYS);
        
        scenario.next_tx(ADMIN);
        codeforge::process_payout(&mut group, &clock, scenario.ctx());
        
        // No payout should be made in first cycle
        assert!(codeforge::get_current_savings_balance(&group) == CONTRIBUTION_AMOUNT * 3, 0);
        
        // Start second cycle
        scenario.next_tx(ADMIN);
        codeforge::start_new_cycle(&mut group, &clock, scenario.ctx());
        
        // Second cycle - payout expected
        scenario.next_tx(ALICE);
        let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
        codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
        
        scenario.next_tx(BOB);
        let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
        codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
        
        scenario.next_tx(CHARLIE);
        let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
        codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
        
        advance_time(&mut clock, CYCLE_DURATION_DAYS);
        
        scenario.next_tx(ADMIN);
        codeforge::process_payout(&mut group, &clock, scenario.ctx());
        
        // ALICE should receive payout (position 1)
        scenario.next_tx(ALICE);
        let recipient_coin = scenario.take_from_sender<Coin<SUI>>();
        assert!(coin::value(&recipient_coin) == CONTRIBUTION_AMOUNT * 6, 1);
        coin::burn_for_testing(recipient_coin);
        
        test_scenario::return_shared(group);
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    fun test_group_deactivation_after_all_payouts() {
        let mut scenario = create_test_scenario();
        let mut clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB, CHARLIE, DAVE, EVE];
        let positions = vector[1u8, 2u8, 3u8, 4u8, 5u8];
        
        // Create group
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        scenario.next_tx(ADMIN);
        let mut group = scenario.take_shared<SavingsGroup>();
        
        // Run through all cycles until group should be deactivated
        let mut cycle = 1;
        while (cycle <= 5) {
            // All participants contribute
            scenario.next_tx(ALICE);
            let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
            codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
            
            scenario.next_tx(BOB);
            let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
            codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
            
            scenario.next_tx(CHARLIE);
            let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
            codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
            
            scenario.next_tx(DAVE);
            let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
            codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
            
            scenario.next_tx(EVE);
            let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
            codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
            
            // Advance time and process payout
            advance_time(&mut clock, CYCLE_DURATION_DAYS);
            
            scenario.next_tx(ADMIN);
            codeforge::process_payout(&mut group, &clock, scenario.ctx());
            
            // Verify payout
            let recipient_position = ((cycle - 1) % 5) + 1;
            let recipient = if (recipient_position == 1) { ALICE }
                          else if (recipient_position == 2) { BOB }
                          else if (recipient_position == 3) { CHARLIE }
                          else if (recipient_position == 4) { DAVE }
                          else { EVE };
            
            scenario.next_tx(recipient);
            let recipient_coin = scenario.take_from_sender<Coin<SUI>>();
            assert!(coin::value(&recipient_coin) == CONTRIBUTION_AMOUNT * 5, cycle);
            coin::burn_for_testing(recipient_coin);
            
            // Check if group should be deactivated
            if (cycle == 5) {
                assert!(!codeforge::is_group_active(&group), cycle);
            } else {
                assert!(codeforge::is_group_active(&group), cycle);
                // Start new cycle
                scenario.next_tx(ADMIN);
                codeforge::start_new_cycle(&mut group, &clock, scenario.ctx());
            };
            
            cycle = cycle + 1;
        };
        
        test_scenario::return_shared(group);
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = codeforge::E_CYCLE_NOT_STARTED)]
    fun test_payout_on_inactive_group_fails() {
        let mut scenario = create_test_scenario();
        let mut clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB];
        let positions = vector[1u8, 2u8];
        
        // Create group
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        scenario.next_tx(ADMIN);
        let mut group = scenario.take_shared<SavingsGroup>();
        
        // Complete all cycles to deactivate group
        let mut cycle = 1;
        while (cycle <= 2) {
            // Both participants contribute
            scenario.next_tx(ALICE);
            let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
            codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
            
            scenario.next_tx(BOB);
            let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
            codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
            
            advance_time(&mut clock, CYCLE_DURATION_DAYS);
            
            scenario.next_tx(ADMIN);
            codeforge::process_payout(&mut group, &clock, scenario.ctx());
            
            // Clean up recipient coins
            let recipient = if (cycle == 1) { ALICE } else { BOB };
            scenario.next_tx(recipient);
            let recipient_coin = scenario.take_from_sender<Coin<SUI>>();
            coin::burn_for_testing(recipient_coin);
            
            if (cycle < 2) {
                scenario.next_tx(ADMIN);
                codeforge::start_new_cycle(&mut group, &clock, scenario.ctx());
            };
            
            cycle = cycle + 1;
        };
        
        // Verify group is inactive
        assert!(!codeforge::is_group_active(&group), 0);
        
        // This should fail with E_CYCLE_NOT_STARTED
        scenario.next_tx(ADMIN);
        codeforge::process_payout(&mut group, &clock, scenario.ctx());
        
        test_scenario::return_shared(group);
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = codeforge::E_INVALID_POSITION)]
    fun test_position_zero_fails() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB];
        let positions = vector[0u8, 1u8]; // Position 0 should fail
        
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = codeforge::E_DUPLICATE_POSITION)]
    fun test_duplicate_positions_fail() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB];
        let positions = vector[1u8, 1u8]; // Duplicate positions should fail
        
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = codeforge::E_INVALID_POSITION)]
    fun test_position_out_of_range_fails() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB];
        let positions = vector[1u8, 3u8]; // Position 3 is out of range for 2 participants
        
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = codeforge::E_INSUFFICIENT_FUNDS)]
    fun test_insufficient_contribution_fails() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB];
        let positions = vector[1u8, 2u8];
        
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        scenario.next_tx(ALICE);
        let mut group = scenario.take_shared<SavingsGroup>();
        let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT - 1); // Insufficient amount
        
        codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
        
        test_scenario::return_shared(group);
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = codeforge::E_ALREADY_CONTRIBUTED)]
    fun test_double_contribution_fails() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB];
        let positions = vector[1u8, 2u8];
        
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        scenario.next_tx(ALICE);
        let mut group = scenario.take_shared<SavingsGroup>();
        
        // First contribution should succeed
        let payment1 = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
        codeforge::contribute(&mut group, payment1, &clock, scenario.ctx());
        
        // Second contribution should fail
        let payment2 = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
        codeforge::contribute(&mut group, payment2, &clock, scenario.ctx());
        
        test_scenario::return_shared(group);
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = codeforge::E_NOT_PAYOUT_TIME)]
    fun test_early_payout_fails() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB];
        let positions = vector[1u8, 2u8];
        
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        scenario.next_tx(ADMIN);
        let mut group = scenario.take_shared<SavingsGroup>();
        
        // Both participants contribute
        scenario.next_tx(ALICE);
        let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
        codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
        
        scenario.next_tx(BOB);
        let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
        codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
        
        // Try to process payout before cycle duration has passed
        scenario.next_tx(ADMIN);
        codeforge::process_payout(&mut group, &clock, scenario.ctx());
        
        test_scenario::return_shared(group);
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = codeforge::E_INVALID_PARTICIPANT_COUNT)]
    fun test_non_participant_contribution_fails() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB];
        let positions = vector[1u8, 2u8];
        
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        scenario.next_tx(CHARLIE); // CHARLIE is not a participant
        let mut group = scenario.take_shared<SavingsGroup>();
        let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
        
        codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
        
        test_scenario::return_shared(group);
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = codeforge::E_INVALID_CYCLE_DURATION)]
    fun test_zero_cycle_duration_fails() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB];
        let positions = vector[1u8, 2u8];
        
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            0, // Zero cycle duration should fail
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = codeforge::E_INVALID_PARTICIPANT_COUNT)]
    fun test_empty_participants_fails() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        let participants = vector[];
        let positions = vector[];
        
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = codeforge::E_INVALID_PARTICIPANT_COUNT)]
    fun test_mismatched_participants_positions_fails() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB];
        let positions = vector[1u8]; // Mismatched lengths
        
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    fun test_view_functions() {
        let mut scenario = create_test_scenario();
        let clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB, CHARLIE];
        let positions = vector[1u8, 2u8, 3u8];
        
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        scenario.next_tx(ADMIN);
        let group = scenario.take_shared<SavingsGroup>();
        
        // Test get_group_info
        let (name, cycle_duration, contribution_amount, current_cycle, balance, is_active) = 
            codeforge::get_group_info(&group);
        assert!(name == string::utf8(b"Test Group"), 0);
        assert!(cycle_duration == CYCLE_DURATION_DAYS, 1);
        assert!(contribution_amount == CONTRIBUTION_AMOUNT, 2);
        assert!(current_cycle == 1, 3);
        assert!(balance == 0, 4);
        assert!(is_active == true, 5);
        
        // Test other view functions
        assert!(codeforge::get_participant_count(&group) == 3, 6);
        assert!(codeforge::get_current_savings_balance(&group) == 0, 7);
        assert!(codeforge::is_group_active(&group) == true, 8);
        assert!(codeforge::get_current_cycle(&group) == 1, 9);
        
        test_scenario::return_shared(group);
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = codeforge::E_NOT_CONTRIBUTION_TIME)]
    fun test_contribution_after_cycle_ends_fails() {
        let mut scenario = create_test_scenario();
        let mut clock = create_test_clock(&mut scenario);
        
        let participants = vector[ALICE, BOB];
        let positions = vector[1u8, 2u8];
        
        codeforge::create_savings_group(
            string::utf8(b"Test Group"),
            CYCLE_DURATION_DAYS,
            START_CYCLE,
            CONTRIBUTION_AMOUNT,
            participants,
            positions,
            &clock,
            scenario.ctx()
        );
        
        scenario.next_tx(ADMIN);
        let mut group = scenario.take_shared<SavingsGroup>();
        
        // Advance time past cycle duration
        advance_time(&mut clock, CYCLE_DURATION_DAYS + 1);
        
        // Try to contribute after cycle has ended - this should fail
        scenario.next_tx(ALICE);
        let payment = create_test_coin(&mut scenario, CONTRIBUTION_AMOUNT);
        codeforge::contribute(&mut group, payment, &clock, scenario.ctx());
        
        test_scenario::return_shared(group);
        clock::destroy_for_testing(clock);
        scenario.end();
    }
}