import { Helmet } from "react-helmet";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useSelector, useDispatch } from "react-redux";
import {
  loginSuccess,
  logout,
  loadUserFromStorage,
} from "./features/auth/authSlice";
import type { RootState } from "./app/store";
import { useEffect } from "react";
import DashboardLayout from "./pages/Layout/DashboardLayout";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import ConsultationCategories from "./pages/ConsultationTypes";
import ConsultationManagement from "./pages/Consultants";
import AppointmentManagement from "./pages/AppointmentManagement";
import AnalyticsDashboard from "./pages/Analytics";
import NotificationsPage from "./pages/Notifications";
import SettingsPage from "./pages/Settings";
import ClientDashboard from "./pages/ClientDashboard";
import ClientManagement from "./pages/ClientManagement";
import ConsultantDashboard from "./pages/ConsultantDashboard";
import ConsultationSubCategories from "./pages/ConsultationSubCategories";

const queryClient = new QueryClient();

import { Toaster } from "sonner";

const App = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  // Load user from localStorage on app initialization
  useEffect(() => {
    dispatch(loadUserFromStorage());
  }, [dispatch]);

  return (
    <>
      <Helmet>
        <title>Consultant-Admin</title>
      </Helmet>
      <Toaster position="top-center" richColors />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />

        {/* Routes with Layout */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/consultation-categories"
            element={<ConsultationCategories />}
          />
          <Route
            path="/consultation-sub-categories"
            element={<ConsultationSubCategories />}
          />
          <Route
            path="/consultants"
            element={<ConsultationManagement />}
          />
          <Route
            path="/consultant-subcategories"
            element={<ConsultationManagement />}
          />
          <Route
            path="/consultant-dashboard"
            element={<ConsultantDashboard />}
          />
          <Route
            path="/appointments"
            element={<AppointmentManagement />}
          />

          <Route path="/users" element={<UserManagement />} />
          <Route path="/clients" element={<ClientManagement />} />
          <Route path="/client-dashboard" element={<ClientDashboard />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default App;
