import React, { useState } from 'react';
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

// React Component
export default function SuiChainPage() {
  const [groupName, setGroupName] = useState('');
  const [cycleDuration, setCycleDuration] = useState(30);
  const [contributionAmount, setContributionAmount] = useState(1);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleAddParticipant = () => {
    setParticipants([...participants, { wallet: '', position: participants.length + 1 }]);
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleParticipantChange = (index: number, field: 'wallet' | 'position', value: string | number) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const handleCreateGroup = async () => {
    try {
      setLoading(true);
      setResult('Creating savings group...');
      
      // This is a demo - in a real app you'd get the keypair from wallet connection
      const keypair = Ed25519Keypair.fromSecretKey('suiprivkey1qpnd07g6rkkmusuurdk30vddzyw9ps7v2hh33tzp4ejz88ps258cckjkkd3');
      
      const groupId = await createSavingsGroupQuick(
        groupName,
        cycleDuration,
        Date.now(),
        contributionAmount,
        participants,
        keypair
      );
      
      setResult(`Success! Group created with ID: ${groupId}`);
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Sui Savings Group</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Group Name</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            placeholder="Enter group name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Cycle Duration (days)</label>
          <input
            type="number"
            value={cycleDuration}
            onChange={(e) => setCycleDuration(Number(e.target.value))}
            className="w-full border rounded-md px-3 py-2"
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Contribution Amount (SUI)</label>
          <input
            type="number"
            value={contributionAmount}
            onChange={(e) => setContributionAmount(Number(e.target.value))}
            className="w-full border rounded-md px-3 py-2"
            min="0.1"
            step="0.1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Participants</label>
          {participants.map((participant, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Wallet address"
                value={participant.wallet}
                onChange={(e) => handleParticipantChange(index, 'wallet', e.target.value)}
                className="flex-1 border rounded-md px-3 py-2"
              />
              <input
                type="number"
                placeholder="Position"
                value={participant.position}
                onChange={(e) => handleParticipantChange(index, 'position', Number(e.target.value))}
                className="w-20 border rounded-md px-3 py-2"
                min="1"
              />
              <button
                onClick={() => handleRemoveParticipant(index)}
                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={handleAddParticipant}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Add Participant
          </button>
        </div>

        <button
          onClick={handleCreateGroup}
          disabled={loading || !groupName || participants.length === 0}
          className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
        >
          {loading ? 'Creating...' : 'Create Savings Group'}
        </button>

        {result && (
          <div className={`p-4 rounded-md ${result.startsWith('Success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
