import { NavLink, useNavigate } from "react-router-dom";
import {
  FaUserTie,
  FaBriefcase,
  FaFileAlt,
  FaChartPie,
  FaChartLine,
  FaCommentDots,
  FaClipboardList,
  FaLayerGroup,
  FaSignOutAlt,
  FaUsers,
  FaCalendarAlt,
  FaBell,
  FaUserMd,
  FaUserCircle,
  FaRupeeSign
} from "react-icons/fa";
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

const consultantItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: FaChartPie,
  },
  {
    title: "Clients",
    url: "/clients",
    icon: FaUsers,
  },
  {
    title: "Appointments",
    url: "/appointments",
    icon: FaCalendarAlt,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: FaChartLine,
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: FaBell,
  },
];

const clientItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: FaChartPie,
  },
  {
    title: "My Bookings",
    url: "/my-bookings",
    icon: FaCalendarAlt,
  },
  {
    title: "My Documents",
    url: "/my-documents",
    icon: FaFileAlt,
  },
  {
    title: "Payments",
    url: "/my-payments",
    icon: FaRupeeSign,
  },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const userFromRedux = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();

  // Get user data (prefer Redux state over useAuth hook)
  const currentUser = userFromRedux || user;
  const userRole = currentUser?.role;

  // Select items based on role
  const navigationItems = userRole === "Client" ? clientItems : consultantItems;

  // Handle logo click - navigate to public home page
  const handleLogoClick = () => {
    navigate("/");
  };

  return (
    <Sidebar>
      <SidebarContent className="bg-[#0f1e3e] text-white h-screen border-r border-[#1f2f4a] shadow-md">
        {/* Logo and Title */}
        <div className="p-4 border-b border-[#1f2f4a] mb-2">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleLogoClick}
          >
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

        {/* Bottom Actions: Profile & Logout */}
        <div className="mt-auto p-4 border-t border-[#1f2f4a] flex flex-col gap-2">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-md transition-colors duration-200 ${isActive
                ? "bg-gray-700 bg-opacity-20 text-white"
                : "text-white/80 hover:bg-gray-700"
              }`
            }
          >
            <FaUserCircle className="text-lg" />
            <span className="text-sm">Profile</span>
          </NavLink>

          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-2 rounded-md text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors duration-200 w-full text-left"
          >
            <FaSignOutAlt className="text-lg" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
