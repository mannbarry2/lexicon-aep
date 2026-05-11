import { ReactNode } from "react";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

export const AuthProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

export const useAuth = () => {
  const fb = useFirebaseAuth();
  return {
    user: fb.currentUser,
    isAdmin: fb.isAdmin,
    isLoading: fb.isLoading,
    signIn: fb.googleSignIn,
    signOut: fb.logOut,
  };
};
