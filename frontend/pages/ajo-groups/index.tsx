import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { isAuthenticated, clearTokens } from '../../utils/auth';
import makeRequest, {ResponseType} from '@/service/requester';
import { ReactNode, ReactElement } from 'react';
import BasicLayout from '@/layouts/BasicLayout';
import { UserContext } from '@/providers/UserProvider';
import { useContext } from 'react';

interface AjoGroup {
    id: string;
    name: string;
    description: string;
    participants_count: number;
    cycle_duration_days: string;
    contribution_amount: number;
    active: string;
    address_link: string;
    digest: string;
}

export default function AjoGroups() {
    const [groups, setGroups] = useState<AjoGroup[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    
    const userContext = useContext(UserContext);
    // Now destructure from userContext with proper null checking
    if (!userContext) {
        throw new Error('Component must be used within a UserProvider');
    }

    const [user, setUser] = userContext;

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
            

            makeRequest(process.env.NEXT_PUBLIC_URL + '/ajosavingsgroup/').then(response => {
                if(response.type === ResponseType.SUCCESS){
                    console.log(response);
                    setGroups(response.payload.results);
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

    const handleLogout = () => {
        clearTokens();
        localStorage.removeItem('userData');
        localStorage.removeItem('userKeypair');
        toast.success('Logged out successfully');
        router.push('/');
    };

    const filteredGroups = groups.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        
           <>
            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-8 py-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-blue-600">Your groups</h2>
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
                                    <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                                        <div className="flex items-center">
                                            <img src="/suiflow.png" className="w-12 h-12 mr-4" alt="Group Logo" />
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                                                <p className="text-gray-600 text-sm">{group.description}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => router.push(`/ajo-groups/details?digest=${group.digest}&id=${group.id}&link=${group.address_link}`)}
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
                                {searchTerm ? 'No groups match your search.' : "You haven't joined any groups yet."}
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
        </>
    );
}


AjoGroups.getLayout = function(page: ReactNode) : ReactElement{
    return (<BasicLayout>{page}</BasicLayout>)
}