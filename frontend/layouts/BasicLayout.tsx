import { clearTokens } from "@/utils/auth";
import {toast} from 'react-toastify';
import { useRouter } from "next/router";
import { ReactElement, ReactNode } from "react";

interface BasicLayoutProps {
    children: ReactNode;
}

export default function BasicLayout({ children }: BasicLayoutProps): ReactElement{

    const router = useRouter();

    const handleLogout = () => {
        clearTokens();
        localStorage.removeItem('userData');
        toast.success('Logged out successfully');
        router.push('/');
    };

    const handleCreatePool = () => {
        router.push('/create-pool');
    };

    return (<>

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
                        <div onClick={() => router.push('/home')} className="flex cursor-pointer items-center p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <div className="w-5 h-5 mr-3">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                </svg>
                            </div>
                            <span className="font-medium">Dashboard</span>
                        </div>

                        <div
                            onClick={() => router.push('/ajo-groups/')}
                            className="flex items-center p-3 text-gray-600 block w-full hover:bg-gray-50 rounded-lg cursor-pointer">
                            <div className="w-5 h-5 mr-3">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                </svg>
                            </div>
                            <span>Your groups</span>
                        </div>

                        <div onClick={() => router.push('/notifications')} className="flex items-center p-3 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer">
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

            {children}
        </div>
    </>)
}