import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  BookOpen, Tag, PlusCircle, Edit, Settings,
  Menu, X, LogOut, ShieldAlert, Image
} from "lucide-react";
import { FaGoogle } from "react-icons/fa";

export function Sidebar() {
  const [location] = useLocation();
  const { user, isAdmin, signIn, signOut } = useAuth();

  const navItems = [
    {
      name: "Browse Lexicon",
      href: "/categories",
      icon: Tag,
      active: location === "/categories" || location === "/",
      adminOnly: false,
      loginRequired: false,
    },
    {
      name: "Add Word",
      href: "/add-word",
      icon: PlusCircle,
      active: location === "/add-word",
      adminOnly: false,
      loginRequired: true,
    },
    {
      name: "Edit Meaning",
      href: "/edit-meaning",
      icon: Edit,
      active: location === "/edit-meaning",
      adminOnly: false,
      loginRequired: true,
    },
    {
      name: "Manage Categories",
      href: "/manage-categories",
      icon: Settings,
      active: location === "/manage-categories",
      adminOnly: true,
      loginRequired: true,
    },
    {
      name: "Image Management",
      href: "/images",
      icon: Image,
      active: location === "/images",
      adminOnly: true,
      loginRequired: true,
    },
    {
      name: "Admin Only",
      href: "/admin",
      icon: ShieldAlert,
      active: location === "/admin",
      adminOnly: true,
      loginRequired: true,
    },
  ].filter(
    (item) =>
      (!item.adminOnly || isAdmin) && (!item.loginRequired || !!user),
  );

  return (
    <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
      <div className="flex items-center justify-center h-16 flex-shrink-0 px-4 bg-primary">
        <h1 className="text-xl font-bold text-white">Adobe AEP Lexicon</h1>
      </div>
      <div className="flex flex-col flex-grow px-4 pt-5 pb-4 overflow-y-auto">
        <nav className="flex-1 space-y-1 bg-white">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.href}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-md group",
                item.active
                  ? "text-white bg-primary"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5",
                  item.active ? "text-white" : "text-gray-500"
                )}
              />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        {user ? (
          <div className="flex flex-col space-y-3">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {user.photoURL ? (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {user.displayName?.[0] || user.email?.[0] || "U"}
                  </div>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {user.displayName || user.email}
                </p>
                <p className="text-xs text-gray-500">
                  {isAdmin ? "Admin" : "User"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut()}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        ) : (
          <Button onClick={() => signIn()} className="w-full">
            <FaGoogle className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>
        )}
      </div>
    </div>
  );
}

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { user, isAdmin, signIn, signOut } = useAuth();

  const navItems = [
    {
      name: "Browse Lexicon",
      href: "/categories",
      icon: Tag,
      active: location === "/categories" || location === "/",
      adminOnly: false,
      loginRequired: false,
    },
    {
      name: "Add Word",
      href: "/add-word",
      icon: PlusCircle,
      active: location === "/add-word",
      adminOnly: false,
      loginRequired: true,
    },
    {
      name: "Edit Meaning",
      href: "/edit-meaning",
      icon: Edit,
      active: location === "/edit-meaning",
      adminOnly: false,
      loginRequired: true,
    },
    {
      name: "Manage Categories",
      href: "/manage-categories",
      icon: Settings,
      active: location === "/manage-categories",
      adminOnly: true,
      loginRequired: true,
    },
    {
      name: "Image Management",
      href: "/images",
      icon: Image,
      active: location === "/images",
      adminOnly: true,
      loginRequired: true,
    },
    {
      name: "Admin Only",
      href: "/admin",
      icon: ShieldAlert,
      active: location === "/admin",
      adminOnly: true,
      loginRequired: true,
    },
  ].filter(
    (item) =>
      (!item.adminOnly || isAdmin) && (!item.loginRequired || !!user),
  );

  return (
    <div className="sticky top-0 z-10 w-full">
      <div className="flex items-center justify-between h-16 bg-primary text-white px-4">
        <h1 className="text-xl font-bold">Adobe AEP Lexicon</h1>
        <div className="flex items-center gap-2">
          {!isOpen && !user && (
            <Button onClick={() => signIn()} variant="outline" size="sm">
              <FaGoogle className="mr-2 h-4 w-4" />
              Login
            </Button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-white p-1 rounded hover:bg-primary/90"
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="bg-white border-b border-gray-200 shadow-md">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "block px-3 py-2 text-base font-medium rounded-md",
                  item.active
                    ? "text-white bg-primary"
                    : "text-gray-700 hover:bg-gray-100"
                )}
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center">
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5",
                      item.active ? "text-white" : "text-gray-500"
                    )}
                  />
                  {item.name}
                </div>
              </Link>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-200">
            {user ? (
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  {user.photoURL ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {user.displayName?.[0] || user.email?.[0] || "U"}
                    </div>
                  )}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700">
                      {user.displayName || user.email}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              </div>
            ) : (
              <Button onClick={() => signIn()} className="w-full">
                <FaGoogle className="mr-2 h-4 w-4" />
                Sign in with Google
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
