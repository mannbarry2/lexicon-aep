import { ReactNode } from 'react';
import { Redirect, useLocation } from 'wouter';
import { useFirebaseAuth } from '@/hooks/use-firebase-auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { currentUser, isLoading, isAdmin } = useFirebaseAuth();
  const [, setLocation] = useLocation();

  // If still loading authentication state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not authenticated
  if (!currentUser) {
    // Save the current path to redirect back after login
    const currentPath = window.location.pathname;
    sessionStorage.setItem('redirectAfterLogin', currentPath);
    
    // Redirect to categories page with a message
    return <Redirect to="/categories" />;
  }

  // If route requires admin access but user is not an admin
  if (adminOnly && !isAdmin) {
    return <Redirect to="/categories" />;
  }

  // User is authenticated and has necessary permissions
  return <>{children}</>;
}