// ✅ Navbar.tsx
import { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";
import NotificationsAPI from "@/api/notifications.api";

export const Navbar = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => NotificationsAPI.getAll(),
    enabled: !!isAuthenticated, // Only fetch if authenticated
  });

  const unreadCount = data?.unreadCount || (Array.isArray(data?.data) ? data.data.filter((n: any) => !n.read).length : 0);

  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
      </div>

      <div className="flex items-center gap-4">



        {/* Bell */}
        <Button variant="ghost" size="sm" className="relative" onClick={() => navigate("/notifications")}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        {/* User Info + Dropdown */}
        <div
          className="relative"
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          <div className="flex items-center gap-3 pr-5 py-2 cursor-pointer">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium">
                {user?.name || "User"}
              </span>
              <span className="text-xs text-gray-800">{user?.role}</span>
            </div>
          </div>


        </div>
      </div>
    </header>
  );
};
