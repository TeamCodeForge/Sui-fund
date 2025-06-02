import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit';
import { toast } from 'react-toastify';
import { isAuthenticated, clearTokens } from '../../utils/auth';
import { Ed25519Keypair, Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519';
 
const keypair = new Ed25519Keypair();

export default function Home() {
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const router = useRouter();

    const getAjoUsers = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
            
            const response = await fetch('http://192.168.103.194:8000/ajoajo-users/', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to get ajo users:', errorText);
                return;
            }
            
            const data = await response.json();
            console.log('Ajo users fetched successfully:', data);
        } catch (error) {
            console.error('Error getting ajo users:', error);
            
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                console.error('CORS error - backend needs to allow cross-origin requests');
            }
        }
    }, []);

    const updateWalletAddress = useCallback(async () => {
        console.log('called update wallet address');
        try {
            const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
            
            const response = await fetch('http://192.168.103.194:8000/ajoajo-users/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ 'wallet_address': keypair.getSecretKey() })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to update wallet address:', errorText);
                return;
            }
            
            const data = await response.json();
            console.log('Wallet address updated successfully:', data);
        } catch (error) {
            console.error('Error updating wallet address:', error);
            
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                console.error('CORS error - backend needs to allow cross-origin requests');
            }
        }
    }, []);

    useEffect(() => {
        console.log('called use effect in home');
        
        if (!isAuthenticated()) {
            router.push('/');
            return;
        }

        // Only run once when component mounts
        if (!isInitialized) {
            console.log('initializing wallet and user data');
            updateWalletAddress();
            getAjoUsers();
            setIsInitialized(true);
        }
    }, [router, updateWalletAddress, getAjoUsers, isInitialized]);

    const handleLogout = () => {
        clearTokens();
        localStorage.removeItem('userData');
        toast.success('Logged out successfully');
        router.push('/');
    };

    const handleCreatePool = () => {
        router.push('/create-pool');
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
                        <div className="flex items-center p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <div className="w-5 h-5 mr-3">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                </svg>
                            </div>
                            <span className="font-medium">Dashboard</span>
                        </div>
                        
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
                        
                        <div className="flex items-center p-3 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer">
                            <div className="w-5 h-5 mr-3">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span>Notifications</span>
                        </div>
                    </div>
                    
                    <div className="mt-8 pt-4 border-t border-gray-200">
                        <button 
                            onClick={handleCreatePool}
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
                        <h2 className="text-2xl font-bold text-blue-600">Dashboard</h2>
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

                {/* Dashboard Content */}
                <div className="flex-1 p-8 bg-gray-50">
                    {/* Balance Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                        <div className="bg-blue-500 text-white p-6 rounded-lg relative">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-blue-100 text-sm">Wallet Balance</span>
                                <div className="w-6 h-6 text-blue-200">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                </div>
                            </div>
                            <div className="text-3xl font-bold">N15,300</div>
                        </div>
                        
                        <div className="bg-blue-500 text-white p-6 rounded-lg relative">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-blue-100 text-sm">SUI</span>
                                <div className="w-6 h-6 text-blue-200">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                </div>
                            </div>
                            <div className="text-3xl font-bold">3.45</div>
                        </div>
                    </div>

                    {/* Create Pool Section */}
                    <div className="flex flex-col items-center justify-center py-24">
                        <div 
                            onClick={handleCreatePool}
                            className="w-32 h-24 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center mb-6 cursor-pointer hover:border-gray-500 transition-colors"
                        >
                            <div className="text-black text-4xl font-light">+</div>
                        </div>
                        <p className="text-gray-600 text-lg text-center max-w-md">
                            Create your own Ajo group and start inviting members.
                        </p>
                    </div>
                </div>
            </div>

            {/* Wallet Connection Modal */}
            {showWalletModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
                        <img src="/suiflow.png" className="w-16 h-16 mx-auto mb-4" alt="Sui-Fund Logo" />
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h3>
                        <p className="text-gray-600 mb-8">
                            To access all features and create Ajo pools, please connect your Sui wallet.
                        </p>
                        <div className="flex justify-center mb-6">
                            <ConnectButton />
                        </div>
                        <p className="text-sm text-gray-500">
                            You can continue using the dashboard once your wallet is connected.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}