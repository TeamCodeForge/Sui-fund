import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { isAuthenticated, clearTokens } from '../utils/auth';

interface Notification {
    id: number;
    type: 'invite' | 'contribution' | 'payout' | 'cycle' | 'system';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
}

export default function Notifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/');
            return;
        }
        
        // Mock notification data matching the design
        const mockNotifications: Notification[] = [
            {
                id: 1,
                type: 'invite',
                title: 'Invite!',
                message: "You've been invited to join a Trusted circle.",
                timestamp: '1m Ago',
                read: false
            }
        ];
        setNotifications(mockNotifications);
    }, [router]);

    const handleLogout = () => {
        clearTokens();
        localStorage.removeItem('userData');
        localStorage.removeItem('userKeypair');
        toast.success('Logged out successfully');
        router.push('/');
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
                        <button onClick={() => router.push('/home')} className="flex items-center p-3 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer w-full">
                            <div className="w-5 h-5 mr-3">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                </svg>
                            </div>
                            <span>Dashboard</span>
                        </button>
                        
                        <button onClick={() => router.push('/ajo-groups')} className="flex items-center p-3 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer w-full">
                            <div className="w-5 h-5 mr-3">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                </svg>
                            </div>
                            <span>Your Ajo groups</span>
                        </button>
                        
                        <div className="flex items-center p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <div className="w-5 h-5 mr-3">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span className="font-medium text-blue-600">Notifications</span>
                        </div>
                    </div>
                    
                    <div className="mt-8 pt-4 border-t border-gray-200">
                        <button 
                            onClick={() => router.push('/create-pool')}
                            className="flex items-center w-full p-3 text-gray-600 hover:bg-gray-50 rounded-lg"
                        >
                            <div className="w-5 h-5 mr-3">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <span>Create Pool</span>
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
            <div className="flex-1 flex flex-col bg-white">
                {/* Header */}
                <div className="border-b border-gray-200 px-8 py-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-blue-600">Notifications</h2>
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
                                            {notification.title}
                                        </h4>
                                        {!notification.read && (
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        )}
                                    </div>
                                    <p className="text-gray-600 mt-1">{notification.message}</p>
                                </div>
                                
                                {/* Timestamp */}
                                <div className="flex-shrink-0 text-sm text-gray-500">
                                    {notification.timestamp}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
