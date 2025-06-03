import React, { useState } from 'react';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';

import { Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519';


// Configuration
interface SavingsGroupConfig {
  packageId: string; // Your deployed package ID
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
}

// Participant interface
interface Participant {
  wallet: string;
  position: number;
}

// Multisig configuration interface
interface MultisigConfig {
  signers: string[]; // Array of signer addresses
  threshold: number; // Minimum signatures required
}

interface SavingsPayload {
  digest: string,
  groupId: string
}

// Savings Group creation parameters
interface CreateSavingsGroupParams {
  name: string;
  cycleDurationDays: number;
  startCycle: number;
  contributionAmount: number; // in MIST (1 SUI = 1,000,000,000 MIST)
  participants: Participant[];
  multisigConfig: MultisigConfig;
}

// Events interfaces
interface GroupCreatedEvent {
  group_id: string;
  name: string;
  participants_count: number;
  multisig_threshold: number;
}

interface ContributionMadeEvent {
  group_id: string;
  contributor: string;
  cycle: number;
  amount: number;
}

interface PayoutProposedEvent {
  group_id: string;
  recipient: string;
  cycle: number;
  amount: number;
  required_signatures: number;
}

interface PayoutSignedEvent {
  group_id: string;
  signer: string;
  cycle: number;
  current_signatures: number;
  required_signatures: number;
}

interface PayoutExecutedEvent {
  group_id: string;
  recipient: string;
  cycle: number;
  amount: number;
  final_signatures: number;
}

export class SuiSavingsGroupClient {
  private client: SuiClient;
  private packageId: string;

  constructor(config: SavingsGroupConfig) {
    this.client = new SuiClient({ url: getFullnodeUrl(config.network) });
    this.packageId = config.packageId;
  }

  /**
   * Create a new savings group with multisig support
   */
  async createSavingsGroup(
    params: CreateSavingsGroupParams,
    signerKeypair: Ed25519Keypair
  ): Promise<{ groupId: string; digest: string }> {
    try {
      // Validate participants
      if (params.participants.length === 0) {
        throw new Error('At least one participant is required');
      }

      // Check for duplicate positions
      const positions = params.participants.map(p => p.position);
      const uniquePositions = new Set(positions);
      if (positions.length !== uniquePositions.size) {
        throw new Error('Duplicate positions detected');
      }

      // Validate position range
      const maxPosition = params.participants.length;
      for (const participant of params.participants) {
        if (participant.position < 1 || participant.position > maxPosition) {
          throw new Error(`Position must be between 1 and ${maxPosition}`);
        }
      }

      // Validate multisig configuration
      if (params.multisigConfig.signers.length === 0) {
        throw new Error('At least one multisig signer is required');
      }

      if (params.multisigConfig.threshold <= 0 ||
        params.multisigConfig.threshold > params.multisigConfig.signers.length) {
        throw new Error('Invalid multisig threshold');
      }

      const tx = new Transaction();

      // Get current time from system clock
      const clockObjectId = '0x0000000000000000000000000000000000000000000000000000000000000006';

      // Prepare participant data
      const participantWallets = params.participants.map(p => Ed25519Keypair.fromSecretKey(p.wallet).getPublicKey().toSuiAddress());
      const participantPositions = params.participants.map(p => p.position);

      console.log('Participant wallets:', participantWallets);
      console.log('Participant positions:', participantPositions);
      console.log('Multisig signers:', params.multisigConfig.signers);
      console.log('Multisig threshold:', params.multisigConfig.threshold);

      // Call the create_savings_group function with all required arguments
      tx.moveCall({
        target: `${this.packageId}::codeforge::create_savings_group`,
        arguments: [
          tx.pure.string(params.name),
          tx.pure.u64(params.cycleDurationDays),
          tx.pure.u64(params.startCycle),
          tx.pure.u64(params.contributionAmount),
          tx.pure.vector('address', participantWallets),
          tx.pure.vector('u8', participantPositions),
          tx.pure.vector('address', params.multisigConfig.signers),
          tx.pure.u64(params.multisigConfig.threshold),
          tx.object(clockObjectId),
        ],
      });

      // Set gas budget for faster execution
      tx.setGasBudget(10000000); // 0.01 SUI

      // Execute transaction
      const result = await this.client.signAndExecuteTransaction({
        signer: signerKeypair,
        transaction: tx,
        options: {
          showEvents: true,
          showEffects: true,
          showObjectChanges: true,
        },
        requestType: 'WaitForLocalExecution',
      });

      console.log('Transaction result:', result);

      // Extract the group ID from created objects
      if (result.objectChanges) {
        const createdObject = result.objectChanges.find(
          (change: any) => change.type === 'created' && change.objectType?.includes('SavingsGroup')
        );

        if (createdObject && 'objectId' in createdObject) {
          return {
            groupId: createdObject.objectId,
            digest: result.digest
          };
        }
      }

      // Fallback: Extract from events
      const groupCreatedEvent = result.events?.find(
        (event: { type: string }) => event.type.includes('GroupCreated')
      );

      if (groupCreatedEvent && groupCreatedEvent.parsedJson) {
        const eventData = groupCreatedEvent.parsedJson as GroupCreatedEvent;
        return {
          groupId: eventData.group_id,
          digest: result.digest
        };
      }

      throw new Error('Failed to get group ID from transaction result');
    } catch (error) {
      console.error('Error creating savings group:', error);

      // Convert gas error to user-friendly message
      if (error instanceof Error) {
        if (error.message.includes('No valid gas coins found') ||
          error.message.includes('insufficient gas') ||
          error.message.includes('Insufficient SUI balance')) {
          throw new Error('Insufficient SUI balance for gas fees. Please add SUI to your wallet.');
        }
      }

      throw error;
    }
  }

  /**
   * Contribute to a savings group
   */
  async contribute(
    groupId: string,
    contributionAmount: number,
    wallet_address: string
  ): Promise<string> {
    try {

      const signerKeypair = Ed25519Keypair.fromSecretKey(wallet_address);

      const tx = new Transaction();

      let _contributionAmount = contributionAmount * 1_000_000_000

      // Get SUI coins for payment
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(_contributionAmount)]);

      // Get clock object
      const clockObjectId = '0x0000000000000000000000000000000000000000000000000000000000000006';

      // Call contribute function
      tx.moveCall({
        target: `${this.packageId}::codeforge::contribute`,
        arguments: [
          tx.object(groupId),
          coin,
          tx.object(clockObjectId),
        ],
      });

      // Execute transaction
      const result = await this.client.signAndExecuteTransaction({
        signer: signerKeypair,
        transaction: tx,
        options: {
          showEvents: true,
          showEffects: true,
        },
      });

      console.log('Contribution transaction result:', result);
      return result.digest;
    } catch (error) {
      console.error('Error making contribution:', error);

      // Convert gas error to user-friendly message
      if (error instanceof Error) {
        if (error.message.includes('No valid gas coins found') ||
          error.message.includes('insufficient gas') ||
          error.message.includes('Insufficient SUI balance')) {
          throw new Error('Insufficient SUI balance for gas fees. Please add SUI to your wallet.');
        }
      }

      throw error;
    }
  }

  /**
   * Start a new cycle
   */
  async startNewCycle(
    groupId: string,
    wallet_address: string,
  ): Promise<string> {
    try {

      const signerKeypair = Ed25519Keypair.fromSecretKey(wallet_address);
      const tx = new Transaction();

      // Get clock object
      const clockObjectId = '0x0000000000000000000000000000000000000000000000000000000000000006';

      // Call start_new_cycle function
      tx.moveCall({
        target: `${this.packageId}::codeforge::start_new_cycle`,
        arguments: [
          tx.object(groupId),
          tx.object(clockObjectId),
        ],
      });

      // Execute transaction
      const result = await this.client.signAndExecuteTransaction({
        signer: signerKeypair,
        transaction: tx,
        options: {
          showEvents: true,
          showEffects: true,
        },
      });

      console.log('Start new cycle transaction result:', result);
      return result.digest;
    } catch (error) {
      console.error('Error starting new cycle:', error);

      // Convert gas error to user-friendly message
      if (error instanceof Error) {
        if (error.message.includes('No valid gas coins found') ||
          error.message.includes('insufficient gas') ||
          error.message.includes('Insufficient SUI balance')) {
          throw new Error('Insufficient SUI balance for gas fees. Please add SUI to your wallet.');
        }
      }

      throw error;
    }
  }

  /**
   * Propose payout for current cycle
   */
  async proposePayout(
    groupId: string,
    signerKeypair: Ed25519Keypair
  ): Promise<string> {
    try {
      const tx = new Transaction();

      // Get clock object
      const clockObjectId = '0x0000000000000000000000000000000000000000000000000000000000000006';

      // Call propose_payout function
      tx.moveCall({
        target: `${this.packageId}::codeforge::propose_payout`,
        arguments: [
          tx.object(groupId),
          tx.object(clockObjectId),
        ],
      });

      // Execute transaction
      const result = await this.client.signAndExecuteTransaction({
        signer: signerKeypair,
        transaction: tx,
        options: {
          showEvents: true,
          showEffects: true,
        },
      });

      console.log('Propose payout transaction result:', result);
      return result.digest;
    } catch (error) {
      console.error('Error proposing payout:', error);

      // Convert gas error to user-friendly message
      if (error instanceof Error) {
        if (error.message.includes('No valid gas coins found') ||
          error.message.includes('insufficient gas') ||
          error.message.includes('Insufficient SUI balance')) {
          throw new Error('Insufficient SUI balance for gas fees. Please add SUI to your wallet.');
        }
      }

      throw error;
    }
  }

  /**
   * Sign a pending payout
   */
  async signPayout(
    groupId: string,
    signerKeypair: Ed25519Keypair
  ): Promise<string> {
    try {
      const tx = new Transaction();

      // Call sign_payout function
      tx.moveCall({
        target: `${this.packageId}::codeforge::sign_payout`,
        arguments: [
          tx.object(groupId),
        ],
      });

      // Execute transaction
      const result = await this.client.signAndExecuteTransaction({
        signer: signerKeypair,
        transaction: tx,
        options: {
          showEvents: true,
          showEffects: true,
        },
      });

      console.log('Sign payout transaction result:', result);
      return result.digest;
    } catch (error) {
      console.error('Error signing payout:', error);

      // Convert gas error to user-friendly message
      if (error instanceof Error) {
        if (error.message.includes('No valid gas coins found') ||
          error.message.includes('insufficient gas') ||
          error.message.includes('Insufficient SUI balance')) {
          throw new Error('Insufficient SUI balance for gas fees. Please add SUI to your wallet.');
        }
      }

      throw error;
    }
  }

  /**
   * Execute payout (if threshold is reached)
   */
  async executePayout(
    groupId: string,
    signerKeypair: Ed25519Keypair
  ): Promise<string> {
    try {
      const tx = new Transaction();

      // Call execute_payout function
      tx.moveCall({
        target: `${this.packageId}::codeforge::execute_payout`,
        arguments: [
          tx.object(groupId),
        ],
      });

      // Execute transaction
      const result = await this.client.signAndExecuteTransaction({
        signer: signerKeypair,
        transaction: tx,
        options: {
          showEvents: true,
          showEffects: true,
        },
      });

      console.log('Execute payout transaction result:', result);
      return result.digest;
    } catch (error) {
      console.error('Error executing payout:', error);

      // Convert gas error to user-friendly message
      if (error instanceof Error) {
        if (error.message.includes('No valid gas coins found') ||
          error.message.includes('insufficient gas') ||
          error.message.includes('Insufficient SUI balance')) {
          throw new Error('Insufficient SUI balance for gas fees. Please add SUI to your wallet.');
        }
      }

      throw error;
    }
  }
}

// Default configuration
const DEFAULT_CONFIG: SavingsGroupConfig = {
  packageId: process.env.NEXT_PUBLIC_MOVE_PACKAGE_ID || '',
  network: 'testnet'
};

// Helper function to get client with default config
export function getDefaultSuiClient(): SuiSavingsGroupClient {
  return new SuiSavingsGroupClient(DEFAULT_CONFIG);
}

// Helper function to create client with custom config
export function createSuiClient(
  packageId?: string,
  network?: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
): SuiSavingsGroupClient {
  const config: SavingsGroupConfig = {
    packageId: packageId || DEFAULT_CONFIG.packageId,
    network: network || DEFAULT_CONFIG.network
  };

  return new SuiSavingsGroupClient(config);
}

// Updated helper function to include multisig configuration
// Updated helper function that creates multisig configuration automatically
export async function createSavingsGroupQuick(
  name: string,
  cycleDurationDays: number,
  startCycle: number,
  contributionAmountSui: number,
  participants: Participant[],
  wallet_address: string,
  network?: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  packageId?: string,
  multisigThreshold?: number // Optional: custom threshold, defaults to majority
): Promise<SavingsPayload> {
  const client = createSuiClient(packageId, network);
  const contributionAmount = contributionAmountSui * 1_000_000_000;

  // Create multisig configuration using participants' wallet addresses
  const multisigConfig: MultisigConfig = createSimpleMultisig(participants, multisigThreshold);

  const signerKeypair = Ed25519Keypair.fromSecretKey(wallet_address);

  return await client.createSavingsGroup({
    name,
    cycleDurationDays,
    startCycle,
    contributionAmount,
    participants,
    multisigConfig // Now created automatically within the function
  }, signerKeypair);
}

// Alternative version with more control over multisig configuration
export async function createSavingsGroupWithCustomMultisig(
  name: string,
  cycleDurationDays: number,
  startCycle: number,
  contributionAmountSui: number,
  participants: Participant[],
  wallet_address: string,
  multisigType: 'all_participants' | 'majority' | 'admin_only' | 'custom',
  customSigners?: string[], // Required if multisigType is 'custom' or 'admin_only'
  customThreshold?: number,
  network?: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  packageId?: string
): Promise<SavingsPayload> {
  const client = createSuiClient(packageId, network);
  const contributionAmount = contributionAmountSui * 1_000_000_000;

  let multisigConfig: MultisigConfig;

  switch (multisigType) {
    case 'all_participants':
      // All participants as signers, all must sign (unanimous)
      multisigConfig = {
        signers: participants.map(p => p.wallet),
        threshold: participants.length
      };
      break;

    case 'majority':
      // All participants as signers, majority threshold
      multisigConfig = createSimpleMultisig(participants, customThreshold);
      break;

    case 'admin_only':
      // Only specified admin addresses as signers
      if (!customSigners || customSigners.length === 0) {
        throw new Error('Admin addresses must be provided for admin_only multisig type');
      }
      multisigConfig = createAdminMultisig(customSigners, customThreshold);
      break;

    case 'custom':
      // Custom signers and threshold
      if (!customSigners || customSigners.length === 0) {
        throw new Error('Custom signers must be provided for custom multisig type');
      }
      multisigConfig = {
        signers: customSigners,
        threshold: customThreshold || Math.ceil(customSigners.length / 2)
      };
      break;

    default:
      throw new Error('Invalid multisig type');
  }

  const signerKeypair = Ed25519Keypair.fromSecretKey(wallet_address);

  return await client.createSavingsGroup({
    name,
    cycleDurationDays,
    startCycle,
    contributionAmount,
    participants,
    multisigConfig
  }, signerKeypair);
}

// Even simpler version for basic use cases
export async function createBasicSavingsGroup(
  name: string,
  cycleDurationDays: number,
  startCycle: number,
  contributionAmountSui: number,
  participantWallets: string[], // Just wallet addresses
  wallet_address: string,
  network?: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  packageId?: string
): Promise<SavingsPayload> {
  // Convert wallet addresses to participants with sequential positions
  const participants: Participant[] = participantWallets.map((wallet, index) => ({
    wallet,
    position: index + 1
  }));

  // Use the updated createSavingsGroupQuick function
  return await createSavingsGroupQuick(
    name,
    cycleDurationDays,
    startCycle,
    contributionAmountSui,
    participants,
    wallet_address,
    network,
    packageId
  );
}

// Helper function to create a simple multisig config (all participants as signers)
export function createSimpleMultisig(
  participants: Participant[],
  threshold?: number
): MultisigConfig {
  console.log(participants);
  const signers = participants.map(p => Ed25519Keypair.fromSecretKey(p.wallet).getPublicKey().toSuiAddress());
  const defaultThreshold = Math.ceil(participants.length / 2); // Majority

  return {
    signers,
    threshold: threshold || defaultThreshold
  };
}

// Helper function to create admin-only multisig
export function createAdminMultisig(
  adminAddresses: string[],
  threshold?: number
): MultisigConfig {
  return {
    signers: adminAddresses,
    threshold: threshold || 1
  };
}


/**
 * Get the current SUI coin balance for a given address
 * @param {string} address - The Sui address to check balance for
 * @param {string} network - Network to connect to ('mainnet', 'testnet', or 'devnet')
 * @returns {Promise<{balance: string, balanceInSui: number}>} - Balance in MIST and SUI
 */async function getSuiBalance(address: string, network: 'testnet' | 'mainnet' | 'devnet' = 'testnet') {
  try {
    // Validate address format
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid address provided');
    }

    // Validate network parameter
    const validNetworks = ['testnet', 'mainnet', 'devnet'];
    if (!validNetworks.includes(network)) {
      throw new Error(`Invalid network. Must be one of: ${validNetworks.join(', ')}`);
    }

    // Create client connection
    const rpcUrl = getFullnodeUrl(network);
    const client = new SuiClient({ url: rpcUrl });

    // Get balance - SUI coin type is '0x2::sui::SUI'
    const balance = await client.getBalance({
      owner: Ed25519Keypair.fromSecretKey(address).getPublicKey().toSuiAddress(), // Use the address directly, not derive from keypair
      coinType: '0x2::sui::SUI'
    });

    // Convert from MIST to SUI (1 SUI = 1,000,000,000 MIST)
    const balanceInSui = parseInt(balance.totalBalance) / 1_000_000_000;

    return {
      balance: balance.totalBalance, // Raw balance in MIST
      balanceInSui: balanceInSui,   // Converted balance in SUI
      coinObjectCount: balance.coinObjectCount
    };

  } catch (error: any) {
    console.error('Error fetching SUI balance:', error);
    throw new Error(`Failed to fetch balance: ${error?.message || 'Unknown error'}`);
  }
}
// Example usage
async function example() {
  try {
    const address = "0x742d35Cc6dB7D4B2B8c8E4e4F8F4A0c4d7F6Bb8B1234"; // Example address

    // Get just SUI balance
    const suiBalance = await getSuiBalance(address, 'mainnet');
    console.log(`SUI Balance: ${suiBalance.balanceInSui} SUI`);
    console.log(`Raw Balance: ${suiBalance.balance} MIST`);


  } catch (error) {
    console.error('Example error:', error);
  }
}

export { getSuiBalance };