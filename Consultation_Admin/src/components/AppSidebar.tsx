import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  UserCog,
  Layers,
  Users,
  Briefcase,
  CalendarCheck,
  BarChart3,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Logo from "@/assets/images/logo.jpg";
import { useAuth } from "@/hooks/useAuth";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    url: "/users",
    icon: UserCog,
  },
  {
    title: "Consultation Types",
    url: "/consultation-categories",
    icon: Layers,
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Users,
  },
  {
    title: "Consultants",
    url: "/consultants",
    icon: Briefcase,
  },
  {
    title: "Appointments",
    url: "/appointments",
    icon: CalendarCheck,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const userFromRedux = useSelector((state: RootState) => state.auth.user);

  // Get user data (prefer Redux state over useAuth hook)
  const currentUser = userFromRedux || user;
  const userRole = currentUser?.role;




  return (
    <Sidebar>
      <SidebarContent className="bg-[#0f1e3e] text-white h-screen border-r border-[#1f2f4a] shadow-md">
        {/* Logo and Title */}
        <div className="p-4 border-b border-[#1f2f4a] mb-2">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="logo" className="h-8 w-auto object-contain" />
            <span className="font-bold text-white text-lg">AIOB</span>
          </div>
        </div>

        {/* User Role Badge */}
        {currentUser && (
          <div className="px-4 pb-2">
            <div className="text-xs text-white/60 mb-1 gap-1 flex items-center">
              <span>Logged in as:</span>
              <span
                className={`text-xs px-2  rounded-lg ${userRole === "Admin"
                  ? "bg-green-600 text-white"
                  : "bg-blue-600 text-white"
                  }`}
              >
                {userRole}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/80 truncate">
                {currentUser.name}
              </span>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2 rounded-md transition-colors duration-200 ${isActive
                          ? "bg-gray-700 bg-opacity-20 text-white"
                          : "text-white/80 hover:bg-gray-700"
                        }`
                      }
                    >
                      <item.icon className="text-lg" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Actions: Logout */}
        <div className="mt-auto p-4 border-t border-[#1f2f4a] flex flex-col gap-2">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-2 rounded-md text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors duration-200 w-full text-left"
          >
            <LogOut className="text-lg" />
            <span className="text-sm">Logout</span>
          </button>
        </div>


      </SidebarContent>
    </Sidebar>
  );
}
