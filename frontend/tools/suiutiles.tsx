import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

interface CycleSummary {
  currentCycle: number;
  contributionsReceived: number;
  totalExpected: number;
  nextRecipientAddress: string;
  nextRecipientPosition: number;
  allContributed: boolean;
}


interface ContributionSummary {
  currentContribution: number,
      expectedTotal: number,
      contributors: string[],
      pending: string[]
}



/**
 * Get comprehensive cycle summary of a savings group
 * @param groupObjectId - Object ID of the SavingsGroup
 * @returns Promise<CycleSummary> - Complete cycle summary of the savings group
 * 
 * 
 * 
 */
export async function getCycleSummary(
  groupObjectId: string,
): Promise<CycleSummary> {
  const tx = new Transaction();
  
  // Call the get_cycle_summary function
  const result = tx.moveCall({
    target: `${process.env.NEXT_PUBLIC_MOVE_PACKAGE_ID}::codeforge::get_cycle_summary`,
    arguments: [tx.object(groupObjectId)],
  });
  
  let client = new SuiClient({ url: getFullnodeUrl('testnet') })
  
  // Execute the transaction in dev inspect mode to get the return values
  const response = await client.devInspectTransactionBlock({
    transactionBlock: tx,
    sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
  });
  
  if (response.error) {
    throw new Error(`Failed to get cycle summary: ${response.error}`);
  }
  
  // Parse the returned values from the Move function
  const returnValues = response.results?.[0]?.returnValues;
  if (!returnValues || returnValues.length !== 6) {
    throw new Error('Unexpected return format from get_cycle_summary - expected 6 values');
  }
  
  // Convert the BCS-encoded return values to JavaScript types
  // get_cycle_summary returns: (u64, u64, u64, address, u8, bool)
  const [
    currentCycle,
    contributionsReceived,
    totalExpected,
    nextRecipientAddress,
    nextRecipientPosition,
    allContributed
  ] = returnValues.map((value, index) => {
    // Parse based on expected type for each return value
    switch (index) {
      case 0: // currentCycle (u64)
      case 1: // contributionsReceived (u64)
      case 2: // totalExpected (u64)
        return parseInt(new DataView(new Uint8Array(value[0]).buffer).getBigUint64(0, true).toString());
      case 3: // nextRecipientAddress (address)
        return '0x' + Array.from(new Uint8Array(value[0]))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      case 4: // nextRecipientPosition (u8)
        return value[0][0];
      case 5: // allContributed (bool)
        return value[0][0] === 1;
      default:
        return value[0];
    }
  });
  
  return {
    currentCycle: currentCycle as number,
    contributionsReceived: contributionsReceived as number,
    totalExpected: totalExpected as number,
    nextRecipientAddress: nextRecipientAddress as string,
    nextRecipientPosition: nextRecipientPosition as number,
    allContributed: allContributed as boolean,
  };
}
  

async function getContributionStatus(
  groupObjectId: string,
): Promise<ContributionSummary> {
  const tx = new Transaction();
  
  // Call the get_contribution_status function
  tx.moveCall({
    target: `${process.env.NEXT_PUBLIC_MOVE_PACKAGE_ID}::codeforge::get_contribution_status`,
    arguments: [tx.object(groupObjectId)],
  });
  
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  // Execute the transaction in dev inspect mode
  const response = await client.devInspectTransactionBlock({
    transactionBlock: tx,
    sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
  });
  
  if (response.error) {
    throw new Error(`Failed to get contribution status: ${response.error}`);
  }
  
  const returnValues = response.results?.[0]?.returnValues;
  
  if (!returnValues || returnValues.length !== 4) {
    throw new Error('Expected 4 return values (u64, u64, vector<address>, vector<address>)');
  }

  // Parse each return value
  const [
    currentContributionBytes,
    expectedTotalBytes,
    contributorsBytes,
    pendingBytes
  ] = returnValues;

  // Decode the values
  const currentContribution = bcs.u64().parse(
    new Uint8Array(currentContributionBytes[0])
  );
  
  const expectedTotal = bcs.u64().parse(
    new Uint8Array(expectedTotalBytes[0])
  );
  
  // For vector<address>, we first need to parse the length, then each address
  const contributors = bcs.vector(bcs.Address).parse(
    new Uint8Array(contributorsBytes[0])
  );
  
  const pending = bcs.vector(bcs.Address).parse(
    new Uint8Array(pendingBytes[0])
  );

  return {
    currentContribution: Number(currentContribution), // Convert bigint to number if needed
    expectedTotal: Number(expectedTotal),             // Convert bigint to number if needed
    contributors: contributors as string[],
    pending: pending as string[],
  };
}
  export {getContributionStatus,};