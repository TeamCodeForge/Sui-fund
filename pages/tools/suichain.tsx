import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';

import {Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519';

 



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

// Savings Group creation parameters
interface CreateSavingsGroupParams {
  name: string;
  cycleDurationDays: number;
  startCycle: number;
  contributionAmount: number; // in MIST (1 SUI = 1,000,000,000 MIST)
  participants: Participant[];
}

// Events interfaces
interface GroupCreatedEvent {
  group_id: string;
  name: string;
  participants_count: number;
}

interface ContributionMadeEvent {
  group_id: string;
  contributor: string;
  cycle: number;
  amount: number;
}

interface PayoutMadeEvent {
  group_id: string;
  recipient: string;
  cycle: number;
  amount: number;
}

export class SuiSavingsGroupClient {
  private client: SuiClient;
  private packageId: string;

  constructor(config: SavingsGroupConfig) {
    this.client = new SuiClient({ url: getFullnodeUrl(config.network) });
    this.packageId = config.packageId;
  }

  /**
   * Create a new savings group
   */
  async createSavingsGroup(
    params: CreateSavingsGroupParams,
    signerKeypair: Ed25519Keypair
  ): Promise<string> {
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

      const tx = new Transaction();

      // Get current time from system clock
      const clockObjectId = '0x0000000000000000000000000000000000000000000000000000000000000006';

      // Prepare participant data - fix the arrays and validate addresses
      const participantWallets = params.participants.map(p => {
        // Ensure wallet address is properly formatted
        let wallet =  Ed25519Keypair.fromSecretKey('suiprivkey1qpnd07g6rkkmusuurdk30vddzyw9ps7v2hh33tzp4ejz88ps258cckjkkd3')

       let address = wallet .toSuiAddress()
        console.log(address);
       

        
        const keypair = Ed25519Keypair.fromSecretKey('suiprivkey1qpnd07g6rkkmusuurdk30vddzyw9ps7v2hh33tzp4ejz88ps258cckjkkd3');
        return keypair.getPublicKey().toSuiAddress();
      });
      
      const participantPositions = params.participants.map(p => p.position);

      console.log('Formatted wallets:', participantWallets);
      console.log(params);
      let _keypair = Ed25519Keypair.fromSecretKey('suiprivkey1qpnd07g6rkkmusuurdk30vddzyw9ps7v2hh33tzp4ejz88ps258cckjkkd3');
        

      // Call the create_savings_group function with corrected arguments
      tx.moveCall({
        target: `${this.packageId}::codeforge::create_savings_group`,
        arguments: [
          tx.pure.string(params.name),
          tx.pure.u64(params.cycleDurationDays),
          tx.pure.u64(params.startCycle),
          tx.pure.u64(params.contributionAmount),
          tx.pure.vector('address', participantWallets),
          tx.pure.vector('u8', participantPositions),
          tx.object(clockObjectId),
        ],
      });

      // Set gas budget for faster execution
      tx.setGasBudget(10000000); // 0.01 SUI

      // Execute transaction
      const result = await this.client.signAndExecuteTransaction({
        signer: _keypair,
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
          return createdObject.objectId;
        }
      }

      // Fallback: Extract from events
      const groupCreatedEvent = result.events?.find(
        (event: { type: string }) => event.type.includes('GroupCreated')
      );

      if (groupCreatedEvent && groupCreatedEvent.parsedJson) {
        const eventData = groupCreatedEvent.parsedJson as GroupCreatedEvent;
        return eventData.group_id;
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
    signerKeypair: Ed25519Keypair
  ): Promise<string> {
    try {
      const tx = new Transaction();

      // Get SUI coins for payment
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(contributionAmount)]);

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
    signerKeypair: Ed25519Keypair
  ): Promise<string> {
    try {
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
   * Process payout for current cycle
   */
  async processPayout(
    groupId: string,
    signerKeypair: Ed25519Keypair
  ): Promise<string> {
    try {
      const tx = new Transaction();

      // Get clock object
      const clockObjectId = '0x0000000000000000000000000000000000000000000000000000000000000006';

      // Call process_payout function
      tx.moveCall({
        target: `${this.packageId}::codeforge::process_payout`,
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

      console.log('Process payout transaction result:', result);
      return result.digest;
    } catch (error) {
      console.error('Error processing payout:', error);
      
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
   * Get group information
   */
 
}

// Default configuration
const DEFAULT_CONFIG: SavingsGroupConfig = {
  packageId: '0x35ef12fc19048b8d2500dfb720d1cddc6a3352e7ff231136a5dd75ec8ff1f7f9',
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

// Updated helper function to use default config
export async function createSavingsGroupQuick(
  name: string,
  cycleDurationDays: number,
  startCycle: number,
  contributionAmountSui: number,
  participants: Participant[],
  signerKeypair: Ed25519Keypair,
  network?: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
  packageId?: string
): Promise<string> {
  const client = createSuiClient(packageId, network);
  const contributionAmount = contributionAmountSui * 1_000_000_000;

  return await client.createSavingsGroup({
    name,
    cycleDurationDays,
    startCycle,
    contributionAmount,
    participants
  }, signerKeypair);
}