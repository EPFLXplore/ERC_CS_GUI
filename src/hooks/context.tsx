// src/contexts/UserContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Connection } from "../data/ssh.type"

// Define a User interface
interface User {
  username: string;
  password: string;
}

// Define a Context interface
interface UserContextType {
  user: User | null;
  status: string[];
  addStatus: (newStatus: string) => void;
  removeStatus: (statusToRemove: string) => void;
  logout: () => void;
}

// Create a context with an initial type
const UserContext = createContext<UserContextType | undefined>(undefined);

// Custom hook to access UserContext
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Helper function to generate random strings
const generateRandomString = (length: number) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Define UserProviderProps for children
interface UserProviderProps {
  children: ReactNode;
}

// UserProvider component
export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<string[]>([]);

  useEffect(() => {
    // Check for existing user session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // Create a new user if no session found
      const randomUsername = `user_${generateRandomString(6)}`;
      const randomPassword = generateRandomString(10);
      const newUser = { username: randomUsername, password: randomPassword };

      // Set new user session
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));

       // Retrieve status from localStorage
      const storedStatus = localStorage.getItem('status');
      if (storedStatus) {
        setStatus(JSON.parse(storedStatus));
      }
    }
  }, []);

  const addStatus = (newStatus: string) => {
    const updatedStatuses = [...status, newStatus];
    setStatus(updatedStatuses);
    localStorage.setItem('status', JSON.stringify(updatedStatuses));
  };

  const removeStatus = (statusToRemove: string) => {
    const updatedStatuses = status.filter(stat => stat !== statusToRemove);
    setStatus(updatedStatuses);
    localStorage.setItem('status', JSON.stringify(updatedStatuses));
  };

  const logout = () => {
    setUser(null);
    setStatus([]);
    localStorage.removeItem('user');
    localStorage.removeItem('status');
  };

  return (
    <UserContext.Provider value={{ user, status, addStatus, removeStatus, logout }}>
      {children}
    </UserContext.Provider>
  );
};
