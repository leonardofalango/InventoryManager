import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { ProductUploadPage } from "../features/products/pages/ProductUploadPage";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { InventoryListPage } from "../features/inventory/pages/InventoryListPage";
import { TeamPage } from "../features/team/pages/TeamPage";
import { StockUploadPage } from "../features/stock/pages/StockUploadPage";
import { ScanPage } from "../features/scan/pages/ScanPage";
import { useAuthStore } from "../store/authStore";
import type { JSX } from "react";
import type { Role } from "../types";

const RoleProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: JSX.Element;
  allowedRoles: Role[];
}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === "COUNTER") return <Navigate to="/scan" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RoleProtectedRoute allowedRoles={["ADMIN", "MANAGER", "COUNTER"]}>
        <AppLayout />
      </RoleProtectedRoute>
    ),
    children: [
      {
        path: "/",
        element: (
          <RoleProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <DashboardPage />
          </RoleProtectedRoute>
        ),
      },
      {
        path: "/inventory",
        element: (
          <RoleProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <InventoryListPage />
          </RoleProtectedRoute>
        ),
      },
      {
        path: "/products",
        element: (
          <RoleProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <ProductUploadPage />
          </RoleProtectedRoute>
        ),
      },
      {
        path: "/team",
        element: (
          <RoleProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <TeamPage />
          </RoleProtectedRoute>
        ),
      },
      {
        path: "/stock",
        element: (
          <RoleProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <StockUploadPage />
          </RoleProtectedRoute>
        ),
      },
      {
        path: "/scan",
        element: (
          <RoleProtectedRoute allowedRoles={["ADMIN", "COUNTER"]}>
            <ScanPage />
          </RoleProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
]);
