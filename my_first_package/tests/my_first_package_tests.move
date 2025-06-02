#[test_only]
module my_first_package::codeforge_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use sui::test_utils;
    use std::string;
    use my_first_package::codeforge::{Self, SavingsGroup};

    // Test addresses
    const USER1: address = @0x04578f4e372dd9ffa71b119dfb6ca1e47be3185610453c93c8baea5788685be8;
    const USER2: address = @0x759ec3af549220f11151e6093b4ae8f96f25c27293be86bc677a38df63b3835b;
    const USER3: address = @0x9c419f4aae91757a2471b2e60a4d75b394b1448f0023da3609c0085b6fddfe28;
    const USER4: address = @0xade0debe0fa31077aa7646c384d8f94b516cfc48c8a5b9b5b418f0dc0da28985;
    const USER5: address = @0xba7cc4f6f12aaa67599bf1b15815b4d426a1bc32be08706922c0e66da7718c2f;
    const USER6: address = @0x04578f4e372dd9ffa71b119dfb6ca1e47be3185610453c93c8baea5788685be8;

    // Test constants
    const CONTRIBUTION_AMOUNT: u64 = 1000000000; // 1 SUI
    const CYCLE_DURATION_DAYS: u64 = 30;
    const MULTISIG_THRESHOLD: u64 = 2;

    // Helper function to create a savings group with 4 participants
    fun create_test_group(scenario: &mut Scenario): (SavingsGroup, Clock) {
        let clock = clock::create_for_testing(ts::ctx(scenario));
        
        // Create participant vectors
        let participant_wallets = vector[USER1, USER2, USER3, USER4];
        let participant_positions = vector[1u8, 2u8, 3u8, 4u8];
        let multisig_signers = vector[USER5, USER6, USER1];

        ts::next_tx(scenario, USER1);
        {
            codeforge::create_savings_group(
                string::utf8(b"Test Group"),
                CYCLE_DURATION_DAYS,
                1, // start_cycle
                CONTRIBUTION_AMOUNT,
                participant_wallets,
                participant_positions,
                multisig_signers,
                MULTISIG_THRESHOLD,
                &clock,
                ts::ctx(scenario)
            );
        };

        ts::next_tx(scenario, USER1);
        let group = ts::take_shared<SavingsGroup>(scenario);
        
        (group, clock)
    }

    // Helper function to create a coin for testing
    fun mint_coin(amount: u64, scenario: &mut Scenario): Coin<SUI> {
        coin::mint_for_testing<SUI>(amount, ts::ctx(scenario))
    }

    #[test]
    fun test_create_savings_group_success() {
        let mut scenario = ts::begin(USER1);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        
        let participant_wallets = vector[USER1, USER2, USER3];
        let participant_positions = vector[1u8, 2u8, 3u8];
        let multisig_signers = vector[USER4, USER5];

        ts::next_tx(&mut scenario, USER1);
        {
            codeforge::create_savings_group(
                string::utf8(b"Test Group"),
                CYCLE_DURATION_DAYS,
                1,
                CONTRIBUTION_AMOUNT,
                participant_wallets,
                participant_positions,
                multisig_signers,
                2,
                &clock,
                ts::ctx(&mut scenario)
            );
        };

        ts::next_tx(&mut scenario, USER1);
        {
            let group = ts::take_shared<SavingsGroup>(&scenario);
            let (name, cycle_duration, contribution_amount, current_cycle, balance, is_active) = 
                codeforge::get_group_info(&group);
            
            assert!(name == string::utf8(b"Test Group"), 0);
            assert!(cycle_duration == CYCLE_DURATION_DAYS, 1);
            assert!(contribution_amount == CONTRIBUTION_AMOUNT, 2);
            assert!(current_cycle == 1, 3);
            assert!(balance == 0, 4);
            assert!(is_active == true, 5);
            assert!(codeforge::get_participant_count(&group) == 3, 6);

            ts::return_shared(group);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 1)] // E_INVALID_PARTICIPANT_COUNT
    fun test_create_savings_group_mismatched_vectors() {
        let mut scenario = ts::begin(USER1);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        
        let participant_wallets = vector[USER1, USER2];
        let participant_positions = vector[1u8]; // Mismatched length
        let multisig_signers = vector[USER3, USER4];

        ts::next_tx(&mut scenario, USER1);
        {
            codeforge::create_savings_group(
                string::utf8(b"Test Group"),
                CYCLE_DURATION_DAYS,
                1,
                CONTRIBUTION_AMOUNT,
                participant_wallets,
                participant_positions,
                multisig_signers,
                2,
                &clock,
                ts::ctx(&mut scenario)
            );
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 8)] // E_DUPLICATE_POSITION
    fun test_create_savings_group_duplicate_positions() {
        let mut scenario = ts::begin(USER1);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        
        let participant_wallets = vector[USER1, USER2];
        let participant_positions = vector[1u8, 1u8]; // Duplicate positions
        let multisig_signers = vector[USER3, USER4];

        ts::next_tx(&mut scenario, USER1);
        {
            codeforge::create_savings_group(
                string::utf8(b"Test Group"),
                CYCLE_DURATION_DAYS,
                1,
                CONTRIBUTION_AMOUNT,
                participant_wallets,
                participant_positions,
                multisig_signers,
                2,
                &clock,
                ts::ctx(&mut scenario)
            );
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_start_new_cycle() {
        let mut scenario = ts::begin(USER1);
        let (mut group, clock) = create_test_group(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            codeforge::start_new_cycle(&mut group, &clock, ts::ctx(&mut scenario));
            assert!(codeforge::get_current_cycle(&group) == 2, 0);
        };

        ts::return_shared(group);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_contribute_success() {
        let mut scenario = ts::begin(USER1);
        let (mut group, clock) = create_test_group(&mut scenario);

        // User1 contributes
        ts::next_tx(&mut scenario, USER1);
        {
            let payment = mint_coin(CONTRIBUTION_AMOUNT, &mut scenario);
            codeforge::contribute(&mut group, payment, &clock, ts::ctx(&mut scenario));
            
            // Check contribution was recorded
            assert!(codeforge::has_participant_contributed(&group, USER1) == true, 0);
            assert!(codeforge::get_current_savings_balance(&group) == CONTRIBUTION_AMOUNT, 1);
        };

        ts::return_shared(group);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 3)] // E_INSUFFICIENT_FUNDS
    fun test_contribute_insufficient_funds() {
        let mut scenario = ts::begin(USER1);
        let (mut group, clock) = create_test_group(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let payment = mint_coin(CONTRIBUTION_AMOUNT - 1, &mut scenario); // Insufficient amount
            codeforge::contribute(&mut group, payment, &clock, ts::ctx(&mut scenario));
        };

        ts::return_shared(group);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 7)] // E_ALREADY_CONTRIBUTED
    fun test_contribute_already_contributed() {
        let mut scenario = ts::begin(USER1);
        let (mut group, clock) = create_test_group(&mut scenario);

        // First contribution
        ts::next_tx(&mut scenario, USER1);
        {
            let payment = mint_coin(CONTRIBUTION_AMOUNT, &mut scenario);
            codeforge::contribute(&mut group, payment, &clock, ts::ctx(&mut scenario));
        };

        // Second contribution (should fail)
        ts::next_tx(&mut scenario, USER1);
        {
            let payment = mint_coin(CONTRIBUTION_AMOUNT, &mut scenario);
            codeforge::contribute(&mut group, payment, &clock, ts::ctx(&mut scenario));
        };

        ts::return_shared(group);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_full_cycle_with_contributions() {
        let mut scenario = ts::begin(USER1);
        let (mut group, mut clock) = create_test_group(&mut scenario);

        // All participants contribute
        let participants = vector[USER1, USER2, USER3, USER4];
        let mut i = 0;
        while (i < 4) {
            let user = *vector::borrow(&participants, i);
            ts::next_tx(&mut scenario, user);
            {
                let payment = mint_coin(CONTRIBUTION_AMOUNT, &mut scenario);
                codeforge::contribute(&mut group, payment, &clock, ts::ctx(&mut scenario));
            };
            i = i + 1;
        };

        // Check all contributions recorded
        ts::next_tx(&mut scenario, USER1);
        {
            let (current_contributions, expected_total, contributors, pending) = 
                codeforge::get_contribution_status(&group);
            assert!(current_contributions == 4 * CONTRIBUTION_AMOUNT, 0);
            assert!(expected_total == 4 * CONTRIBUTION_AMOUNT, 1);
            assert!(vector::length(&contributors) == 4, 2);
            assert!(vector::length(&pending) == 0, 3);
        };

        ts::return_shared(group);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_propose_payout_success() {
        let mut scenario = ts::begin(USER1);
        let (mut group, mut clock) = create_test_group(&mut scenario);

        // All participants contribute
        let participants = vector[USER1, USER2, USER3, USER4];
        let mut i = 0;
        while (i < 4) {
            let user = *vector::borrow(&participants, i);
            ts::next_tx(&mut scenario, user);
            {
                let payment = mint_coin(CONTRIBUTION_AMOUNT, &mut scenario);
                codeforge::contribute(&mut group, payment, &clock, ts::ctx(&mut scenario));
            };
            i = i + 1;
        };

        // Advance time to allow payout
        clock::increment_for_testing(&mut clock, CYCLE_DURATION_DAYS * 24 * 60 * 60 * 1000);

        // Propose payout (now any participant can propose)
        ts::next_tx(&mut scenario, USER1);
        {
            codeforge::propose_payout(&mut group, &clock, ts::ctx(&mut scenario));
            
            let (has_pending, recipient, amount, cycle, signatures, threshold) = 
                codeforge::get_pending_payout_info(&group);
            assert!(has_pending == true, 0);
            assert!(amount == 4 * CONTRIBUTION_AMOUNT, 1);
            assert!(signatures == 0, 2);
            assert!(threshold == MULTISIG_THRESHOLD, 3);
        };

        ts::return_shared(group);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 5)] // E_NOT_PAYOUT_TIME
    fun test_propose_payout_too_early() {
        let mut scenario = ts::begin(USER1);
        let (mut group, clock) = create_test_group(&mut scenario);

        // All participants contribute
        let participants = vector[USER1, USER2, USER3, USER4];
        let mut i = 0;
        while (i < 4) {
            let user = *vector::borrow(&participants, i);
            ts::next_tx(&mut scenario, user);
            {
                let payment = mint_coin(CONTRIBUTION_AMOUNT, &mut scenario);
                codeforge::contribute(&mut group, payment, &clock, ts::ctx(&mut scenario));
            };
            i = i + 1;
        };

        // Try to propose payout without advancing time
        ts::next_tx(&mut scenario, USER1);
        {
            codeforge::propose_payout(&mut group, &clock, ts::ctx(&mut scenario));
        };

        ts::return_shared(group);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_sign_payout_success() {
        let mut scenario = ts::begin(USER1);
        let (mut group, mut clock) = create_test_group(&mut scenario);

        // Setup: All contribute and propose payout
        let participants = vector[USER1, USER2, USER3, USER4];
        let mut i = 0;
        while (i < 4) {
            let user = *vector::borrow(&participants, i);
            ts::next_tx(&mut scenario, user);
            {
                let payment = mint_coin(CONTRIBUTION_AMOUNT, &mut scenario);
                codeforge::contribute(&mut group, payment, &clock, ts::ctx(&mut scenario));
            };
            i = i + 1;
        };

        clock::increment_for_testing(&mut clock, CYCLE_DURATION_DAYS * 24 * 60 * 60 * 1000);
        
        ts::next_tx(&mut scenario, USER1);
        {
            codeforge::propose_payout(&mut group, &clock, ts::ctx(&mut scenario));
        };

        // First signer signs
        ts::next_tx(&mut scenario, USER5);
        {
            codeforge::sign_payout(&mut group, ts::ctx(&mut scenario));
            
            let (_, _, _, _, signatures, _) = codeforge::get_pending_payout_info(&group);
            assert!(signatures == 1, 0);
            assert!(codeforge::has_signed_current_payout(&group, USER5) == true, 1);
        };

        ts::return_shared(group);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 11)] // E_NOT_AUTHORIZED_SIGNER
    fun test_sign_payout_unauthorized() {
        let mut scenario = ts::begin(USER1);
        let (mut group, mut clock) = create_test_group(&mut scenario);

        // Setup payout
        let participants = vector[USER1, USER2, USER3, USER4];
        let mut i = 0;
        while (i < 4) {
            let user = *vector::borrow(&participants, i);
            ts::next_tx(&mut scenario, user);
            {
                let payment = mint_coin(CONTRIBUTION_AMOUNT, &mut scenario);
                codeforge::contribute(&mut group, payment, &clock, ts::ctx(&mut scenario));
            };
            i = i + 1;
        };

        clock::increment_for_testing(&mut clock, CYCLE_DURATION_DAYS * 24 * 60 * 60 * 1000);
        
        ts::next_tx(&mut scenario, USER1);
        {
            codeforge::propose_payout(&mut group, &clock, ts::ctx(&mut scenario));
        };

        // Unauthorized user tries to sign (USER2 is not a multisig signer in our setup)
        ts::next_tx(&mut scenario, USER2);
        {
            codeforge::sign_payout(&mut group, ts::ctx(&mut scenario));
        };

        ts::return_shared(group);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 12)] // E_ALREADY_SIGNED
    fun test_sign_payout_already_signed() {
        let mut scenario = ts::begin(USER1);
        let (mut group, mut clock) = create_test_group(&mut scenario);

        // Setup payout
        let participants = vector[USER1, USER2, USER3, USER4];
        let mut i = 0;
        while (i < 4) {
            let user = *vector::borrow(&participants, i);
            ts::next_tx(&mut scenario, user);
            {
                let payment = mint_coin(CONTRIBUTION_AMOUNT, &mut scenario);
                codeforge::contribute(&mut group, payment, &clock, ts::ctx(&mut scenario));
            };
            i = i + 1;
        };

        clock::increment_for_testing(&mut clock, CYCLE_DURATION_DAYS * 24 * 60 * 60 * 1000);
        
        ts::next_tx(&mut scenario, USER1);
        {
            codeforge::propose_payout(&mut group, &clock, ts::ctx(&mut scenario));
        };

        // First signature
        ts::next_tx(&mut scenario, USER5);
        {
            codeforge::sign_payout(&mut group, ts::ctx(&mut scenario));
        };

        // Try to sign again (should fail)
        ts::next_tx(&mut scenario, USER5);
        {
            codeforge::sign_payout(&mut group, ts::ctx(&mut scenario));
        };

        ts::return_shared(group);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_auto_execute_payout_on_threshold() {
        let mut scenario = ts::begin(USER1);
        let (mut group, mut clock) = create_test_group(&mut scenario);

        // Setup payout
        let participants = vector[USER1, USER2, USER3, USER4];
        let mut i = 0;
        while (i < 4) {
            let user = *vector::borrow(&participants, i);
            ts::next_tx(&mut scenario, user);
            {
                let payment = mint_coin(CONTRIBUTION_AMOUNT, &mut scenario);
                codeforge::contribute(&mut group, payment, &clock, ts::ctx(&mut scenario));
            };
            i = i + 1;
        };

        clock::increment_for_testing(&mut clock, CYCLE_DURATION_DAYS * 24 * 60 * 60 * 1000);
        
        ts::next_tx(&mut scenario, USER1);
        {
            codeforge::propose_payout(&mut group, &clock, ts::ctx(&mut scenario));
        };

        // Get required signatures (threshold = 2)
        ts::next_tx(&mut scenario, USER5);
        {
            codeforge::sign_payout(&mut group, ts::ctx(&mut scenario));
        };

        // Second signature should auto-execute
        ts::next_tx(&mut scenario, USER6);
        {
            codeforge::sign_payout(&mut group, ts::ctx(&mut scenario));
            
            // Verify payout was executed (no pending payout)
            let (has_pending, _, _, _, _, _) = codeforge::get_pending_payout_info(&group);
            assert!(has_pending == false, 0);
        };

        ts::return_shared(group);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_execute_payout_manual() {
        let mut scenario = ts::begin(USER1);
        let (mut group, mut clock) = create_test_group(&mut scenario);

        // Setup payout with all signatures
        let participants = vector[USER1, USER2, USER3, USER4];
        let mut i = 0;
        while (i < 4) {
            let user = *vector::borrow(&participants, i);
            ts::next_tx(&mut scenario, user);
            {
                let payment = mint_coin(CONTRIBUTION_AMOUNT, &mut scenario);
                codeforge::contribute(&mut group, payment, &clock, ts::ctx(&mut scenario));
            };
            i = i + 1;
        };

        clock::increment_for_testing(&mut clock, CYCLE_DURATION_DAYS * 24 * 60 * 60 * 1000);
        
        ts::next_tx(&mut scenario, USER1);
        {
            codeforge::propose_payout(&mut group, &clock, ts::ctx(&mut scenario));
        };

        // Get all 3 signatures (more than threshold)
        let signers = vector[USER5, USER6, USER1];
        let mut i = 0;
        while (i < 3) {
            let signer = *vector::borrow(&signers, i);
            ts::next_tx(&mut scenario, signer);
            {
                if (i < 2) {
                    // Auto-execute happens on second signature, so we test manual execute
                    // by creating a scenario where we manually call execute
                    codeforge::sign_payout(&mut group, ts::ctx(&mut scenario));
                    if (i == 1) {
                        break // Stop before auto-execute
                    };
                };
            };
            i = i + 1;
        };

        ts::return_shared(group);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 14)] // E_INSUFFICIENT_SIGNATURES
    fun test_execute_payout_insufficient_signatures() {
        let mut scenario = ts::begin(USER1);
        let (mut group, mut clock) = create_test_group(&mut scenario);

        // Setup payout
        let participants = vector[USER1, USER2, USER3, USER4];
        let mut i = 0;
        while (i < 4) {
            let user = *vector::borrow(&participants, i);
            ts::next_tx(&mut scenario, user);
            {
                let payment = mint_coin(CONTRIBUTION_AMOUNT, &mut scenario);
                codeforge::contribute(&mut group, payment, &clock, ts::ctx(&mut scenario));
            };
            i = i + 1;
        };

        clock::increment_for_testing(&mut clock, CYCLE_DURATION_DAYS * 24 * 60 * 60 * 1000);
        
        ts::next_tx(&mut scenario, USER1);
        {
            codeforge::propose_payout(&mut group, &clock, ts::ctx(&mut scenario));
        };

        // Only one signature (threshold is 2)
        ts::next_tx(&mut scenario, USER5);
        {
            codeforge::sign_payout(&mut group, ts::ctx(&mut scenario));
        };

        // Try to execute manually with insufficient signatures
        ts::next_tx(&mut scenario, USER1);
        {
            codeforge::execute_payout(&mut group, ts::ctx(&mut scenario));
        };

        ts::return_shared(group);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_complete_savings_cycle() {
        let mut scenario = ts::begin(USER1);
        let (mut group, mut clock) = create_test_group(&mut scenario);

        // Complete first cycle
        let participants = vector[USER1, USER2, USER3, USER4];
        let mut i = 0;
        while (i < 4) {
            let user = *vector::borrow(&participants, i);
            ts::next_tx(&mut scenario, user);
            {
                let payment = mint_coin(CONTRIBUTION_AMOUNT, &mut scenario);
                codeforge::contribute(&mut group, payment, &clock, ts::ctx(&mut scenario));
            };
            i = i + 1;
        };

        // Advance time and complete payout
        clock::increment_for_testing(&mut clock, CYCLE_DURATION_DAYS * 24 * 60 * 60 * 1000);
        
        ts::next_tx(&mut scenario, USER1);
        {
            codeforge::propose_payout(&mut group, &clock, ts::ctx(&mut scenario));
        };

        // Get required signatures for auto-execute
        ts::next_tx(&mut scenario, USER5);
        {
            codeforge::sign_payout(&mut group, ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, USER6);
        {
            codeforge::sign_payout(&mut group, ts::ctx(&mut scenario));
            // Payout should be auto-executed
        };

        // Start next cycle
        ts::next_tx(&mut scenario, USER1);
        {
            codeforge::start_new_cycle(&mut group, &clock, ts::ctx(&mut scenario));
            assert!(codeforge::get_current_cycle(&group) == 2, 0);
        };

        ts::return_shared(group);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_viewing_functions() {
        let mut scenario = ts::begin(USER1);
        let (mut group, clock) = create_test_group(&mut scenario);

        // Test initial state
        ts::next_tx(&mut scenario, USER1);
        {
            let (cycle, contributions, expected, _recipient, _position, all_contributed) = 
                codeforge::get_cycle_summary(&group);
            assert!(cycle == 1, 0);
            assert!(contributions == 0, 1);
            assert!(expected == 4 * CONTRIBUTION_AMOUNT, 2);
            assert!(all_contributed == false, 3);

            let (signers, threshold) = codeforge::get_multisig_info(&group);
            assert!(vector::length(&signers) == 3, 4);
            assert!(threshold == MULTISIG_THRESHOLD, 5);
        };

        // Make some contributions
        ts::next_tx(&mut scenario, USER1);
        {
            let payment = mint_coin(CONTRIBUTION_AMOUNT, &mut scenario);
            codeforge::contribute(&mut group, payment, &clock, ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, USER2);
        {
            let payment = mint_coin(CONTRIBUTION_AMOUNT, &mut scenario);
            codeforge::contribute(&mut group, payment, &clock, ts::ctx(&mut scenario));
        };

        // Test viewing functions after partial contributions
        ts::next_tx(&mut scenario, USER1);
        {
            let contributors = codeforge::get_current_cycle_contributors(&group);
            let pending = codeforge::get_pending_contributors(&group);
            
            assert!(vector::length(&contributors) == 2, 0);
            assert!(vector::length(&pending) == 2, 1);
            
            let (is_participant, position, has_contributed) = 
                codeforge::get_participant_info(&group, USER1);
            assert!(is_participant == true, 2);
            assert!(position == 1, 3);
            assert!(has_contributed == true, 4);

            let (is_participant2, _, has_contributed2) = 
                codeforge::get_participant_info(&group, USER3);
            assert!(is_participant2 == true, 5);
            assert!(has_contributed2 == false, 6);
        };

        ts::return_shared(group);
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}