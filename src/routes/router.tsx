import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { RoleRoute } from "@/routes/RoleRoute";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { AttendancePage } from "@/pages/AttendancePage";
import { SchedulePage } from "@/pages/SchedulePage";
import { TeamPage } from "@/pages/TeamPage";
import { AdminPage } from "@/pages/AdminPage";
import { AdminShiftPage } from "@/pages/AdminShiftPage";
import { AdminStudentDetailPage } from "@/pages/AdminStudentDetailPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { JournalPage } from "@/pages/JournalPage";
import { JournalReviewPage } from "@/pages/JournalReviewPage";

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
          { path: "/journal", element: <JournalPage /> },
          { path: "/journal/review", element: <JournalReviewPage /> },
          {
            element: <RoleRoute allow={["TEAM_LEADER", "ADMIN", "MANAGER"]} />,
            children: [{ path: "/team", element: <TeamPage /> }],
          },
          {
            element: <RoleRoute allow={["ADMIN", "MANAGER"]} />,
            children: [
              { path: "/admin", element: <AdminPage /> },
              { path: "/admin/students/:studentId", element: <AdminStudentDetailPage /> },
              { path: "/reports", element: <ReportsPage /> },
            ],
          },
          {
            element: <RoleRoute allow={["ADMIN"]} />,
            children: [{ path: "/admin/shifts", element: <AdminShiftPage /> }],
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
