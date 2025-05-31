"""
Sui Savings Group Python SDK using PySui
A comprehensive Python client for interacting with the Sui Move savings group smart contract.

Requirements:
pip install pysui
"""

import asyncio
import json
import time
from typing import List, Dict, Optional, Tuple, Any, Union
from dataclasses import dataclass
from enum import Enum
import logging

# PySui imports
from pysui import SuiConfig, SyncClient, AsyncClient
from pysui.sui.sui_types.address import SuiAddress
from pysui.sui.sui_types.scalars import ObjectID, SuiString, SuiU64, SuiU8
from pysui.sui.sui_txn.sync_transaction import SuiTransaction
from pysui.sui.sui_txn.async_transaction import SuiTransactionAsync
from pysui.abstracts import KeyPair
from pysui.sui.sui_crypto import SuiKeyPair, keypair_from_keystore
from pysui.sui.sui_clients.common import handle_result

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ParticipantInfo:
    """Participant information"""
    address: str
    position: int
    has_contributed: bool = False
    has_received_payout: bool = False


@dataclass
class SavingsGroupInfo:
    """Savings group information"""
    object_id: str
    name: str
    cycle_duration_days: int
    contribution_amount: int
    current_cycle: int
    current_balance: int
    is_active: bool
    participants: List[ParticipantInfo]
    start_cycle: int
    created_at: int
    cycle_start_time: int


class SavingsGroupError(Exception):
    """Base exception for savings group operations"""
    pass


class ContractError(SavingsGroupError):
    """Smart contract execution errors"""
    def __init__(self, message: str, error_code: Optional[int] = None):
        super().__init__(message)
        self.error_code = error_code


class SavingsGroupSDK:
    """High-level SDK for interacting with the savings group smart contract"""
    
    # Error codes from the smart contract
    ERROR_CODES = {
        0: "E_INVALID_PARTICIPANT_COUNT",
        1: "E_INVALID_POSITION", 
        2: "E_DUPLICATE_POSITION",
        3: "E_INVALID_CYCLE_DURATION",
        4: "E_INSUFFICIENT_FUNDS",
        5: "E_NOT_PARTICIPANT",
        6: "E_ALREADY_CONTRIBUTED",
        7: "E_NOT_CONTRIBUTION_TIME",
        8: "E_NOT_PAYOUT_TIME",
        9: "E_CYCLE_NOT_STARTED",
        10: "E_PAYOUT_ALREADY_PROCESSED"
    }
    
    def __init__(
        self,
        package_id: str,
        config: Optional[SuiConfig] = None,
        keystore_path: Optional[str] = None,
        use_async: bool = False
    ):
        """
        Initialize the SDK
        
        Args:
            package_id: The published package ID of the smart contract
            config: SuiConfig object (if None, uses default testnet config)
            keystore_path: Path to keystore file
            use_async: Whether to use async client
        """
        self.package_id = package_id
        self.use_async = use_async
        
        # Initialize config
        if config is None:
            self.config = SuiConfig.default_config()
        else:
            self.config = config
        
        # Initialize client
        if use_async:
            self.client = AsyncClient(self.config)
        else:
            self.client = SyncClient(self.config)
        
        # Load keystore if provided
        self.keypairs = {}
        if keystore_path:
            self.load_keystore(keystore_path)
    
    def load_keystore(self, keystore_path: str):
        """Load keypairs from keystore file"""
        try:
            with open(keystore_path, 'r') as f:
                keystore_data = json.load(f)
            
            for alias, key_data in keystore_data.items():
                keypair = keypair_from_keystore(key_data)
                self.keypairs[alias] = keypair
                logger.info(f"Loaded keypair for alias: {alias}")
        except Exception as e:
            logger.error(f"Failed to load keystore: {e}")
            raise SavingsGroupError(f"Failed to load keystore: {e}")
    
    def add_keypair(self, alias: str, keypair: KeyPair):
        """Add a keypair with an alias"""
        self.keypairs[alias] = keypair
        logger.info(f"Added keypair for alias: {alias}")
    
    def get_address(self, alias: str) -> str:
        """Get address for a keypair alias"""
        if alias not in self.keypairs:
            raise SavingsGroupError(f"Keypair not found for alias: {alias}")
        return str(self.keypairs[alias].public_key.sui_address())
    
    def _handle_transaction_result(self, result):
        """Handle transaction result and check for errors"""
        if hasattr(result, 'result_data') and result.result_data:
            if hasattr(result.result_data, 'effects'):
                effects = result.result_data.effects
                if effects and hasattr(effects, 'status'):
                    if effects.status.get('status') == 'failure':
                        error_msg = effects.status.get('error', 'Unknown error')
                        # Try to extract error code from abort message
                        error_code = None
                        if 'abort_code' in error_msg:
                            try:
                                # Extract abort code number
                                parts = error_msg.split('abort_code')
                                if len(parts) > 1:
                                    code_part = parts[1].strip().split()[0]
                                    error_code = int(code_part)
                            except:
                                pass
                        
                        error_name = self.ERROR_CODES.get(error_code, f"Unknown error (code: {error_code})")
                        raise ContractError(f"{error_name}: {error_msg}", error_code)
        return result
    
    async def create_savings_group(
        self,
        signer_alias: str,
        name: str,
        cycle_duration_days: int,
        start_cycle: int,
        contribution_amount: int,
        participants: List[str],
        positions: List[int],
        gas_budget: int = 10000000
    ) -> Dict[str, Any]:
        """
        Create a new savings group
        
        Args:
            signer_alias: Alias of the keypair to sign the transaction
            name: Name of the savings group
            cycle_duration_days: Duration of each cycle in days
            start_cycle: Which cycle to start payouts (0 = immediately)
            contribution_amount: Amount each participant must contribute per cycle (in MIST)
            participants: List of participant addresses
            positions: List of payout positions for each participant
            gas_budget: Gas budget for the transaction
        
        Returns:
            Transaction result
        """
        # Validation
        if len(participants) != len(positions):
            raise ValueError("Participants and positions lists must have the same length")
        
        if not participants:
            raise ValueError("At least one participant is required")
        
        if any(pos <= 0 or pos > len(participants) for pos in positions):
            raise ValueError("Invalid position values")
        
        if len(set(positions)) != len(positions):
            raise ValueError("Duplicate positions not allowed")
        
        if signer_alias not in self.keypairs:
            raise SavingsGroupError(f"Keypair not found for alias: {signer_alias}")
        
        keypair = self.keypairs[signer_alias]
        
        # Create transaction
        if self.use_async:
            txn = SuiTransactionAsync(client=self.client, initial_sender=keypair)
        else:
            txn = SuiTransaction(client=self.client, initial_sender=keypair)
        
        # Convert participants to SuiAddress objects
        sui_participants = [SuiAddress(addr) for addr in participants]
        sui_positions = [SuiU8(pos) for pos in positions]
        
        # Build move call
        txn.move_call(
            target=f"{self.package_id}::codeforge::create_savings_group",
            arguments=[
                SuiString(name),
                SuiU64(cycle_duration_days),
                SuiU64(start_cycle),
                SuiU64(contribution_amount),
                sui_participants,
                sui_positions,
                ObjectID("0x6")  # Clock object
            ]
        )
        
        # Execute transaction
        logger.info(f"Creating savings group '{name}' with {len(participants)} participants")
        
        if self.use_async:
            result = await txn.execute(gas_budget=gas_budget)
        else:
            result = txn.execute(gas_budget=gas_budget)
        
        return self._handle_transaction_result(result)
    
    async def contribute(
        self,
        signer_alias: str,
        group_id: str,
        payment_amount: int,
        gas_budget: int = 5000000
    ) -> Dict[str, Any]:
        """
        Make a contribution to the savings group
        
        Args:
            signer_alias: Alias of the keypair to sign the transaction
            group_id: ID of the savings group object
            payment_amount: Amount to contribute (in MIST)
            gas_budget: Gas budget for the transaction
        
        Returns:
            Transaction result
        """
        if signer_alias not in self.keypairs:
            raise SavingsGroupError(f"Keypair not found for alias: {signer_alias}")
        
        keypair = self.keypairs[signer_alias]
        
        # Create transaction
        if self.use_async:
            txn = SuiTransactionAsync(client=self.client, initial_sender=keypair)
        else:
            txn = SuiTransaction(client=self.client, initial_sender=keypair)
        
        # Get coins for payment
        payment_coin = txn.split_coin(
            coin=txn.gas,
            amounts=[payment_amount]
        )
        
        # Build move call
        txn.move_call(
            target=f"{self.package_id}::codeforge::contribute",
            arguments=[
                ObjectID(group_id),
                payment_coin,
                ObjectID("0x6")  # Clock object
            ]
        )
        
        # Execute transaction
        logger.info(f"Making contribution of {payment_amount} MIST to group {group_id}")
        
        if self.use_async:
            result = await txn.execute(gas_budget=gas_budget)
        else:
            result = txn.execute(gas_budget=gas_budget)
        
        return self._handle_transaction_result(result)
    
    async def process_payout(
        self,
        signer_alias: str,
        group_id: str,
        gas_budget: int = 5000000
    ) -> Dict[str, Any]:
        """
        Process payout for the current cycle
        
        Args:
            signer_alias: Alias of the keypair to sign the transaction
            group_id: ID of the savings group object
            gas_budget: Gas budget for the transaction
        
        Returns:
            Transaction result
        """
        if signer_alias not in self.keypairs:
            raise SavingsGroupError(f"Keypair not found for alias: {signer_alias}")
        
        keypair = self.keypairs[signer_alias]
        
        # Create transaction
        if self.use_async:
            txn = SuiTransactionAsync(client=self.client, initial_sender=keypair)
        else:
            txn = SuiTransaction(client=self.client, initial_sender=keypair)
        
        # Build move call
        txn.move_call(
            target=f"{self.package_id}::codeforge::process_payout",
            arguments=[
                ObjectID(group_id),
                ObjectID("0x6")  # Clock object
            ]
        )
        
        # Execute transaction
        logger.info(f"Processing payout for group {group_id}")
        
        if self.use_async:
            result = await txn.execute(gas_budget=gas_budget)
        else:
            result = txn.execute(gas_budget=gas_budget)
        
        return self._handle_transaction_result(result)
    
    async def start_new_cycle(
        self,
        signer_alias: str,
        group_id: str,
        gas_budget: int = 3000000
    ) -> Dict[str, Any]:
        """
        Start a new cycle for the savings group
        
        Args:
            signer_alias: Alias of the keypair to sign the transaction
            group_id: ID of the savings group object
            gas_budget: Gas budget for the transaction
        
        Returns:
            Transaction result
        """
        if signer_alias not in self.keypairs:
            raise SavingsGroupError(f"Keypair not found for alias: {signer_alias}")
        
        keypair = self.keypairs[signer_alias]
        
        # Create transaction
        if self.use_async:
            txn = SuiTransactionAsync(client=self.client, initial_sender=keypair)
        else:
            txn = SuiTransaction(client=self.client, initial_sender=keypair)
        
        # Build move call
        txn.move_call(
            target=f"{self.package_id}::codeforge::start_new_cycle",
            arguments=[
                ObjectID(group_id),
                ObjectID("0x6")  # Clock object
            ]
        )
        
        # Execute transaction
        logger.info(f"Starting new cycle for group {group_id}")
        
        if self.use_async:
            result = await txn.execute(gas_budget=gas_budget)
        else:
            result = txn.execute(gas_budget=gas_budget)
        
        return self._handle_transaction_result(result)
    
    async def get_group_info(self, group_id: str) -> SavingsGroupInfo:
        """
        Get information about a savings group
        
        Args:
            group_id: ID of the savings group object
        
        Returns:
            SavingsGroupInfo object with group details
        """
        # Get object data
        if self.use_async:
            result = await self.client.get_object(ObjectID(group_id))
        else:
            result = self.client.get_object(ObjectID(group_id))
        
        if not result.result_data:
            raise SavingsGroupError(f"Group not found: {group_id}")
        
        # Parse object data
        obj_data = result.result_data
        content = obj_data.content
        
        if not content or not hasattr(content, 'fields'):
            raise SavingsGroupError("Invalid object data format")
        
        fields = content.fields
        
        # Extract group information
        group_info = SavingsGroupInfo(
            object_id=group_id,
            name=fields.get('name', ''),
            cycle_duration_days=int(fields.get('cycle_duration_days', 0)),
            contribution_amount=int(fields.get('contribution_amount', 0)),
            current_cycle=int(fields.get('current_cycle', 0)),
            current_balance=int(fields.get('current_savings_balance', 0)),
            is_active=bool(fields.get('is_active', False)),
            participants=[],  # Will be populated from participants map
            start_cycle=int(fields.get('start_cycle', 0)),
            created_at=int(fields.get('created_at', 0)),
            cycle_start_time=int(fields.get('cycle_start_time', 0))
        )
        
        # Parse participants if available
        if 'participants' in fields:
            participants_data = fields['participants']
            # This would need to be parsed based on the actual structure
            # of the participants field in your smart contract
        
        return group_info
    
    async def get_balance(self, address: str) -> int:
        """
        Get SUI balance for an address
        
        Args:
            address: Sui address to check
        
        Returns:
            Balance in MIST
        """
        if self.use_async:
            result = await self.client.get_balance(SuiAddress(address))
        else:
            result = self.client.get_balance(SuiAddress(address))
        
        if result.result_data:
            return int(result.result_data.total_balance)
        return 0
    
    def mist_to_sui(self, mist: int) -> float:
        """Convert MIST to SUI (1 SUI = 1e9 MIST)"""
        return mist / 1_000_000_000
    
    def sui_to_mist(self, sui: float) -> int:
        """Convert SUI to MIST (1 SUI = 1e9 MIST)"""
        return int(sui * 1_000_000_000)


class SavingsGroupManager:
    """High-level manager for savings group operations"""
    
    def __init__(self, sdk: SavingsGroupSDK):
        self.sdk = sdk
    
    async def create_group_with_validation(
        self,
        admin_alias: str,
        name: str,
        cycle_duration_days: int,
        start_cycle: int,
        contribution_amount_sui: float,
        participants: List[str],
        positions: List[int]
    ) -> str:
        """
        Create a savings group with comprehensive validation
        
        Returns:
            Object ID of the created group
        """
        # Convert SUI to MIST
        contribution_amount = self.sdk.sui_to_mist(contribution_amount_sui)
        
        # Validate admin has sufficient balance
        admin_address = self.sdk.get_address(admin_alias)
        admin_balance = await self.sdk.get_balance(admin_address)
        
        estimated_gas = self.sdk.sui_to_mist(0.01)  # Estimate 0.01 SUI for gas
        if admin_balance < estimated_gas:
            raise SavingsGroupError(f"Insufficient balance for gas fees. Need at least 0.01 SUI")
        
        # Create the group
        result = await self.sdk.create_savings_group(
            signer_alias=admin_alias,
            name=name,
            cycle_duration_days=cycle_duration_days,
            start_cycle=start_cycle,
            contribution_amount=contribution_amount,
            participants=participants,
            positions=positions
        )
        
        # Extract created object ID from result
        if hasattr(result, 'result_data') and result.result_data:
            if hasattr(result.result_data, 'object_changes'):
                for change in result.result_data.object_changes:
                    if change.get('type') == 'created':
                        return change.get('object_id')
        
        raise SavingsGroupError("Failed to extract group ID from creation result")
    
    async def run_full_cycle(
        self,
        admin_alias: str,
        group_id: str,
        participant_aliases: List[str]
    ):
        """
        Run a complete cycle: collect contributions and process payout
        
        Args:
            admin_alias: Admin keypair alias
            group_id: Savings group ID
            participant_aliases: List of participant keypair aliases
        """
        # Get group info
        group_info = await self.sdk.get_group_info(group_id)
        
        if not group_info.is_active:
            raise SavingsGroupError("Group is not active")
        
        logger.info(f"Running cycle {group_info.current_cycle} for group {group_id}")
        
        # Collect contributions from all participants
        for alias in participant_aliases:
            try:
                logger.info(f"Collecting contribution from {alias}")
                await self.sdk.contribute(
                    signer_alias=alias,
                    group_id=group_id,
                    payment_amount=group_info.contribution_amount
                )
                logger.info(f"✓ Contribution successful from {alias}")
            except ContractError as e:
                if e.error_code == 6:  # E_ALREADY_CONTRIBUTED
                    logger.info(f"✓ {alias} already contributed this cycle")
                else:
                    logger.error(f"✗ Contribution failed from {alias}: {e}")
                    raise
        
        # Wait for cycle duration (in a real scenario)
        logger.info("Waiting for cycle to complete...")
        # time.sleep(group_info.cycle_duration_days * 24 * 60 * 60)  # Uncomment for real usage
        
        # Process payout
        logger.info("Processing payout...")
        await self.sdk.process_payout(
            signer_alias=admin_alias,
            group_id=group_id
        )
        logger.info("✓ Payout processed")
        
        # Start new cycle if group is still active
        updated_info = await self.sdk.get_group_info(group_id)
        if updated_info.is_active:
            logger.info("Starting new cycle...")
            await self.sdk.start_new_cycle(
                signer_alias=admin_alias,
                group_id=group_id
            )
            logger.info("✓ New cycle started")
        else:
            logger.info("Group has completed all cycles")


# Example usage
async def example_usage():
    """Example of how to use the SDK"""
    
    # Initialize SDK
    package_id = "0x35ef12fc19048b8d2500dfb720d1cddc6a3352e7ff231136a5dd75ec8ff1f7f9" # Your deployed package ID
    sdk = SavingsGroupSDK(
        package_id=package_id,
        use_async=True
    )
    
    # Add keypairs (in practice, load from keystore)
    # sdk.load_keystore("path/to/keystore.json")
    
    # Or add individual keypairs
    admin_keypair = SuiKeyPair.generate()  # Generate for testing
    sdk.add_keypair("admin", admin_keypair)
    
    participant_keypairs = []
    for i in range(3):
        kp = SuiKeyPair.generate()
        alias = f"participant_{i+1}"
        sdk.add_keypair(alias, kp)
        participant_keypairs.append(alias)
    
    # Create manager
    manager = SavingsGroupManager(sdk)
    
    try:
        # Create a savings group
        participants = [sdk.get_address(alias) for alias in participant_keypairs]
        positions = [1, 2, 3]
        
        group_id = await manager.create_group_with_validation(
            admin_alias="admin",
            name="Test Savings Group",
            cycle_duration_days=7,
            start_cycle=0,
            contribution_amount_sui=1.0,  # 1 SUI per cycle
            participants=participants,
            positions=positions
        )
        
        print(f"Created savings group: {group_id}")
        
        # Run a complete cycle
        await manager.run_full_cycle(
            admin_alias="admin",
            group_id=group_id,
            participant_aliases=participant_keypairs
        )
        
        # Get final group info
        final_info = await sdk.get_group_info(group_id)
        print(f"Group status: Active={final_info.is_active}, Cycle={final_info.current_cycle}")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        raise


if __name__ == "__main__":
    # Run example
    asyncio.run(example_usage())