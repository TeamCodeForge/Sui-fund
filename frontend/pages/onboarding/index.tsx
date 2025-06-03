import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import React from "react";
import { toast } from "react-toastify";
import { storeTokens } from "../../utils/auth";
import { useCurrentAccount, ConnectButton } from "@mysten/dapp-kit";

export default function Onboarding() {
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [registrationComplete, setRegistrationComplete] = useState(false);
    const router = useRouter();
   

    // When wallet is connected after registration, redirect to home
    useEffect(() => {
        if (registrationComplete) {
            router.push('/home');
        }
    }, [ registrationComplete, router]);

    const submit = async (e: React.MouseEvent<HTMLButtonElement> | React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!agreeToTerms) {
            toast.error('Please agree to the terms and policy');
            return;
        }

        setIsLoading(true);
        
        try {
            console.log('Attempting to register user...');
            
            // Call the registration API
            const response = await fetch(process.env.NEXT_PUBLIC_URL + '/auth/register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    password,
                    first_name: firstName,
                    last_name: lastName,
                    email
                })
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                // Specific handling for 406 status (user already exists)
                if (response.status === 406) {
                    throw new Error('A user with this email or username already exists. Please try logging in instead.');
                }
                
                // Get response as text first to safely check content type
                const errorText = await response.text();
                
                // Check if the response looks like HTML (indicating a server error page)
                if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
                    console.error('Server returned HTML instead of JSON');
                    if (response.status === 404) {
                        throw new Error('API endpoint not found. Please ensure the backend server is running.');
                    } else {
                        throw new Error(`Server error: ${response.status}`);
                    }
                }
                
                // Try to parse as JSON if it doesn't look like HTML
                try {
                    const errorData = JSON.parse(errorText);
                    // Check for field-specific errors
                    if (errorData.username) {
                        throw new Error(`Username: ${errorData.username.join(' ')}`);
                    }
                    if (errorData.email) {
                        throw new Error(`Email: ${errorData.email.join(' ')}`);
                    }
                    if (errorData.password) {
                        throw new Error(`Password: ${errorData.password.join(' ')}`);
                    }
                    throw new Error(errorData.detail || 'Registration failed');
                } catch (parseError) {
                    // If JSON parsing fails, throw a generic error with the status
                    if (parseError instanceof SyntaxError) {
                        throw new Error(`Server returned invalid response (${response.status})`);
                    }
                    // Otherwise, rethrow the error from the try block
                    throw parseError;
                }
            }
            
            // Process successful response
            let data;
            try {
                data = await response.json();
                console.log('Registration successful:', data);
            } catch (error) {
                console.error('Error parsing success response:', error);
                // Continue even if parsing fails - registration might still be successful
            }
            
            // Store auth token if provided with registration
            if (data && (data.token || data.access)) {
                storeTokens(data);
            }
            
            // Reset form fields
            setUsername('');
            setFirstName('');
            setLastName('');
            setEmail('');
            setPassword('');
            setAgreeToTerms(false);
            
            toast.success('Registration successful! Please connect your Sui wallet to continue.');
            setRegistrationComplete(true);
        } catch (error) {
            console.error('Registration error:', error);
            toast.error(error instanceof Error ? error.message : 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };
    
    const openTermsModal = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowTermsModal(true);
    };

    const closeTermsModal = () => {
        setShowTermsModal(false);
    };

    const acceptTerms = () => {
        setAgreeToTerms(true);
        setShowTermsModal(false);
    };
    
    // If registration is complete, show wallet connection screen
    if (registrationComplete) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
                    <img src="/suiflow.png" className="w-16 h-16 mx-auto mb-4" alt="Sui-Fund Logo" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Connect Your Wallet</h2>
                    <p className="text-gray-600 mb-8">
                        To complete your registration and access all features, please connect your Sui wallet.
                    </p>
                    <div className="flex justify-center mb-6">
                        <ConnectButton />
                    </div>
                    <p className="text-sm text-gray-500">
                        You'll be redirected to the home page once your wallet is connected.
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <div className='md:flex md:flex-row h-screen'>
            {/* Full width mobile banner */}
            <div className="md:hidden w-full bg-blue-600 py-6 px-4 flex flex-col justify-center items-center relative">
                <div className="absolute inset-0 bg-cover bg-center" 
                     style={{backgroundImage: "url('/sui-waves.svg')"}}></div>
                <div className="relative z-10 text-white text-center">
                    <div className="flex items-center justify-center">
                        <img src="/suiflow.png" className="w-7 h-7 mr-2" alt="Sui-Fund Logo" />
                        <h1 className="text-3xl font-bold">Sui-Fund</h1>
                    </div>
                    <p className="text-sm mt-1">Effortless Saving, Real Outcome.</p>
                </div>
            </div>

            {/* Left side with background image and logo - hidden on mobile */}
            <div className="hidden md:flex md:w-1/2 bg-blue-600 flex-col justify-center items-center relative">
                <div className="absolute inset-0 bg-cover bg-center" 
                     style={{backgroundImage: "url('/sui-waves.svg')"}}></div>
                <div className="relative z-10 text-white text-center">
                    <div className="flex items-center mb-4">
                        <img src="/suiflow.png" className="w-8 h-8 mr-2" alt="Sui-Fund Logo" />
                        <h1 className="text-4xl font-bold">Sui-Fund</h1>
                    </div>
                    <p className="text-xl">Effortless Saving, Real Outcome.</p>
                </div>
            </div>

            {/* Right side with form */}
            <div className="w-full md:w-1/2 flex items-center justify-center py-6 px-5">
                <div className="w-full max-w-md">
                    <h2 className="text-2xl md:text-3xl font-bold mb-1 flex justify-center">Sign Up to Sui-Fund</h2>
                    
                    <form onSubmit={submit} className="mb-6 mt-6">
                        <div className="mb-4">
                            <label className="block text-gray-700 mb-2 font-medium">Username</label>
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-md text-gray-700"
                                placeholder="Enter Username"
                                required
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-gray-700 mb-2 font-medium">First Name</label>
                                <input 
                                    type="text" 
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md text-gray-700"
                                    placeholder="First Name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-2 font-medium">Last Name</label>
                                <input 
                                    type="text" 
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md text-gray-700"
                                    placeholder="Last Name"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-gray-700 mb-2 font-medium">Email</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-md text-gray-700"
                                placeholder="example@gmail.com"
                                required
                            />
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-gray-700 mb-2 font-medium">Password</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-md text-gray-700"
                                placeholder="atleast 8 characters"
                                minLength={8}
                                required
                            />
                        </div>
                        
                        <div className="mb-6 flex items-center">
                            <input 
                                type="checkbox" 
                                id="terms" 
                                checked={agreeToTerms}
                                onChange={(e) => setAgreeToTerms(e.target.checked)}
                                className="h-5 w-5 border border-gray-300 rounded mr-3"
                                required
                            />
                            <label htmlFor="terms" className="text-gray-700">
                                I agree to the <a href="#" onClick={openTermsModal} className="text-blue-500 hover:text-blue-700 font-medium">Terms and Policy</a>
                            </label>
                        </div>
                        
                        <button 
                            type="submit"
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-md transition-colors shadow-sm font-medium"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing Up...' : 'Sign Up'}
                        </button>
                    </form>
                    
                    <div className="text-center">
                        <p className="text-gray-700">
                            Have an account? <a href="/" className="text-blue-500 hover:text-blue-700 font-medium">Sign In</a>
                        </p>
                    </div>
                </div>
            </div>

            {/* Terms and Conditions Modal */}
            {showTermsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                        <div className="p-6 pb-3 border-b border-gray-200 border-b-gray-200 shadow-lg">
                            <h3 className="text-xl font-bold text-gray-900 flex justify-center">Terms & Conditions</h3>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="prose max-w-none">
                                <p>These terms and conditions apply to the Sui-fund app (hereby referred to as "Application") for mobile devices that was created by Codeforge (hereby referred to as "Service Provider") as a Free service.</p>
                                <br/>
                                <p><strong>1.</strong> Upon downloading or utilizing the Application, you are automatically agreeing to the following terms. It is strongly advised that you thoroughly read and understand these terms prior to using the Application. Unauthorized copying, modification of the Application, any part of the Application, or our trademarks is strictly prohibited. Any attempts to extract the source code of the Application, translate the Application into other languages, or create derivative versions are not permitted. All trademarks, copyrights, database rights, and other intellectual property rights related to the Application remain the property of the Service Provider.</p>
                                <br />
                                <p><strong>2.</strong> The Service Provider is dedicated to ensuring that the Application is as beneficial and efficient as possible. As such, they reserve the right to modify the Application or charge for their services at any time and for any reason. The Service Provider assures you that any charges for the Application or its services will be clearly communicated to you.</p>
                                <br />
                                <p><strong>3.</strong> The Application stores and processes personal data that you have provided to the Service Provider in order to provide the Service. It is your responsibility to maintain the security of your phone and access to the Application. The Service Provider strongly advise against jailbreaking or rooting your phone, which involves removing software restrictions and limitations imposed by the official operating system of your device. Such actions could expose your phone to malware, viruses, malicious programs, compromise your phone's security features, and may result in the Application not functioning correctly or at all.</p>
                                <br />
                                <p><strong>4.</strong> Please be aware that the Service Provider does not assume responsibility for certain aspects. Some functions of the Application require an active internet connection, which can be Wi-Fi or provided by your mobile network provider. The Service Provider cannot be held responsible if the Application does not function at full capacity due to lack of access to Wi-Fi or if you have exhausted your data allowance.</p>
                                <br />
                                <p><strong>5.</strong> If you are using the application outside of a Wi-Fi area, please be aware that your mobile network provider's agreement terms still apply. Consequently, you may incur charges from your mobile provider for data usage during the connection to the application, or other third-party charges. By using the application, you accept responsibility for any such charges, including roaming data charges if you use the application outside of your home territory (i.e., region or country) without disabling data roaming. If you are not the bill payer for the device on which you are using the application, they assume that you have obtained permission from the bill payer.</p>
                                <br />
                                <p><strong>6.</strong> Similarly, the Service Provider cannot always assume responsibility for your usage of the application. For instance, it is your responsibility to ensure that your device remains charged. If your device runs out of battery and you are unable to access the Service, the Service Provider cannot be held responsible.</p>
                                <br />
                                <p><strong>7.</strong> In terms of the Service Provider's responsibility for your use of the application, it is important to note that while they strive to ensure that it is updated and accurate at all times, they do rely on third parties to provide information to them so that they can make it available to you. The Service Provider accepts no liability for any loss, direct or indirect, that you experience as a result of relying entirely on this functionality of the application.</p>
                                <br />
                                <p><strong>8.</strong> The Service Provider may wish to update the application at some point. The application is currently available as per the requirements for the operating system (and for any additional systems they decide to extend the availability of the application to) may change, and you will need to download the updates if you want to continue using the application. The Service Provider does not guarantee that it will always update the application so that it is relevant to you and/or compatible with the particular operating system version installed on your device. However, you agree to always accept updates to the application when offered to you. The Service Provider may also wish to cease providing the application and may terminate its use at any time without providing termination notice to you. Unless they inform you otherwise, upon any termination: 
                                <br />
                                (a) the rights and licenses granted to you in these terms will end 
                                <br />
                                (b) you must cease using the application, and (if necessary) delete it from your device.</p>
                                <h4 className="font-bold mt-4">Changes to These Terms and Conditions</h4>
                                <p>The Service Provider may periodically update their Terms and Conditions. Therefore, you are advised to review this page regularly for any changes. The Service Provider will notify you of any changes by posting the new Terms and Conditions on this page.</p>
                                
                                <p>These terms and conditions are effective as of 2025-05-30</p>
                                
                                <h4 className="font-bold mt-4">Contact Us</h4>
                                <p>If you have any questions or suggestions about the Terms and Conditions, please do not hesitate to contact the Service Provider at University of port-harcourt.</p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={closeTermsModal}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={acceptTerms}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}