import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { isAuthenticated, clearTokens } from '../../utils/auth';

interface AjoGroup {
    id: string;
    name: string;
    purpose: string;
    members: number;
    frequency: string;
    contribution: number;
    nextPayout: string;
    currentRecipient: string;
    founder: string;
}

export default function AjoGroups() {
    const [groups, setGroups] = useState<AjoGroup[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/');
            return;
        }
        fetchAjoGroups();
    }, [router]);

    const fetchAjoGroups = async () => {
        try {
            const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
            
            // Mock data for now - replace with actual API call
            const mockGroups: AjoGroup[] = [
                {
                    id: '1',
                    name: 'Swift growth Ajo group',
                    purpose: 'A reliable monthly savings group for swift growth.',
                    members: 4,
                    frequency: 'Monthly',
                    contribution: 10000,
                    nextPayout: '2025-06-31',
                    currentRecipient: 'Chike Obi',
                    founder: 'Nancy James'
                }
            ];
            
            setGroups(mockGroups);
        } catch (error) {
            console.error('Error fetching ajo groups:', error);
            toast.error('Failed to fetch your groups');
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

    const filteredGroups = groups.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.purpose.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                        
                        <div className="flex items-center p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <div className="w-5 h-5 mr-3">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                </svg>
                            </div>
                            <span className="font-medium">Your Ajo groups</span>
                        </div>
                        
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

                {/* Content */}
                <div className="flex-1 p-8 bg-gray-50">
                    {/* Search Bar */}
                    <div className="mb-6">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white"
                            />
                        </div>
                    </div>

                    {/* Groups List */}
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
                        </div>
                    ) : filteredGroups.length > 0 ? (
                        <div className="space-y-4">
                            {filteredGroups.map((group) => (
                                <div key={group.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <img src="/suiflow.png" className="w-12 h-12 mr-4" alt="Group Logo" />
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                                                <p className="text-gray-600 text-sm">{group.purpose}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => router.push(`/ajo-groups/${group.id}`)}
                                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md font-medium transition-colors"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No groups found</h3>
                            <p className="text-gray-600 mb-6">
                                {searchTerm ? 'No groups match your search.' : "You haven't joined any Ajo groups yet."}
                            </p>
                            <button 
                                onClick={() => router.push('/create-pool')}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md font-medium"
                            >
                                Create Your First Group
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
