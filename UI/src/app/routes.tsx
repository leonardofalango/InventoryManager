import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { ProductUploadPage } from "../features/products/pages/ProductUploadPage";

const Dashboard = () => <h1 className="text-3xl font-bold text-white">Dashboard Geral</h1>;
const InventoryList = () => (
  <h1 className="text-3xl font-bold text-white">Gerenciamento de Inventários</h1>
);


export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/inventory", element: <InventoryList /> },
      { path: "/products", element: <ProductUploadPage /> },
      { path: "/team", element: <div>Gestão de Equipe</div> },
    ],
  },
  {
    path: "/login",
    element: <div>Login Page</div>, // Fora do Layout
  },
]);
