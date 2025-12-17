import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Navbar } from "@/components/Navbar";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "react-hot-toast";

const DashboardLayout = () => {
  const { isAuthenticated } = useAuth();

  return (
    <SidebarProvider>
      <Toaster position="top-right" />
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />

        <div className="flex flex-col flex-1 min-w-0">
          <Navbar />
          <main className="flex-1 overflow-auto p-4">
            {/* Temporarily disable auth check for testing */}
            <Outlet />
            {/* {isAuthenticated ? <Outlet /> : <Navigate to="/" replace />} */}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
