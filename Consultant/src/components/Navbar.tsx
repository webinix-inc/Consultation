// Navbar.tsx - Enhanced with NotificationBell component

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "@/components/NotificationBell";

export const Navbar = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell with Dropdown */}
        {isAuthenticated && <NotificationBell />}

        {/* User Info */}
        <div className="flex items-center gap-3 pr-5 py-2">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={(user as any)?.avatar || (user as any)?.image || (user as any)?.profileImage}
              alt={user?.name || "User"}
            />
            <AvatarFallback>{user?.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-left">
            <span className="text-sm font-medium">
              {user?.name || "User"}
            </span>
            <span className="text-xs text-gray-800">{user?.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
