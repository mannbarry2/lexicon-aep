import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { onAuthChange, signInWithGoogle, signOutUser, handleRedirectResult } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Create a mock admin user object
  const mockAdminUser = {
    uid: "admin-user-1",
    email: "admin@example.com",
    displayName: "Admin User",
    photoURL: null,
    isAnonymous: false,
    emailVerified: true,
    getIdToken: async () => "mock-token",
  } as User;

  // Always set user to admin and not loading
  const [user, setUser] = useState<User | null>(mockAdminUser);
  const [isLoading, setIsLoading] = useState(false);

  // Always admin
  const isAdmin = true;

  // No-op sign in function
  const signIn = async () => {
    console.log("Sign in clicked - No authentication required");
    // Already signed in as admin
  };

  // No-op sign out function
  const signOut = async () => {
    console.log("Sign out clicked - No authentication required");
    // Stay signed in as admin
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
