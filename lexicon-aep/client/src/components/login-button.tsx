import { useState } from 'react';
import { useFirebaseAuth } from '@/hooks/use-firebase-auth';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocation } from 'wouter';

export function LoginButton() {
  const { currentUser, isLoading, isAdmin, googleSignIn, logOut } = useFirebaseAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [, setLocation] = useLocation();

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await googleSignIn();
    } catch (error) {
      console.error('Error signing in:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await logOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  // Handle navigation to admin page
  const goToAdmin = () => {
    setLocation('/admin');
  };

  // If still loading auth state
  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    );
  }

  // If user is logged in
  if (currentUser) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-1 p-0 md:p-2">
            <Avatar className="h-7 w-7 md:h-8 md:w-8">
              <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'User'} />
              <AvatarFallback>
                {currentUser.displayName?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:inline-block max-w-[120px] truncate">
              {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Profile</DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem onClick={goToAdmin}>
              Admin Dashboard
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Signing out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // If not logged in
  return (
    <Button 
      size="sm" 
      className="bg-[#0E76A8] text-white hover:bg-[#0E76A8]/90 border-0"
      onClick={handleSignIn} 
      disabled={isSigningIn}
    >
      {isSigningIn ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin md:mr-2" />
          <span className="hidden md:inline-block">Signing in...</span>
        </>
      ) : (
        <>
          <LogIn className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline-block">Sign in</span>
        </>
      )}
    </Button>
  );
}