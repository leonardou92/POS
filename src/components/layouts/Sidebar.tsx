import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Users,
  Settings,
  FileText,
  Box,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth'; // Import useAuth

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ mobile = false, onClose }) => {
  const { user } = useAuth(); // Use useAuth to access user data

  const navigation: NavItem[] = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'POS', path: '/pos', icon: <ShoppingCart className="h-5 w-5" /> },
    { name: 'Facturas', path: '/invoices', icon: <Receipt className="h-5 w-5" /> },
    { name: 'Clientes', path: '/customers', icon: <Users className="h-5 w-5" /> },
    { name: 'Productos', path: '/products', icon: <Box className="h-5 w-5" /> }, // <-- ADD THIS LINE
    //{ name: 'Reportes', path: '/reports', icon: <FileText className="h-5 w-5" /> },
    { name: 'Configuración', path: '/settings', icon: <Settings className="h-5 w-5" /> },
    { name: 'Ayuda', path: '/help', icon: <HelpCircle className="h-5 w-5" /> },
  ];

  return (
    <div className="flex flex-col h-0 flex-1 bg-gray-800">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center justify-center flex-shrink-0 px-4">
          <h1 className="text-white text-xl font-bold">Facturación</h1>
        </div>
        <nav className="mt-8 flex-1 px-2 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={mobile ? onClose : undefined}
              className={({ isActive }) =>
                `group flex items-center px-2 py-2 text-base font-medium rounded-md ${isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span className="ml-3">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex-shrink-0 flex p-4 bg-gray-700">
        <div className="flex-shrink-0 w-full group block">
          <div className="flex items-center">
            <div className="h-9 w-9 rounded-full bg-primary-500 flex items-center justify-center text-white">
              <Users className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{user?.nombreEmpresa || 'Empresa Demo'}</p> {/* Use the company name */}
              <p className="text-xs font-medium text-gray-300">{`v1.0.0`}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;