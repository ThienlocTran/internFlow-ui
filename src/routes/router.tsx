import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { AttendancePage } from "@/pages/AttendancePage";
import { SchedulePage } from "@/pages/SchedulePage";
import { TeamPage } from "@/pages/TeamPage";
import { AdminPage } from "@/pages/AdminPage";
import { ReportsPage } from "@/pages/ReportsPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/attendance", element: <AttendancePage /> },
          { path: "/schedule", element: <SchedulePage /> },
          { path: "/team", element: <TeamPage /> },
          { path: "/admin", element: <AdminPage /> },
          { path: "/reports", element: <ReportsPage /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
