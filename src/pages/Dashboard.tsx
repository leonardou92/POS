import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  TrendingUp, 
  Receipt, 
  Users, 
  ArrowRight, 
  BarChart4, 
  Calendar, 
  AlertTriangle,
  ShoppingCart 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [currentDate, setCurrentDate] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Mock data for dashboard
  const stats = [
    { id: 1, name: 'Ventas del día', value: '$1,250.00', icon: <TrendingUp className="h-6 w-6 text-primary-500" />, trend: '+12%' },
    { id: 2, name: 'Facturas emitidas', value: '12', icon: <Receipt className="h-6 w-6 text-success-500" />, trend: '+3' },
    { id: 3, name: 'Clientes nuevos', value: '2', icon: <Users className="h-6 w-6 text-warning-500" />, trend: '+1' },
    { id: 4, name: 'Facturas pendientes', value: '3', icon: <AlertTriangle className="h-6 w-6 text-error-500" />, trend: '-1' },
  ];
  
  const recentInvoices = [
    { id: 'FA-001', client: 'Empresa ABC', date: '2024-07-27', amount: '$650.00', status: 'Pagada' },
    { id: 'FA-002', client: 'Juan Pérez', date: '2024-07-27', amount: '$120.00', status: 'Pendiente' },
    { id: 'FA-003', client: 'Distribuidora XYZ', date: '2024-07-26', amount: '$340.00', status: 'Pagada' },
    { id: 'FA-004', client: 'María Rodríguez', date: '2024-07-26', amount: '$90.00', status: 'Anulada' },
    { id: 'FA-005', client: 'Comercial ABC', date: '2024-07-25', amount: '$210.00', status: 'Pagada' },
  ];

  useEffect(() => {
    // Format the current date in Spanish
    setCurrentDate(
      format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
    );
    
    // Simulate loading data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Capitalize first letter of date
  const formattedDate = currentDate.charAt(0).toUpperCase() + currentDate.slice(1);
  
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center mt-2 text-gray-600">
          <Calendar className="h-4 w-4 mr-1" />
          <span>{formattedDate}</span>
        </div>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.id} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">{stat.icon}</div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-success-600">
                      <span>{stat.trend}</span>
                    </div>
                  </dd>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <Link to="/reports" className="text-sm text-primary-700 font-medium hover:text-primary-900 flex items-center">
                Ver detalles
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
      
      {/* Recent activity and chart */}
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Recent invoices */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Facturas recientes</h3>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Factura
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-primary-700">
                        <Link to={`/invoices/${invoice.id}`}>{invoice.id}</Link>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{invoice.client}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{invoice.date}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{invoice.amount}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${invoice.status === 'Pagada' ? 'bg-success-100 text-success-800' : 
                            invoice.status === 'Pendiente' ? 'bg-warning-100 text-warning-800' : 
                            'bg-error-100 text-error-800'}`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Link to="/invoices" className="text-sm text-primary-700 font-medium hover:text-primary-900 flex items-center">
                Ver todas las facturas
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
        
        {/* Sales chart */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Ventas por día</h3>
          </div>
          <div className="p-5">
            <div className="relative h-80 flex items-center justify-center">
              <div className="flex flex-col items-center text-gray-500">
                <BarChart4 className="h-16 w-16 text-gray-300" />
                <p className="mt-2 text-sm">Gráfico de ventas disponible próximamente</p>
              </div>
            </div>
            <div className="mt-4">
              <Link to="/reports" className="text-sm text-primary-700 font-medium hover:text-primary-900 flex items-center">
                Ver reportes detallados
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick access buttons */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Link 
          to="/pos"
          className="flex items-center justify-between p-5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow transition-colors duration-200"
        >
          <div>
            <h3 className="text-lg font-medium">Ir a POS</h3>
            <p className="text-primary-100">Iniciar una nueva venta</p>
          </div>
          <ShoppingCart className="h-8 w-8" />
        </Link>
        
        <Link 
          to="/invoices"
          className="flex items-center justify-between p-5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow transition-colors duration-200"
        >
          <div>
            <h3 className="text-lg font-medium text-gray-900">Facturas</h3>
            <p className="text-gray-500">Gestionar documentos</p>
          </div>
          <Receipt className="h-8 w-8 text-gray-400" />
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;