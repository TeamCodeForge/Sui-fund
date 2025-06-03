import { SuiClient, SuiObjectResponse, SuiEvent } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';

// Types matching the smart contract structures
export interface Participant {
  wallet: string;
  position: number;
  has_contributed_current_cycle: boolean;
}

export interface MultisigConfig {
  signers: string[];
  threshold: number;
}

export interface PendingPayout {
  recipient: string;
  amount: string;
  cycle: number;
  signatures: string[];
  executed: boolean;
  created_at: number;
}

export interface SavingsGroup {
  id: string;
  name: string;
  cycle_duration_days: number;
  start_cycle: number;
  contribution_amount: string;
  participants: Participant[];
  savings_balance: string;
  current_cycle: number;
  cycle_start_time: number;
  is_active: boolean;
  total_cycles_completed: number;
  multisig_config: MultisigConfig;
  pending_payout?: PendingPayout;
}

export interface GroupInfo {
  name: string;
  cycle_duration_days: number;
  contribution_amount: string;
  current_cycle: number;
  savings_balance: string;
  is_active: boolean;
}

export interface PendingPayoutInfo {
  exists: boolean;
  recipient: string;
  amount: string;
  cycle: number;
  current_signatures: number;
  required_signatures: number;
}

export interface ContributionStatus {
  total_contributed: string;
  total_expected: string;
  contributors: string[];
  pending_contributors: string[];
}

export interface CycleSummary {
  cycle_number: number;
  contributions_received: string;
  total_expected: string;
  next_recipient_address: string;
  next_recipient_position: number;
  all_contributed: boolean;
}

export interface ParticipantInfo {
  is_participant: boolean;
  position: number;
  has_contributed_current_cycle: boolean;
}

// Event types
export interface GroupCreatedEvent {
  group_id: string;
  name: string;
  participants_count: number;
  multisig_threshold: number;
}

export interface ContributionMadeEvent {
  group_id: string;
  contributor: string;
  cycle: number;
  amount: string;
}

export interface PayoutProposedEvent {
  group_id: string;
  recipient: string;
  cycle: number;
  amount: string;
  required_signatures: number;
}

export interface PayoutSignedEvent {
  group_id: string;
  signer: string;
  cycle: number;
  current_signatures: number;
  required_signatures: number;
}

export interface PayoutExecutedEvent {
  group_id: string;
  recipient: string;
  cycle: number;
  amount: string;
  final_signatures: number;
}

export interface CycleCompletedEvent {
  group_id: string;
  cycle: number;
  next_recipient_position: number;
}

export class SavingsGroupClient {
  private client: SuiClient;
  private packageId: string;

  constructor(client: SuiClient, packageId: string) {
    this.client = client;
    this.packageId = packageId;
  }

  // View Functions - Read contract state

  /**
   * Get basic group information
   */
  async getGroupInfo(groupId: string): Promise<GroupInfo> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.packageId}::codeforge::get_group_info`,
      arguments: [tx.object(groupId)],
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    const returnValues = result.results?.[0]?.returnValues;
    if (!returnValues) throw new Error('Failed to get group info');

    return {
      name: this.parseString(returnValues[0]),
      cycle_duration_days: parseInt(this.parseU64(returnValues[1])),
      contribution_amount: this.parseU64(returnValues[2]),
      current_cycle: parseInt(this.parseU64(returnValues[3])),
      savings_balance: this.parseU64(returnValues[4]),
      is_active: this.parseBool(returnValues[5]),
    };
  }

  /**
   * Get multisig configuration
   */
  async getMultisigInfo(groupId: string): Promise<MultisigConfig> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.packageId}::codeforge::get_multisig_info`,
      arguments: [tx.object(groupId)],
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    const returnValues = result.results?.[0]?.returnValues;
    if (!returnValues) throw new Error('Failed to get multisig info');

    return {
      signers: this.parseAddressVector(returnValues[0]),
      threshold: parseInt(this.parseU64(returnValues[1])),
    };
  }

  /**
   * Get pending payout information
   */
  async getPendingPayoutInfo(groupId: string): Promise<PendingPayoutInfo> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.packageId}::codeforge::get_pending_payout_info`,
      arguments: [tx.object(groupId)],
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    const returnValues = result.results?.[0]?.returnValues;
    if (!returnValues) throw new Error('Failed to get pending payout info');

    return {
      exists: this.parseBool(returnValues[0]),
      recipient: this.parseAddress(returnValues[1]),
      amount: this.parseU64(returnValues[2]),
      cycle: parseInt(this.parseU64(returnValues[3])),
      current_signatures: parseInt(this.parseU64(returnValues[4])),
      required_signatures: parseInt(this.parseU64(returnValues[5])),
    };
  }

  /**
   * Get current cycle contribution status
   */
  async getCurrentCycleContributions(groupId: string): Promise<{
    current_contributions: string;
    expected_total: string;
    contribution_count: number;
  }> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.packageId}::codeforge::get_current_cycle_contributions`,
      arguments: [tx.object(groupId)],
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    const returnValues = result.results?.[0]?.returnValues;
    if (!returnValues) throw new Error('Failed to get current cycle contributions');

    return {
      current_contributions: this.parseU64(returnValues[0]),
      expected_total: this.parseU64(returnValues[1]),
      contribution_count: parseInt(this.parseU64(returnValues[2])),
    };
  }

  /**
   * Get next payout recipient information
   */
  async getNextPayoutRecipient(groupId: string): Promise<{
    has_next_recipient: boolean;
    recipient_address: string;
    recipient_position: number;
  }> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.packageId}::codeforge::get_next_payout_recipient`,
      arguments: [tx.object(groupId)],
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    const returnValues = result.results?.[0]?.returnValues;
    if (!returnValues) throw new Error('Failed to get next payout recipient');

    return {
      has_next_recipient: this.parseBool(returnValues[0]),
      recipient_address: this.parseAddress(returnValues[1]),
      recipient_position: parseInt(this.parseU8(returnValues[2])),
    };
  }

  /**
   * Get list of contributors for current cycle
   */
  async getCurrentCycleContributors(groupId: string): Promise<string[]> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.packageId}::codeforge::get_current_cycle_contributors`,
      arguments: [tx.object(groupId)],
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    const returnValues = result.results?.[0]?.returnValues;
    if (!returnValues) throw new Error('Failed to get current cycle contributors');

    return this.parseAddressVector(returnValues[0]);
  }

  /**
   * Get list of pending contributors for current cycle
   */
  async getPendingContributors(groupId: string): Promise<string[]> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.packageId}::codeforge::get_pending_contributors`,
      arguments: [tx.object(groupId)],
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    const returnValues = result.results?.[0]?.returnValues;
    if (!returnValues) throw new Error('Failed to get pending contributors');

    return this.parseAddressVector(returnValues[0]);
  }

  /**
   * Get detailed contribution status
   */
  async getContributionStatus(groupId: string): Promise<ContributionStatus> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.packageId}::codeforge::get_contribution_status`,
      arguments: [tx.object(groupId)],
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    const returnValues = result.results?.[0]?.returnValues;
    if (!returnValues) throw new Error('Failed to get contribution status');

    return {
      total_contributed: this.parseU64(returnValues[0]),
      total_expected: this.parseU64(returnValues[1]),
      contributors: this.parseAddressVector(returnValues[2]),
      pending_contributors: this.parseAddressVector(returnValues[3]),
    };
  }

  /**
   * Get comprehensive cycle summary
   */
  async getCycleSummary(groupId: string): Promise<CycleSummary> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.packageId}::codeforge::get_cycle_summary`,
      arguments: [tx.object(groupId)],
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    const returnValues = result.results?.[0]?.returnValues;
    if (!returnValues) throw new Error('Failed to get cycle summary');

    return {
      cycle_number: parseInt(this.parseU64(returnValues[0])),
      contributions_received: this.parseU64(returnValues[1]),
      total_expected: this.parseU64(returnValues[2]),
      next_recipient_address: this.parseAddress(returnValues[3]),
      next_recipient_position: parseInt(this.parseU8(returnValues[4])),
      all_contributed: this.parseBool(returnValues[5]),
    };
  }

  /**
   * Check if participant has contributed in current cycle
   */
  async hasParticipantContributed(groupId: string, participantAddress: string): Promise<boolean> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.packageId}::codeforge::has_participant_contributed`,
      arguments: [tx.object(groupId), tx.pure(participantAddress)],
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    const returnValues = result.results?.[0]?.returnValues;
    if (!returnValues) throw new Error('Failed to check participant contribution');

    return this.parseBool(returnValues[0]);
  }

  /**
   * Get participant information
   */
  async getParticipantInfo(groupId: string, participantAddress: string): Promise<ParticipantInfo> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.packageId}::codeforge::get_participant_info`,
      arguments: [tx.object(groupId), tx.pure(participantAddress)],
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    const returnValues = result.results?.[0]?.returnValues;
    if (!returnValues) throw new Error('Failed to get participant info');

    return {
      is_participant: this.parseBool(returnValues[0]),
      position: parseInt(this.parseU8(returnValues[1])),
      has_contributed_current_cycle: this.parseBool(returnValues[2]),
    };
  }

  /**
   * Check if user has signed current payout
   */
  async hasSignedCurrentPayout(groupId: string, signerAddress: string): Promise<boolean> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.packageId}::codeforge::has_signed_current_payout`,
      arguments: [tx.object(groupId), tx.pure(signerAddress)],
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    const returnValues = result.results?.[0]?.returnValues;
    if (!returnValues) throw new Error('Failed to check payout signature');

    return this.parseBool(returnValues[0]);
  }

  // Transaction Functions - Modify contract state

  /**
   * Create a new savings group
   */
  createSavingsGroupTransaction(
    name: string,
    cycleDurationDays: number,
    startCycle: number,
    contributionAmount: string,
    participantWallets: string[],
    participantPositions: number[],
    multisigSigners: string[],
    multisigThreshold: number,
    clockId: string
  ): TransactionBlock {
    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${this.packageId}::codeforge::create_savings_group`,
      arguments: [
        tx.pure(name),
        tx.pure(cycleDurationDays),
        tx.pure(startCycle),
        tx.pure(contributionAmount),
        tx.pure(participantWallets),
        tx.pure(participantPositions),
        tx.pure(multisigSigners),
        tx.pure(multisigThreshold),
        tx.object(clockId),
      ],
    });

    return tx;
  }

  /**
   * Start a new cycle
   */
  startNewCycleTransaction(groupId: string, clockId: string): TransactionBlock {
    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${this.packageId}::codeforge::start_new_cycle`,
      arguments: [
        tx.object(groupId),
        tx.object(clockId),
      ],
    });

    return tx;
  }

  /**
   * Make a contribution
   */
  contributeTransaction(groupId: string, coinId: string, clockId: string): TransactionBlock {
    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${this.packageId}::codeforge::contribute`,
      arguments: [
        tx.object(groupId),
        tx.object(coinId),
        tx.object(clockId),
      ],
    });

    return tx;
  }

  /**
   * Propose a payout
   */
  proposePayoutTransaction(groupId: string, clockId: string): TransactionBlock {
    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${this.packageId}::codeforge::propose_payout`,
      arguments: [
        tx.object(groupId),
        tx.object(clockId),
      ],
    });

    return tx;
  }

  /**
   * Sign a payout
   */
  signPayoutTransaction(groupId: string): TransactionBlock {
    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${this.packageId}::codeforge::sign_payout`,
      arguments: [tx.object(groupId)],
    });

    return tx;
  }

  /**
   * Execute a payout
   */
  executePayoutTransaction(groupId: string): TransactionBlock {
    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${this.packageId}::codeforge::execute_payout`,
      arguments: [tx.object(groupId)],
    });

    return tx;
  }

  // Event Querying Functions

  /**
   * Get group created events
   */
  async getGroupCreatedEvents(groupId?: string): Promise<GroupCreatedEvent[]> {
    const events = await this.client.queryEvents({
      query: {
        MoveEventType: `${this.packageId}::codeforge::GroupCreated`
      }
    });

    return events.data
      .filter(event => !groupId || (event.parsedJson as any).group_id === groupId)
      .map(event => event.parsedJson as GroupCreatedEvent);
  }

  /**
   * Get contribution made events
   */
  async getContributionMadeEvents(groupId?: string, contributor?: string): Promise<ContributionMadeEvent[]> {
    const events = await this.client.queryEvents({
      query: {
        MoveEventType: `${this.packageId}::codeforge::ContributionMade`
      }
    });

    return events.data
      .filter(event => {
        const data = event.parsedJson as any;
        return (!groupId || data.group_id === groupId) && 
               (!contributor || data.contributor === contributor);
      })
      .map(event => event.parsedJson as ContributionMadeEvent);
  }

  /**
   * Get payout proposed events
   */
  async getPayoutProposedEvents(groupId?: string): Promise<PayoutProposedEvent[]> {
    const events = await this.client.queryEvents({
      query: {
        MoveEventType: `${this.packageId}::codeforge::PayoutProposed`
      }
    });

    return events.data
      .filter(event => !groupId || (event.parsedJson as any).group_id === groupId)
      .map(event => event.parsedJson as PayoutProposedEvent);
  }

  /**
   * Get payout signed events
   */
  async getPayoutSignedEvents(groupId?: string, signer?: string): Promise<PayoutSignedEvent[]> {
    const events = await this.client.queryEvents({
      query: {
        MoveEventType: `${this.packageId}::codeforge::PayoutSigned`
      }
    });

    return events.data
      .filter(event => {
        const data = event.parsedJson as any;
        return (!groupId || data.group_id === groupId) && 
               (!signer || data.signer === signer);
      })
      .map(event => event.parsedJson as PayoutSignedEvent);
  }

  /**
   * Get payout executed events
   */
  async getPayoutExecutedEvents(groupId?: string, recipient?: string): Promise<PayoutExecutedEvent[]> {
    const events = await this.client.queryEvents({
      query: {
        MoveEventType: `${this.packageId}::codeforge::PayoutExecuted`
      }
    });

    return events.data
      .filter(event => {
        const data = event.parsedJson as any;
        return (!groupId || data.group_id === groupId) && 
               (!recipient || data.recipient === recipient);
      })
      .map(event => event.parsedJson as PayoutExecutedEvent);
  }

  /**
   * Get cycle completed events
   */
  async getCycleCompletedEvents(groupId?: string): Promise<CycleCompletedEvent[]> {
    const events = await this.client.queryEvents({
      query: {
        MoveEventType: `${this.packageId}::codeforge::CycleCompleted`
      }
    });

    return events.data
      .filter(event => !groupId || (event.parsedJson as any).group_id === groupId)
      .map(event => event.parsedJson as CycleCompletedEvent);
  }

  // Helper Functions for parsing return values

  private parseString(value: [number, string]): string {
    return new TextDecoder().decode(new Uint8Array(fromB64(value[1])));
  }

  private parseU64(value: [number, string]): string {
    const bytes = fromB64(value[1]);
    let result = 0n;
    for (let i = 0; i < 8; i++) {
      result += BigInt(bytes[i]) << (BigInt(i) * 8n);
    }
    return result.toString();
  }

  private parseU8(value: [number, string]): string {
    const bytes = fromB64(value[1]);
    return bytes[0].toString();
  }

  private parseBool(value: [number, string]): boolean {
    const bytes = fromB64(value[1]);
    return bytes[0] === 1;
  }

  private parseAddress(value: [number, string]): string {
    const bytes = fromB64(value[1]);
    return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private parseAddressVector(value: [number, string]): string[] {
    const bytes = fromB64(value[1]);
    const addresses: string[] = [];
    
    // First 4 bytes contain the length
    const length = new DataView(bytes.buffer).getUint32(0, true);
    
    // Each address is 32 bytes
    for (let i = 0; i < length; i++) {
      const start = 4 + (i * 32);
      const addressBytes = bytes.slice(start, start + 32);
      const address = '0x' + Array.from(addressBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      addresses.push(address);
    }
    
    return addresses;
  }
}

// Usage Example:
export async function createSavingsGroupClient(rpcUrl: string, packageId: string): Promise<SavingsGroupClient> {
  const client = new SuiClient({ url: rpcUrl });
  return new SavingsGroupClient(client, packageId);
}

// Convenience functions for common operations
export class SavingsGroupUtils {
  private client: SavingsGroupClient;

  constructor(client: SavingsGroupClient) {
    this.client = client;
  }

  /**
   * Get complete group dashboard data
   */
  async getGroupDashboard(groupId: string): Promise<{
    info: GroupInfo;
    multisig: MultisigConfig;
    cycleSummary: CycleSummary;
    pendingPayout: PendingPayoutInfo;
    contributionStatus: ContributionStatus;
  }> {
    const [info, multisig, cycleSummary, pendingPayout, contributionStatus] = await Promise.all([
      this.client.getGroupInfo(groupId),
      this.client.getMultisigInfo(groupId),
      this.client.getCycleSummary(groupId),
      this.client.getPendingPayoutInfo(groupId),
      this.client.getContributionStatus(groupId),
    ]);

    return {
      info,
      multisig,
      cycleSummary,
      pendingPayout,
      contributionStatus,
    };
  }

  /**
   * Check if user can perform specific actions
   */
  async getUserActions(groupId: string, userAddress: string): Promise<{
    canContribute: boolean;
    canSign: boolean;
    isParticipant: boolean;
    isSigner: boolean;
    hasContributed: boolean;
    hasSigned: boolean;
  }> {
    const [participantInfo, multisigInfo, hasContributed, hasSigned] = await Promise.all([
      this.client.getParticipantInfo(groupId, userAddress),
      this.client.getMultisigInfo(groupId),
      this.client.hasParticipantContributed(groupId, userAddress),
      this.client.hasSignedCurrentPayout(groupId, userAddress),
    ]);

    const isSigner = multisigInfo.signers.includes(userAddress);

    return {
      canContribute: participantInfo.is_participant && !hasContributed,
      canSign: isSigner && !hasSigned,
      isParticipant: participantInfo.is_participant,
      isSigner,
      hasContributed,
      hasSigned,
    };
  }

  /**
   * Get group activity history
   */
  async getGroupActivity(groupId: string): Promise<{
    contributions: ContributionMadeEvent[];
    payouts: PayoutExecutedEvent[];
    cycles: CycleCompletedEvent[];
  }> {
    const [contributions, payouts, cycles] = await Promise.all([
      this.client.getContributionMadeEvents(groupId),
      this.client.getPayoutExecutedEvents(groupId),
      this.client.getCycleCompletedEvents(groupId),
    ]);

    return {
      contributions: contributions.sort((a, b) => b.cycle - a.cycle),
      payouts: payouts.sort((a, b) => b.cycle - a.cycle),
      cycles: cycles.sort((a, b) => b.cycle - a.cycle),
    };
  }
}