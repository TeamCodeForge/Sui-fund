import { useState, useEffect, useCallback, useContext, ReactElement, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit';
import { toast } from 'react-toastify';
import { isAuthenticated, clearTokens } from '../../utils/auth';
import { Ed25519Keypair, Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519';
import makeRequest from '@/service/requester'; // Import your makeRequest function
import { ResponseType } from '@/service/requester';
import { UserContext } from '@/providers/UserProvider';
import { getSuiBalance } from '@/tools/suichain';
import BasicLayout from '@/layouts/BasicLayout';

const keypair = new Ed25519Keypair();

export default function Home() {
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [suiBalance, setSuiBalance] = useState(0.0);
    const router = useRouter();
    const [groups, setGroups] = useState(0);

    const userContext = useContext(UserContext);
    // Now destructure from userContext with proper null checking
    if (!userContext) {
        throw new Error('Component must be used within a UserProvider');
    }

    const [user, setUser] = userContext;


    const fetchAjoGroups = async () => {
        try {
            const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
            
            // Mock data for now - replace with actual API call
            

            makeRequest(process.env.NEXT_PUBLIC_URL + '/ajosavingsgroup/').then(response => {
                if(response.type === ResponseType.SUCCESS){
                    console.log(response);
                    setGroups(response.payload.count);
                }
            }).then(() => {
                setIsLoading(false);
            })
            
            
        } catch (error) {
            console.error('Error fetching ajo groups:', error);
            toast.error('Failed to fetch your groups');
        } finally {
            setIsLoading(false);
        }
    };

    const getAjoUsers = useCallback(async () => {
        try {
            const response = await makeRequest(
                process.env.NEXT_PUBLIC_URL + '/ajoajo-users/',
                {
                    method: 'GET',
                },
                true // signed request
            );

            if (response.type === ResponseType.SUCCESS) {
                console.log('Ajo users fetched successfully:', response.payload);
            } else if (response.type === ResponseType.REDIRECT) {
                console.log('Redirect required:', response.link);
                if (response.link) {
                    router.push(response.link);
                }
            } else if (response.type === ResponseType.KNOWN_ERROR) {
                console.error('Known error getting ajo users:', response.message);
            } else if (response.type === ResponseType.EXPIRED) {
                console.log('Session expired, redirecting to signin');
                if (response.link) {
                    router.push(response.link);
                }
            }
        } catch (error) {
            console.error('Error getting ajo users:', error);

            if (error instanceof Error && error.message.includes('Network error')) {
                console.error('Network/CORS error - backend needs to allow cross-origin requests');
            }
        }
    }, [router]);

    const updateWalletAddress = useCallback(async () => {
        console.log('called update wallet address');
        try {
            const response = await makeRequest(
                process.env.NEXT_PUBLIC_URL + '/ajoajo-users/',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 'wallet_address': keypair.getSecretKey() })
                },
                true // signed request
            );

            if (response.type === ResponseType.SUCCESS) {
                console.log('Wallet address updated successfully:', response.payload);
            } else if (response.type === ResponseType.REDIRECT) {
                console.log('Redirect required:', response.link);
                if (response.link) {
                    router.push(response.link);
                }
            } else if (response.type === ResponseType.KNOWN_ERROR) {
                console.error('Known error updating wallet address:', response.message);
            } else if (response.type === ResponseType.EXPIRED) {
                console.log('Session expired, redirecting to signin');
                if (response.link) {
                    router.push(response.link);
                }
            }
        } catch (error) {
            console.error('Error updating wallet address:', error);

            if (error instanceof Error && error.message.includes('Network error')) {
                console.error('Network/CORS error - backend needs to allow cross-origin requests');
            }
        }
    }, [router]);


    const fetchCurrentUser = useCallback(async () => {
        console.log('called fetch current user');
        try {
            const response = await makeRequest(
                process.env.NEXT_PUBLIC_URL + '/ajoajo-users/1/',
                {
                    method: 'GET'
                },
                true // signed request
            );

            if (response.type === ResponseType.SUCCESS) {
                console.log('User fetched successfully:', response.payload);

                // Update the user context with the fetched data
                // Assuming response.payload contains the user data
                if (response.payload && setUser) {

                    console.log(response.payload);
                    setUser(response.payload);

                    // Get just SUI balance
                    const suiBalance = await getSuiBalance(response.payload.wallet_address, 'testnet');
                    console.log(suiBalance);
                    setSuiBalance(suiBalance.balanceInSui);
                }
            } else if (response.type === ResponseType.REDIRECT) {
                console.log('Redirect required:', response.link);
                if (response.link) {
                    router.push(response.link);
                }
            } else if (response.type === ResponseType.KNOWN_ERROR) {
                console.error('Known error fetching user:', response.message);
            } else if (response.type === ResponseType.EXPIRED) {
                console.log('Session expired, redirecting to signin');
                if (response.link) {
                    router.push(response.link);
                }
            }
        } catch (error) {
            console.error('Error fetching current user:', error);

            if (error instanceof Error && error.message.includes('Network error')) {
                console.error('Network/CORS error - backend needs to allow cross-origin requests');
            }
        }
    }, [setUser, router]); // Dependencies for useCallback

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
            fetchCurrentUser();
            fetchAjoGroups();
        }
    }, [router, updateWalletAddress, getAjoUsers, isInitialized]);

   

    const handleCreatePool = () => {
        router.push('/create-pool');
    };

    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(Ed25519Keypair.fromSecretKey(user.wallet_address).getPublicKey().toSuiAddress());
            setCopied(true);
            toast.info('Wallet address copied')

            // Reset the copied state after 2 seconds
            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (error) {
            console.error('Failed to copy text:', error);
        }
    };

    return (
        <>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-8 py-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-blue-600">Dashboard</h2>
                        <div className="flex items-center">
                            <span className="text-gray-700 mr-3">{user.user.username}!</span>
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
                                <span className="text-blue-100 text-sm">SUI Wallet Balance</span>
                                <div className="w-6 h-6 text-blue-200">
                                    <button
                                        onClick={handleCopy}
                                        className="flex items-center justify-center p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 group"
                                        title="Click to copy 'hello' to clipboard"
                                    >
                                        <svg
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            className="w-6 h-6"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M8 16H6m0 0a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="text-3xl font-bold">SUI {suiBalance}</div>
                        </div>

                        <div className="bg-blue-500 text-white p-6 rounded-lg relative">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-blue-100 text-sm">All Groups</span>
                                <div className="w-6 h-6 text-blue-200">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                </div>
                            </div>
                            <div className="text-3xl font-bold">{groups}</div>
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
        </>


    );
}



Home.getLayout = function(page: ReactNode) : ReactElement{
    return (<BasicLayout>{page}</BasicLayout>)
}