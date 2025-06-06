import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { isAuthenticated, clearTokens } from '../utils/auth';
import { ReactNode, ReactElement } from 'react';
import BasicLayout from '@/layouts/BasicLayout';
import { useContext } from 'react';
import { UserContext } from '@/providers/UserProvider';
import makeRequest from '@/service/requester';


interface Notification {
    id: number;
    message: string;
}

export default function Notifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
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

        makeRequest(process.env.NEXT_PUBLIC_URL + '/ajonotifications').then(response => {
            console.log(response);
            setNotifications(response.payload);
        }).catch(error => {
            console.error(error);
        })

    }, [router]);

    const handleLogout = () => {
        clearTokens();
        localStorage.removeItem('userData');
        localStorage.removeItem('userKeypair');
        toast.success('Logged out successfully');
        router.push('/');
    };

    return (
        <>
            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-white">
                {/* Header */}
                <div className="border-b border-gray-200 px-8 py-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-blue-600">Notifications</h2>
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
                <div className="flex-1 px-8 py-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-6">Today</h3>
                    
                    <div className="space-y-4">
                        {notifications.map(notification => (
                            <div key={notification.id} className="flex items-start space-x-4 py-4">
                                {/* Logo/Icon */}
                                <div className="flex-shrink-0">
                                    <img src="/suiflow.png" className="w-10 h-10" alt="Sui-Fund Logo" />
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                        <h4 className="text-lg font-medium text-gray-900">
                                            Alert
                                        </h4>

                                    </div>
                                    <p className="text-gray-600 mt-1">{notification.message}</p>
                                </div>
                                
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}



Notifications.getLayout = function(page: ReactNode) : ReactElement{
    return (<BasicLayout>{page}</BasicLayout>)
}