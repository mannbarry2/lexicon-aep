import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth, onAuthChange, signInWithGoogle, logOut } from '@/lib/firebase';

// Define the context type
interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  googleSignIn: () => Promise<User | undefined>;
  logOut: () => Promise<void>;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isLoading: true,
  isAdmin: false,
  googleSignIn: async () => undefined,
  logOut: async () => {},
});

// Define the provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Whitelist of admin email addresses
const ADMIN_EMAILS = [
  'mannbarry2@gmail.com',
  // Add other admin emails as needed
];

// Create the provider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Determine if the user is an admin based on their email
  const isAdmin = !!currentUser?.email && ADMIN_EMAILS.includes(currentUser.email);

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
      setIsLoading(false);
      
      // Log user login to console (we'll add email functionality later if needed)
      if (user) {
        console.log(`User logged in: ${user.displayName} (${user.email})`);
      }
    });

    // Clean up subscription
    return unsubscribe;
  }, []);

  // Google sign in function
  const googleSignIn = async () => {
    try {
      return await signInWithGoogle();
    } catch (error) {
      console.error('Error in googleSignIn:', error);
      throw error;
    }
  };

  // Sign out function
  const handleLogOut = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Error in logOut:', error);
      throw error;
    }
  };

  // The context value
  const value = {
    currentUser,
    isLoading,
    isAdmin,
    googleSignIn,
    logOut: handleLogOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useFirebaseAuth = () => {
  return useContext(AuthContext);
};