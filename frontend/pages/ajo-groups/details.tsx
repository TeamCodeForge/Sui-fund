import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { getCycleSummary, getContributionStatus } from '@/tools/suiutiles';
import { isAuthenticated, clearTokens } from '../../utils/auth';
import { SuiSavingsGroupClient } from '@/tools/suichain';
import { UserContext } from '@/providers/UserProvider';
import makeRequest, { ResponseType } from '@/service/requester';
import { desc } from 'framer-motion/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import GroupDetailsSkeleton, { GroupDetailsDashboard, GroupDetailsMembers } from './components/Loading';


import { ReactNode, ReactElement } from 'react';
import BasicLayout from '@/layouts/BasicLayout';


interface Member {
    id: number;
    user: {
        username: string;
        title: string;
        email: string;
    };

    avatar: string;
    wallet_address: string;
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

}

interface Participant {
    wallet_address: string
}

export default function GroupDetails() {
    const [loadingDashboard, setLoadingDashboard] = useState(true);
    const [loadingMembers, setLoadingMemebers] = useState(true);
    const [contributing, setsContributing] = useState(false);

    const [group, setGroup] = useState<GroupDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [participants, setParticipants] = useState<Member[]>([])
    

    const [groupname, setGroupName] = useState<string>('')
    const [contributionAmount, setContributionAmount] = useState<number>(0.00)
    const [description, setDescription] = useState("")
    const [cycle_duration_days, setCycleDurationDays] = useState<number>(0)
    const [totalContribution, setTotalContribution] = useState<number>(0)
    const [expectedTotal, setExpectedTotal] = useState<number>(0);

    const [contributed, setContributed] = useState<string[]>([]);
    const [nextRecipient, setNextRecipient] = useState<string>('0x0000000000000000000000000000000000000000000000000000000000000000');
    const [nextRecipentName, setNextRecipientName] = useState<string>('')

    const [allContributed, setAllContributed] = useState<Boolean>(false);
    const [cycleCount, setCycleCount] = useState<number>(0);
    const [startPayoutCycle, setStartPayoutCycle] = useState<number>(0)

    const router = useRouter();
    const { id } = router.query;

    const userContext = useContext(UserContext);
    // Now destructure from userContext with proper null checking
    if (!userContext) {
        throw new Error('Component must be used within a UserProvider');
    }

    const [user, setUser] = userContext;

    const packageId = process.env.NEXT_PUBLIC_MOVE_PACKAGE_ID;
    if (!packageId) {
        throw new Error('NEXT_PUBLIC_MOVE_PACKAGE_ID environment variable is required');
    }

    const client = new SuiSavingsGroupClient({
        packageId: packageId,
        network: 'testnet'
    })


    useEffect(() => {

        for (var i in participants) {
            console.log('running ...')
            if (participants[i].wallet_address === nextRecipient) {
                setNextRecipientName(participants[i].user.username)
                console.log('found the recipient');
                return;
            } else {
                setNextRecipientName('Pending ...')
            }
        }


    }, [nextRecipient, participants])

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/');
            return;
        }
        if (router.isReady) {
            if (id) {
                fetchGroupDetails(id as string);

                const link = router.query.link;
                if (link && typeof link === 'string') {
                    getCycleSummary(link).then(response => {
                        console.log(response);
                        setTotalContribution(response.contributionsReceived)
                        setExpectedTotal(response.totalExpected / 1_000_000_000)
                        setNextRecipient(response.nextRecipientAddress);
                        setAllContributed(response.allContributed);
                        setCycleCount(response.currentCycle)

                        getContributionStatus(link).then(response => {
                            console.log(response);
                            setContributed(response.contributors)
                        }).catch(error => {
                            console.error(error);
                        }).then(() => {
                            setLoadingDashboard(false);
                        })
                    });


                }




                makeRequest(process.env.NEXT_PUBLIC_URL + `/ajosavingsgroup/${id}`).then(response => {
                    if (response.type === ResponseType.SUCCESS) {
                        console.log(response);
                        let participants = response.payload['participants']
                        let updated_participants = []

                        for (var i in participants) {
                            let part = participants[i]
                            part.wallet_address = Ed25519Keypair.fromSecretKey(part.wallet_address).getPublicKey().toSuiAddress();
                            updated_participants.push(part);
                        }

                        setParticipants(updated_participants);
                        setGroupName(response.payload['name'])
                        setDescription(response.payload['description'])
                        setContributionAmount(parseFloat(response.payload['contribution_amount']))
                        setCycleDurationDays(response.payload['cycle_duration_days'])
                        setStartPayoutCycle(response.payload['start_cycle'])

                    }
                }).then(() => {
                    setIsLoading(false);
                    setLoadingMemebers(false);
                })
            }
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
                currentRecipient: nextRecipentName,
                founder: 'Nancy James',

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
                <div className="flex-1 p-1 md:p-8 bg-gray-50 overflow-y-auto">
                    {/* Group Header */}
                    {loadingDashboard ? <GroupDetailsDashboard /> : <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                            <h1 className="text-2xl font-bold text-gray-900">{groupname}</h1>
                            <svg
                                onClick={() => {
                                    window.open(`https://suiscan.xyz/testnet/tx/${router.query.digest}`)
                                }}
                                className="w-5 h-5 text-gray-600 hover:text-blue-600 cursor-pointer transition-colors"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                            </svg>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div><strong>Purpose:</strong> {description}</div>
                            <div><strong>Total Contribution (SUI):</strong> {totalContribution / 1_000_000_000}</div>
                            <div><strong>Cycle Duration (days):</strong> {cycle_duration_days}</div>
                            <div><strong>Members:</strong> {participants.length}</div>
                            <div><strong>Contribution Amount (SUI):</strong> {contributionAmount}</div>
                            <div><strong>Expected Total Amount (SUI):</strong> {expectedTotal}</div>
                            <div><strong>Cycle Count:</strong> {cycleCount}</div>
                            <div><strong>Current Recipient:</strong> {nextRecipentName}</div>

                        </div>

                        <div className='flex flex-col md:flex-row justify-between my-4 gap-2'>
                            <button
                                className={`relative ${contributing ? 'bg-gray-500' : 'bg-gradient-to-r from-emerald-500 to-teal-600'} inline-flex items-center justify-center px-8 py-4 text-sm font-semibold text-white  rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out border border-emerald-400/20 backdrop-blur-sm overflow-hidden group`}
                                onClick={() => {
                                    if(contributing){
                                        return;
                                    }

                                    
                                    const link = Array.isArray(router.query.link)
                                        ? router.query.link[0]
                                        : router.query.link;

                                    if (link) {
                                        console.log(contributionAmount);
                                        setsContributing(true)
                                        client.contribute(link, contributionAmount, user.wallet_address).then(response => {
                                            console.log(response);
                                            toast.info('Contribution Added')
                                            setsContributing(false);
                                            
                                        });
                                    }
                                }}
                            >
                                💰 Contribute
                            </button>

                            <button
                                className={`relative inline-flex items-center justify-center px-8 py-4 text-sm font-semibold rounded-xl shadow-lg transition-all duration-300 ease-out border ${allContributed && nextRecipient !== '0x0000000000000000000000000000000000000000000000000000000000000000'
                                    ? 'text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:shadow-xl transform hover:scale-105 border-purple-400/20 backdrop-blur-sm'
                                    : allContributed
                                        ? 'text-white bg-gradient-to-r from-green-500 to-teal-600 hover:shadow-xl transform hover:scale-105 border-green-400/20 backdrop-blur-sm'
                                        : 'text-gray-400 bg-gray-200 cursor-not-allowed border-gray-300'
                                    }`}
                                onClick={() => {
                                    if (!allContributed) return;

                                    const link = Array.isArray(router.query.link)
                                        ? router.query.link[0]
                                        : router.query.link;

                                    if (link) {
                                        if (nextRecipient !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                                            // Sign Payout logic

                                        } else {
                                            // Start New Cycle logic
                                            client.startNewCycle(link, user.wallet_address).then(response => {
                                                console.log(response);
                                            }).then(()=> {
                                                router.reload();
                                            })
                                        }
                                    }
                                }}
                                disabled={!allContributed}
                            >
                                {!allContributed
                                    ? 'Waiting for all contributions'
                                    : nextRecipient !== '0x0000000000000000000000000000000000000000000000000000000000000000'
                                        ? '✍️ Sign Payout'
                                        : '🔄 Start New Cycle'
                                }
                            </button>

                        </div>

                    </div>}



                    {/* Members Section */}
                    {loadingDashboard ? <GroupDetailsMembers /> : <div className="bg-white rounded-lg p-6 mb-4 shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 border-b-2 border-blue-500 pb-2 inline-block">
                            Members Contributed
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {participants.map((member) => {

                                console.log(member);

                                for (var i in contributed) {
                                    if (member.wallet_address === contributed[i]) {
                                        return (
                                            <div key={member.id} className="flex items-center bg-blue-500 text-white p-4 rounded-lg">
                                                <div className="w-16 h-16 bg-gray-300 rounded-full mr-4 overflow-hidden">
                                                    <div className="w-full h-full bg-blue-400 flex items-center justify-center">
                                                        <span className="text-white font-bold text-lg">
                                                            {member.user.username.split(' ').map(n => n[0]).join('')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-lg">Name: {member.user.username}</h3>

                                                    <p className="text-blue-100">email: {member.user.email}</p>
                                                </div>
                                            </div>
                                        )
                                    }

                                }
                            })}
                        </div>
                    </div>}

                    {/* Members Section */}
                    {loadingMembers ? <GroupDetailsMembers /> : <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 border-b-2 border-blue-500 pb-2 inline-block">
                            Members Details
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {participants.map((member) => (
                                <div key={member.id} className="flex md:items-center bg-blue-500 text-white p-4 rounded-lg">
                                    <div className="hidden md:block w-16 h-16 bg-gray-300 rounded-full mr-4 overflow-hidden">
                                        <div className="w-full h-full bg-blue-400 flex items-center justify-center">
                                            <span className="text-white font-bold text-lg">
                                                {member.user.username.split(' ').map(n => n[0]).join('')}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold lg:text-lg">Name: {member.user.username}</h3>
                                        <p className="text-blue-100">email: {member.user.email}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>}
                </div>
            </div>
        </>
    );
}

GroupDetails.getLayout = function (page: ReactNode): ReactElement {
    return (<BasicLayout>{page}</BasicLayout>)
}
