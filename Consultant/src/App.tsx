import { Helmet } from "react-helmet";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useSelector, useDispatch } from "react-redux";
import {
  loginSuccess,
  logout,
  loadUserFromStorage,
  AuthState,
} from "./features/auth/authSlice";
import type { RootState } from "./app/store";
import { Profiler, useEffect, useState } from "react";
import DashboardLayout from "./pages/Layout/DashboardLayout";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Consultant_Profile";
import ClientManagement from "./pages/ClientManagement";
import AnalyticsDashboard from "./pages/Analytics";
import NotificationsPage from "./pages/Notifications";
import ClientDetailPage from "./pages/ClientProfile";
import SettingsPage from "./pages/Settings";
import AppointmentManagement from "./pages/AppointmentManagement";
import AIOBHero from "./pages/Home";
import CompleteProfile from "./pages/CompleteProfile";
import AccountStatus from "./pages/AccountStatus";
import Signup from "./pages/Signup";
import MyConsultants from "./pages/MyConsultants";
import ConsultantPublicProfile from "./pages/ConsultantPublicProfile";
import ClientProfile from "./pages/ClientProfile";
import Consultant_ClientProfile from "./pages/Consultant_ClientProfile";
import ClientBookings from "./pages/ClientBookings";
import ClientDocuments from "./pages/ClientDocuments";
import ClientPayments from "./pages/ClientPayments";
import Consultants from "./pages/Consultants";

const queryClient = new QueryClient();

// Role-based route protection wrapper
const RoleRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles: string[] }) => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !allowedRoles.includes(user.role || "")) {
    // Redirect to dashboard if role not allowed
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const App = () => {

  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(
    (state: RootState) => (state.auth as AuthState).isAuthenticated
  );

  // Add state to track if we've checked for a stored user
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Load user from localStorage on app initialization
  useEffect(() => {
    dispatch(loadUserFromStorage());
    setIsAuthChecked(true);
  }, [dispatch]);

  if (!isAuthChecked) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Consultant</title>
      </Helmet>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<AIOBHero />} />
        <Route path="/consultants" element={<Consultants />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/account-status" element={<AccountStatus />} />


        {/* Routes with Layout */}
        <Route element={<DashboardLayout />}>
          {/* Shared Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/appointments" element={<AppointmentManagement />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Consultant Routes */}
          <Route path="/profile" element={
            <RoleRoute allowedRoles={['Consultant', 'Client']}>
              {user?.role === 'Consultant' ? <Profile /> : <ClientProfile />}
            </RoleRoute>
          } />
          <Route path="/clients" element={
            <RoleRoute allowedRoles={['Consultant']}>
              <ClientManagement />
            </RoleRoute>
          } />
          <Route path="/client-profile/:clientId" element={
            <RoleRoute allowedRoles={['Consultant']}>
              <Consultant_ClientProfile />
            </RoleRoute>
          } />
          <Route path="/analytics" element={
            <RoleRoute allowedRoles={['Consultant']}>
              <AnalyticsDashboard />
            </RoleRoute>
          } />

          {/* Client Routes */}
          <Route path="/my-consultants" element={
            <RoleRoute allowedRoles={['Client']}>
              <MyConsultants />
            </RoleRoute>
          } />
          <Route path="/my-bookings" element={
            <RoleRoute allowedRoles={['Client']}>
              <ClientBookings />
            </RoleRoute>
          } />
          <Route path="/my-documents" element={
            <RoleRoute allowedRoles={['Client']}>
              <ClientDocuments />
            </RoleRoute>
          } />
          <Route path="/my-payments" element={
            <RoleRoute allowedRoles={['Client']}>
              <ClientPayments />
            </RoleRoute>
          } />
          <Route path="/consultant/:id" element={
            <RoleRoute allowedRoles={['Client', 'Consultant', 'Admin']}>
              <ConsultantPublicProfile />
            </RoleRoute>
          } />

        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default App;