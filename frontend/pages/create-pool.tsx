import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { toast } from 'react-toastify';
import { isAuthenticated, clearTokens } from '../utils/auth';
import { get } from 'http';
import { ReactNode, ReactElement } from 'react';
import BasicLayout from '@/layouts/BasicLayout';
import { createSavingsGroupQuick } from '@/tools/suichain';
import makeRequest, { ResponseType } from '@/service/requester'; // Import your makeRequest function
import { UserContext } from '@/providers/UserProvider';
 


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
    const [isLoading, setIsLoading] = useState(false);
    
    const router = useRouter();
    const account = useCurrentAccount();
    const [ajoUsers, setAjoUsers] = useState<AjoUser[]>([]);
    const [ajoUser, setAjoUser] = useState<AjoUser | null>(null);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const userContext = useContext(UserContext);

    if (!userContext) {
        throw new Error('Component must be used within a UserProvider');
    }

    const [user, setUser] = userContext;



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
            const response = await makeRequest(
                process.env.NEXT_PUBLIC_URL + '/ajoajo-users/',
                {
                    method: 'GET',
                },
                true // signed request
            );
            
            if (response.type === ResponseType.SUCCESS) {
                console.log('Ajo users fetched successfully:', response.payload);
                
                // Ensure data is an array before setting state
                if (Array.isArray(response.payload)) {
                    setAjoUsers(response.payload);
                } else if (response.payload && Array.isArray(response.payload.results)) {
                    // Handle pagination response format
                    setAjoUsers(response.payload.results);
                } else {
                    console.error('Response data is not an array:', response.payload);
                    setAjoUsers([]);
                }
            } else if (response.type === ResponseType.REDIRECT) {
                console.log('Redirect required:', response.link);
                if (response.link) {
                    router.push(response.link);
                }
            } else if (response.type === ResponseType.KNOWN_ERROR) {
                console.error('Known error fetching ajo users:', response.message);
                setAjoUsers([]);
            } else if (response.type === ResponseType.EXPIRED) {
                console.log('Session expired, redirecting to signin');
                if (response.link) {
                    router.push(response.link);
                }
            }
        } catch (error) {
            console.error('Error fetching ajo users:', error);
            setAjoUsers([]); // Ensure it's always an array
            
            if (error instanceof Error && error.message.includes('Network error')) {
                console.error('Network/CORS error - backend needs to allow cross-origin requests');
            }
        }
    }

    async function getAjoUser() {
        try {
            const response = await makeRequest(
                process.env.NEXT_PUBLIC_URL + '/ajoajo-users/1/',
                {
                    method: 'GET',
                },
                true // signed request
            );
            
            if (response.type === ResponseType.SUCCESS) {
                console.log('Ajo user fetched successfully:', response.payload);
                setAjoUser(response.payload);
            } else if (response.type === ResponseType.REDIRECT) {
                console.log('Redirect required:', response.link);
                if (response.link) {
                    router.push(response.link);
                }
            } else if (response.type === ResponseType.KNOWN_ERROR) {
                console.error('Known error fetching ajo user:', response.message);
            } else if (response.type === ResponseType.EXPIRED) {
                console.log('Session expired, redirecting to signin');
                if (response.link) {
                    router.push(response.link);
                }
            }
        } catch (error) {
            console.error('Error fetching ajo user:', error);
            
            if (error instanceof Error && error.message.includes('Network error')) {
                console.error('Network/CORS error - backend needs to allow cross-origin requests');
            }
        }
    }

    const handleCreatePool = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
    
        const participants = ajoUsers.map((_user, index) => ({
            wallet: _user.wallet_address,
            position: index + 1
        }));
    
        try {
            // Wait for createSavingsGroupQuick to complete
            const response = await createSavingsGroupQuick(
                groupName, 
                parseInt(frequency), 
                parseInt(startDate), 
                parseFloat(contributionAmount), 
                participants, 
                user.wallet_address, 
                'testnet'
            );
            
            console.log(response);
            
            const payload = {
                'address_link': response.groupId,
                'name': groupName,
                'digest': response.digest,
                'description': purpose,
                'cycle_duration_days': frequency,
                'contribution_amount': contributionAmount,
                'start_cycle': startDate,
                'participant_ids': ajoUsers.map(user => user.user.id),
                'active': true
            };
    
            console.log(payload);
    
            // Wait for the backend request to complete
            const backendResponse = await makeRequest(process.env.NEXT_PUBLIC_URL + '/ajosavingsgroup/', {
                'method': 'POST',
                'headers': {'Content-Type': 'application/json'},
                'body': JSON.stringify(payload),
            });
    
            if (backendResponse.type === ResponseType.SUCCESS) {
                setShowSuccessModal(true);
            }
    
        } catch (error) {
            console.error('Error creating savings group:', error);
            toast.error('NO Coin available for transaction');
        } finally {
            // This will always run, whether success or error
            setIsLoading(false);
        }
    };

    
    const handleInviteMembers = () => {
        setShowSuccessModal(false);
        toast.success('Redirecting to invite members...');
        router.push('/home');
    };

    return (
        <>

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
                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Payment after (cycle):</label>
                                <input
                                    type="text"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md bg-white"
                                    placeholder="Select Date..."
                                    required
                                />
                            </div>
                            
 
                            
                            <div className="flex justify-end pt-4">
                                <button
                              
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
        </>
    );
}


CreatePool.getLayout = function(page: ReactNode) : ReactElement{
    return (<BasicLayout>{page}</BasicLayout>)
}