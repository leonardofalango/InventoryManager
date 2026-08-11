import { createHashRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { useAuthStore } from "../store/authStore";
import { lazy, Suspense, type JSX } from "react";
import type { Role } from "../types";

const ProductUploadPage = lazy(() =>
  import("../features/products/pages/ProductUploadPage").then((module) => ({
    default: module.ProductUploadPage,
  })),
);
const LoginPage = lazy(() =>
  import("../features/auth/pages/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const DashboardPage = lazy(() =>
  import("../features/dashboard/pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const InventoryListPage = lazy(() =>
  import("../features/inventory/pages/InventoryListPage").then((module) => ({
    default: module.InventoryListPage,
  })),
);
const TeamPage = lazy(() =>
  import("../features/team/pages/TeamPage").then((module) => ({
    default: module.TeamPage,
  })),
);
const StockUploadPage = lazy(() =>
  import("../features/stock/pages/StockUploadPage").then((module) => ({
    default: module.StockUploadPage,
  })),
);
const ScanPage = lazy(() =>
  import("../features/scan/pages/ScanPage").then((module) => ({
    default: module.ScanPage,
  })),
);
const RecoveryPage = lazy(() =>
  import("../features/auth/pages/RecoveryPage").then((module) => ({
    default: module.RecoveryPage,
  })),
);
const ChangePasswordPage = lazy(() =>
  import("../features/auth/pages/ChangePassword").then((module) => ({
    default: module.ChangePasswordPage,
  })),
);
const LabelManagementPage = lazy(() =>
  import("../features/label/pages/LabelManagementPage").then((module) => ({
    default: module.LabelManagementPage,
  })),
);
const AdminLogsPage = lazy(() =>
  import("../features/dashboard/pages/Logs").then((module) => ({
    default: module.AdminLogsPage,
  })),
);
const EanManagementPage = lazy(() =>
  import("../features/ean/pages/EanManagementPage").then((module) => ({
    default: module.EanManagementPage,
  })),
);

const RouteFallback = () => (
  <div className="flex min-h-[240px] items-center justify-center text-textSecondary">
    Carregando...
  </div>
);

const withSuspense = (children: JSX.Element) => (
  <Suspense fallback={<RouteFallback />}>{children}</Suspense>
);

const protectedElement = (children: JSX.Element, allowedRoles: Role[]) => (
  <RoleProtectedRoute allowedRoles={allowedRoles}>
    {withSuspense(children)}
  </RoleProtectedRoute>
);

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

export const router = createHashRouter([
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
        element: protectedElement(<DashboardPage />, ["ADMIN", "MANAGER"]),
      },
      {
        path: "/logs",
        element: protectedElement(<AdminLogsPage />, ["ADMIN"]),
      },
      {
        path: "/inventory",
        element: protectedElement(<InventoryListPage />, ["ADMIN", "MANAGER"]),
      },
      {
        path: "/label",
        element: protectedElement(<LabelManagementPage />, ["ADMIN", "MANAGER"]),
      },
      {
        path: "/ean-management",
        element: protectedElement(<EanManagementPage />, ["ADMIN", "MANAGER"]),
      },
      {
        path: "/products",
        element: protectedElement(<ProductUploadPage />, ["ADMIN", "MANAGER"]),
      },
      {
        path: "/team",
        element: protectedElement(<TeamPage />, ["ADMIN", "MANAGER"]),
      },
      {
        path: "/stock",
        element: protectedElement(<StockUploadPage />, ["ADMIN", "MANAGER"]),
      },
      {
        path: "/scan",
        element: protectedElement(<ScanPage />, ["ADMIN", "COUNTER"]),
      },
    ],
  },
  {
    path: "/login",
    element: withSuspense(<LoginPage />),
  },
  {
    path: "/recovery",
    element: withSuspense(<RecoveryPage />),
  },
  {
    path: "/change-password",
    element: withSuspense(<ChangePasswordPage />),
  },
]);
