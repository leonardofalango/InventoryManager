import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { ProductUploadPage } from "../features/products/pages/ProductUploadPage";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { InventoryListPage } from "../features/inventory/pages/InventoryListPage";
import { TeamPage } from "../features/team/pages/TeamPage";
import { useAuthStore } from "../store/authStore";
import type { JSX } from "react";

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <PrivateRoute>
        <AppLayout />
      </PrivateRoute>
    ),
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/inventory", element: <InventoryListPage /> },
      { path: "/products", element: <ProductUploadPage /> },
      { path: "/team", element: <TeamPage /> },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
]);
