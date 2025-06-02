import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { toast } from 'react-toastify';
import { isAuthenticated, clearTokens } from '../utils/auth';
import { get } from 'http';
import { createSavingsGroupQuick } from './tools/suichain';
import { Ed25519Keypair, Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519';
 
const keypair = new Ed25519Keypair();

// method 1

// method 2
const address = keypair.getPublicKey().toSuiAddress();

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
}

interface AjoUser {
    id: number;
    user: User;
    wallet_address: string;
}

export default function CreatePool() {
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [purpose, setPurpose] = useState('');
    const [contributionAmount, setContributionAmount] = useState('');
    const [frequency, setFrequency] = useState('');
    const [maxMembers, setMaxMembers] = useState('');
    const [startDate, setStartDate] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const router = useRouter();
    const account = useCurrentAccount();
    const [ajoUsers, setAjoUsers] = useState<AjoUser[]>([]);
    const [ajoUser, setAjoUser] = useState<AjoUser | null>(null);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/');
            return;
        }
getAjoUsers();
//getAjoUser();
    }, [router]);

    const handleLogout = () => {
        clearTokens();
        localStorage.removeItem('userData');
        toast.success('Logged out successfully');
        router.push('/');
    };

    async function getAjoUsers() {
        try {
            const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
            
            const response = await fetch('http://192.168.103.194:8000/ajoajo-users/', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to fetch ajo users:', errorText);
                return;
            }
            
            const data = await response.json();
            console.log('Ajo users fetched successfully:', data);
            
            // Ensure data is an array before setting state
            if (Array.isArray(data)) {
                setAjoUsers(data);
            } else if (data && Array.isArray(data.results)) {
                // Handle pagination response format
                setAjoUsers(data.results);
            } else {
                console.error('Response data is not an array:', data);
                setAjoUsers([]);
            }
        } catch (error) {
            console.error('Error fetching ajo users:', error);
            setAjoUsers([]); // Ensure it's always an array
            
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                console.error('CORS error - backend needs to allow cross-origin requests');
            }
        }
    }

    async function getAjoUser() {
        try {
            const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
            
            const response = await fetch('http://192.168.103.194:8000/ajoajo-users/1/', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to fetch ajo users:', errorText);
                return;
            }
            
            const data = await response.json();
            console.log('Ajo users fetched successfully:', data);
            
            setAjoUser(data);
        } catch (error) {
            console.error('Error fetching ajo users:', error);
            setAjoUsers([]); // Ensure it's always an array
            
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                console.error('CORS error - backend needs to allow cross-origin requests');
            }
        }
    }

    const handleCreatePool = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Reset form
            setGroupName('');
            setPurpose('');
            setContributionAmount('');
            setFrequency('');
            setMaxMembers('');
            setStartDate('');
            setWalletAddress('');
            
            setShowSuccessModal(true);
        } catch (error) {
            toast.error('Failed to create pool');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInviteMembers = () => {
        setShowSuccessModal(false);
        toast.success('Redirecting to invite members...');
        router.push('/home');
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="w-72 bg-white border-r border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center">
                        <img src="/suiflow.png" className="w-8 h-8 mr-3" alt="Sui-Fund Logo" />
                        <h1 className="text-xl font-bold text-gray-800">Sui-Fund</h1>
                    </div>
                </div>
                
                <nav className="p-4 h-[90%] flex flex-col justify-between">
                    <div className="space-y-1">
                        <button onClick={() => router.push('/')} className="flex items-center p-3 bg-blue-50 text-blue-600 rounded-lg cursor-pointer">
                            <div className="w-5 h-5 mr-3">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                </svg>
                            </div>
                            <span className="font-medium">Dashboard</span>
                        </button>
                        
                        <button
                        onClick={() => router.push('/ajo-groups')}
                        className="flex items-center p-3 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer">
                            <div className="w-5 h-5 mr-3">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                </svg>
                            </div>
                            <span>Your Ajo groups</span>
                        </button>
                        
                        <button
                        onClick={() => router.push('/notifications')}
                         className="flex items-center p-3 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer">
                            <div className="w-5 h-5 mr-3">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span>Notifications</span>
                        </button>
                    </div>
                    
                    <div className="mt-8 pt-4 border-t border-gray-200">
                        <button 
                            onClick={() => router.push('/create-pool')}
                            className="flex items-center w-full p-3 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                            <div className="w-5 h-5 mr-3">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <span className="font-medium">Create Pool</span>
                        </button>
                        
                        <div 
                            onClick={handleLogout}
                            className="flex items-center p-3 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer mt-1"
                        >
                            <div className="w-5 h-5 mr-3">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </div>
                            <span>Log out</span>
                        </div>
                    </div>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-blue-600">Create Pool</h2>
                            <p className="text-gray-600 text-sm mt-1">Create your own Ajo pool and start inviting members.</p>
                        </div>
                        <div className="flex items-center">
                            <span className="text-gray-700 mr-3">GM GM, Nancy!</span>
                            <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-sm">N</span>
                            </div>
                            <div className="ml-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
                    <div className="max-w-2xl">
                        <form onSubmit={handleCreatePool} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md bg-white"
                                    placeholder="E.g Swift Growth Ajo Team"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Purpose of group</label>
                                <input
                                    type="text"
                                    value={purpose}
                                    onChange={(e) => setPurpose(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md bg-white"
                                    placeholder="Optional"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contribution Amount</label>
                                <input
                                    type="text"
                                    value={contributionAmount}
                                    onChange={(e) => setContributionAmount(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md bg-white"
                                    placeholder="Input Amount..."
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                                <input
                                    type="text"
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md bg-white"
                                    placeholder="E.g Daily, Monthly, Yearly"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Add Members</label>
                                <select
                                    multiple
                                    value={selectedMembers}
                                    onChange={(e) => {
                                        const values = Array.from(e.target.selectedOptions, option => option.value);
                                        setSelectedMembers(values);
                                    }}
                                    className="w-full p-3 border border-gray-300 rounded-md bg-white h-32"
                                    required
                                >
                                    {Array.isArray(ajoUsers) && ajoUsers.length > 0 ? (
                                        ajoUsers.map((ajoUser) => (
                                            <option key={ajoUser.id} value={ajoUser.wallet_address}>
                                                {ajoUser.user.username}
                                            </option>
                                        ))
                                    ) : (
                                        <option disabled>No users available</option>
                                    )}
                                </select>
                                <p className="text-sm text-gray-500 mt-1">
                                    Hold Ctrl/Cmd to select multiple members
                                </p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                <input
                                    type="text"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md bg-white"
                                    placeholder="Select Date..."
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Wallet Address</label>
                                <input
                                    type="text"
                                    value={walletAddress}
                                    onChange={(e) => setWalletAddress(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md bg-white"
                                    placeholder="Input Address..."
                                    required
                                />
                            </div>
                            
                            <div className="flex justify-end pt-4">
                                <button
                                onClick={() => {
                                    const participants = ajoUsers.map((user, index) => ({
                                        wallet: user.wallet_address,
                                        position: index + 1
                                    }));
                                    

                                    createSavingsGroupQuick(groupName, 30, 150, 0.8, participants, keypair, 'testnet');
                                }}
                                    type="submit"
                                    disabled={isLoading}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-md font-medium disabled:opacity-50"
                                >
                                    {isLoading ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center relative">
                        <button 
                            onClick={() => setShowSuccessModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        
                        <div className="mb-6">
                            <img src="/suiflow.png" className="w-16 h-16 mx-auto mb-4" alt="Sui-Fund Logo" />
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Congratulations!</h3>
                            <p className="text-gray-600">
                                You've successfully created your Ajo group.<br />
                                Invite members and start saving!
                            </p>
                        </div>
                        
                        <button
                            onClick={handleInviteMembers}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-md font-medium"
                        >
                            Invite Members
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
