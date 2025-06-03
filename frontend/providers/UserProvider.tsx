"use client";

import { useState, useEffect, createContext, ReactNode } from "react";

// Define the User type
interface User {
  wallet_address: string,
  user: {
    id: Number,
    username: string,
    email: string
  }
}

// Default user object
const DEFAULT_USER: User = {
 wallet_address: "",
 user: {
  id: 0,
  username: "",
  email: "",
 }
};

// Define the context type
type UserContextType = [User, (data: User) => void] | null;

// Create context with proper typing
const UserContext = createContext<UserContextType>(null);

// Define props interface for the provider
interface UserProviderProps {
  children: ReactNode;
}

export default function UserProvider({ children }: UserProviderProps) {
  const [user, processUser] = useState<User>(DEFAULT_USER);
  const [loading, setLoading] = useState<boolean>(true);

  // Load user object from session
  useEffect(() => {
    const user_data = window.localStorage.getItem("user");
    
    if (user_data) {
      try {
        const parsedUser = JSON.parse(user_data) as User;
        setUser(parsedUser);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        // If parsing fails, set default user and clear invalid data
        window.localStorage.setItem('user', JSON.stringify(DEFAULT_USER));
        setUser(DEFAULT_USER);
      }
    } else {
      window.localStorage.setItem('user', JSON.stringify(DEFAULT_USER));
      setUser(DEFAULT_USER);
    }
    
    setLoading(false);
  }, []);

  const setUser = (data: User): void => {
    window.localStorage.setItem('user', JSON.stringify(data));
    processUser(data);
  };

  if (loading) {
    return <></>;
  }

  return (
    <UserContext.Provider value={[user, setUser]}>
      {children}
    </UserContext.Provider>
  );
}

export { UserContext, DEFAULT_USER };
export type { User, UserContextType };