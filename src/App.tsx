import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuth } from './hooks/useAuth';
import AppLayout from './components/layouts/AppLayout';
import LoadingSpinner from './components/common/LoadingSpinner';

// Lazy loaded components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const POS = lazy(() => import('./pages/POS'));
const Invoices = lazy(() => import('./pages/Invoices'));
const InvoiceDetails = lazy(() => import('./pages/InvoiceDetails'));
const Customers = lazy(() => import('./pages/Customers'));
const Products = lazy(() => import('./pages/Products')); // <-- Import Products
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:tipo_documento/:id" element={<InvoiceDetails />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/products" element={<Products />} /> {/* <-- Add this line */}
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function RequireAuth() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default App;