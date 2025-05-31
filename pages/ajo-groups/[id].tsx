import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { isAuthenticated, clearTokens } from '../../utils/auth';

interface Member {
    id: number;
    name: string;
    title: string;
    phone: string;
    avatar: string;
}

interface GroupDetails {
    id: string;
    name: string;
    purpose: string;
    contribution: number;
    frequency: string;
    members: number;
    nextPayout: string;
    currentRecipient: string;
    founder: string;
    membersList: Member[];
}

export default function GroupDetails() {
    const [group, setGroup] = useState<GroupDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { id } = router.query;

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/');
            return;
        }
        if (id) {
            fetchGroupDetails(id as string);
        }
    }, [router, id]);

    const fetchGroupDetails = async (groupId: string) => {
        try {
            // Mock data - replace with actual API call
            const mockGroup: GroupDetails = {
                id: groupId,
                name: 'Swift Growth Ajo group',
                purpose: 'A reliable monthly savings group for swift growth.',
                contribution: 10000,
                frequency: 'Monthly',
                members: 4,
                nextPayout: '2025-06-31',
                currentRecipient: 'Chike Obi',
                founder: 'Nancy James',
                membersList: [
                    {
                        id: 1,
                        name: 'Nancy James',
                        title: 'Creator',
                        phone: '09011510100',
                        avatar: '/avatars/nancy.jpg'
                    },
                    {
                        id: 2,
                        name: 'Peter Okonkwo',
                        title: 'Creator',
                        phone: '09011510100',
                        avatar: '/avatars/peter.jpg'
                    },
                    {
                        id: 3,
                        name: 'Elliot Nkwocha',
                        title: 'Member',
                        phone: '09013456789',
                        avatar: '/avatars/elliot.jpg'
                    },
                    {
                        id: 4,
                        name: 'Christine Vandel',
                        title: 'Creator',
                        phone: '09011510100',
                        avatar: '/avatars/christine.jpg'
                    }
                ]
            };
            
            setGroup(mockGroup);
        } catch (error) {
            console.error('Error fetching group details:', error);
            toast.error('Failed to fetch group details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        clearTokens();
        localStorage.removeItem('userData');
        localStorage.removeItem('userKeypair');
        toast.success('Logged out successfully');
        router.push('/');
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-700">Group not found</h2>
                    <button 
                        onClick={() => router.push('/ajo-groups')}
                        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
                    >
                        Back to Groups
                    </button>
                </div>
            </div>
        );
    }

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
                        <button 
                            onClick={() => router.push('/home')}
                            className="flex items-center p-3 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer w-full"
                        >
                            <div className="w-5 h-5 mr-3">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                </svg>
                            </div>
                            <span className="font-medium">Dashboard</span>
                        </button>
                        
                        <button 
                            onClick={() => router.push('/ajo-groups')}
                            className="flex items-center p-3 bg-blue-50 text-blue-600 rounded-lg w-full"
                        >
                            <div className="w-5 h-5 mr-3">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                </svg>
                            </div>
                            <span className="font-medium">Your Ajo groups</span>
                        </button>
                        
                        <button 
                            onClick={() => router.push('/notifications')}
                            className="flex items-center p-3 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer w-full"
                        >
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
                        <h2 className="text-2xl font-bold text-blue-600">Your Ajo groups</h2>
                        <div className="flex items-center">
                            <span className="text-gray-700 mr-3">GM GM, Elliot!</span>
                            <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-sm">E</span>
                            </div>
                            <div className="ml-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
                    {/* Group Header */}
                    <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">{group.name}</h1>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div><strong>Purpose:</strong> {group.purpose}</div>
                            <div><strong>Contribution:</strong> ₦{group.contribution.toLocaleString()}</div>
                            <div><strong>Frequency:</strong> {group.frequency}</div>
                            <div><strong>Members:</strong> {group.members}</div>
                            <div><strong>Next Payout:</strong> {group.nextPayout}</div>
                            <div><strong>Current Recipient:</strong> {group.currentRecipient}</div>
                            <div><strong>Founder:</strong> {group.founder}</div>
                        </div>
                    </div>

                    {/* Members Section */}
                    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 border-b-2 border-blue-500 pb-2 inline-block">
                            Members Details
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {group.membersList.map((member) => (
                                <div key={member.id} className="flex items-center bg-blue-500 text-white p-4 rounded-lg">
                                    <div className="w-16 h-16 bg-gray-300 rounded-full mr-4 overflow-hidden">
                                        <div className="w-full h-full bg-blue-400 flex items-center justify-center">
                                            <span className="text-white font-bold text-lg">
                                                {member.name.split(' ').map(n => n[0]).join('')}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Name: {member.name}</h3>
                                        <p className="text-blue-100">Title: {member.title}</p>
                                        <p className="text-blue-100">Phone: {member.phone}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
