'use client';
import { useCurrentAccount } from "@mysten/dapp-kit";
import { ConnectButton } from '@mysten/dapp-kit';
import { use, useEffect } from 'react';
import { useRouter } from "next/router";
import { useState } from "react";
import React from "react";
import { toast } from "react-toastify";
import { storeTokens, isAuthenticated } from "../utils/auth";
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import SocialAuth from "./components/socialauth";


export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();
  const account = useCurrentAccount();

  useEffect(() => {
    // Hide splash screen after 2 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);


  // Generate or get keypair for the user
  const getOrCreateKeypair = () => {
    const storedKeypair = localStorage.getItem('userKeypair');
    if (storedKeypair) {
      try {
        const keypairData = JSON.parse(storedKeypair);
        return Ed25519Keypair.fromSecretKey(new Uint8Array(keypairData.secretKey));
      } catch (error) {
        console.error('Error loading stored keypair:', error);
      }
    }

    // Generate new keypair if none exists
    const newKeypair = Ed25519Keypair.generate();
    const keypairData = {
      secretKey: Array.from(newKeypair.getSecretKey()),
      publicKey: newKeypair.getPublicKey().toBase64()
    };
    localStorage.setItem('userKeypair', JSON.stringify(keypairData));
    return newKeypair;
  };

  useEffect(() => {

  }, [router])

  const handleSignIn = async (e: React.MouseEvent<HTMLButtonElement> | React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Call the authentication API
      const response = await fetch(process.env.NEXT_PUBLIC_URL + '/auth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          toast.error(errorData.detail || 'Invalid email or password');
        } catch (e) {
          toast.error('Failed to sign in');
        }
        return;
      }

      const data = await response.json();

      // Store the authentication token
      storeTokens(data);


      // Successfully logged in
      toast.success('Sign in successful!');

      // Always redirect to home dashboard after successful authentication
      router.push('/home');
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error(error instanceof Error ? error.message : 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-blue-600 flex items-center justify-center z-50">
        <div className="animate-bounce">
          <img
            src="/suiflow.png"
            className="w-24 h-24 mx-auto"
            alt="Sui-Fund Logo"
          />
          <h1 className="text-3xl font-bold text-white text-center mt-4">
            Sui-Fund
          </h1>
          <p className="text-white text-center mt-2">
            Effortless Saving, Real Outcome
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
          style={{ backgroundImage: "url('/sui-waves.svg')" }}></div>
        <div className="relative z-10 text-white text-center">
          <div className="flex items-center justify-center">
            <img src="/suiflow.png" className="w-7 h-7 mr-2" alt="Sui-Fund Logo" />
            <h1 className="text-3xl font-bold">Sui-Fund</h1>
          </div>
          <p className="text-sm mt-1">Effortless Saving, Real Outcome.</p>
        </div>
      </div>

      {/* Left side with form */}
      <div className="w-full md:w-1/2 flex items-center justify-center py-6 px-5">
        <div className="w-full max-w-md">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center text-gray-800">
            Sign In to Sui-Fund
          </h2>

          <div className="w-full flex flex-col items-center justify-center space-y-6">
            {/* Google Sign In Button */}
            <SocialAuth />

            {/* Divider */}
            <div className="w-full max-w-sm">
              <div className="relative flex items-center justify-center mb-6">
                <div className="border-t border-gray-300 w-full"></div>
                <div className="bg-white px-4 text-sm text-gray-500">or</div>
                <div className="border-t border-gray-300 w-full"></div>
              </div>
            </div>

            {/* Email and Password Login Form */}
            <form onSubmit={handleSignIn} className="w-full max-w-sm space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="w-full max-w-sm">
              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  Don't have an account?{' '}
                  <a
                    href="/onboarding"
                    className="text-blue-500 hover:text-blue-700 font-medium transition-colors"
                  >
                    Sign Up
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side with background image and logo - hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 bg-blue-600 flex-col justify-center items-center relative">
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/sui-waves.svg')" }}></div>
        <div className="relative z-10 text-white text-center">
          <div className="flex items-center mb-4">
            <img src="/suiflow.png" className="w-8 h-8 mr-2" alt="Sui-Fund Logo" />
            <h1 className="text-4xl font-bold">Sui-Fund</h1>
          </div>
          <p className="text-xl">Effortless Saving, Real Outcome.</p>
        </div>
      </div>
    </div>
  );
}