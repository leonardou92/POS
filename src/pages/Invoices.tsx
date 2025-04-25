import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search,
  FileText,
  Printer,
  Eye,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { invoiceService } from '../services/api';

interface Document {  // Define the Document interface based on your actual API response
    tipo_documento: string;
    numero_documento: string;
    numero_control: string;
    fecha_emision: string;
    razon_social: string;
    registro_fiscal: string;
    direccion_fiscal: string;
    e_mail: string;
    telefono: string;
    descripcion: string;
    moneda_principal: string;
    balance_anterior: string;
    monto_exento: string;
    base_imponible: string;
    subtotal: string;
    monto_iva: string;
    porcentaje_iva: string;
    base_reducido: string;
    monto_iva_reducido: string;
    porcentaje_iva_reducido: string;
    total: string;
    base_igtf: string;
    monto_igtf: string;
    porcentaje_igtf: string;
    total_general: string;
    conversion_moneda: string;
    tasa_cambio: string;
    direccion_envio: string;
    serie_strong_id: string;
    serie: string;
    status: string;
    motivo_anulacion: string;
    nombre_empresa: string;
    rif_fiscal_empresa: string;
    direccion_empresa: string;
    usuario: string;
}

interface ApiResponse {
  status: boolean;
  resultado?: { documento: Document, detalles: any[] }[];
  message?: string;
}

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [filteredInvoices, setFilteredInvoices] = useState<Document[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);

        const rawResponse = await invoiceService.getInvoicesByDateRange(
          dateRange.startDate,
          dateRange.endDate
        );

        const response = rawResponse as unknown as ApiResponse;

        if (response && response.status === true && Array.isArray(response.resultado)) {
          // Map over the resultado array and extract the documento
          const documentList: Document[] = response.resultado.map(item => item.documento);
          setInvoices(documentList);
        } else {
          console.error('Invalid response from API:', response);
          toast.error(response?.message || 'Error: Datos de facturas inválidos.');
          setInvoices([]);
        }
      } catch (error: any) {
        console.error('Error fetching invoices:', error);
        toast.error(error?.message || 'Error al cargar las facturas');
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [dateRange]);

  useEffect(() => {
    let filtered = [...invoices];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        invoice =>
          invoice.razon_social.toLowerCase().includes(term) ||
          invoice.registro_fiscal.toLowerCase().includes(term) ||
          invoice.numero_documento.toLowerCase().includes(term) ||
          invoice.numero_control.toLowerCase().includes(term)
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === selectedStatus);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(invoice => invoice.tipo_documento === selectedType);
    }

   setFilteredInvoices(filtered);
    setCurrentPage(1);
  }, [invoices, searchTerm, selectedStatus, selectedType]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) {
        return 'Fecha no disponible';
    }

    try {
        const parsedDate = parseISO(dateString);
        return format(parsedDate, 'dd/MM/yyyy', { locale: es });
    } catch (error) {
        console.error("Error al parsear la fecha:", dateString, error);
        return 'Fecha inválida';
    }
};

  const documentTypeLabels: Record<string, string> = {
    FA: 'Factura',
    NC: 'Nota de Crédito',
    ND: 'Nota de Débito',
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 md:mb-0">Facturas</h1>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Link to="/pos" className="btn btn-primary flex items-center justify-center">
            <FileText className="h-4 w-4 mr-1" />
            Nueva factura
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <label htmlFor="search" className="label">Buscar</label>
            <div className="relative">
              <input
                id="search"
                type="text"
                className="input pl-10"
                placeholder="Buscar por cliente, RIF o número..."
                value={searchTerm}
                onChange={handleSearch}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="md:w-48">
            <label htmlFor="status" className="label">Estado</label>
            <select
              id="status"
              className="input"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="PROCESADO">Activas</option>
              <option value="ANULADO">Anuladas</option>
            </select>
          </div>

          <div className="md:w-48">
            <label htmlFor="type" className="label">Tipo</label>
            <select
              id="type"
              className="input"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="FA">Facturas</option>
              <option value="NC">Notas de Crédito</option>
              <option value="ND">Notas de Débito</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="label">Desde</label>
            <input
              id="startDate"
              type="date"
              className="input"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="endDate" className="label">Hasta</label>
            <input
              id="endDate"
              type="date"
              className="input"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Invoices table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner text="Cargando facturas..." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Control
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RIF/Cédula
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.length > 0 ? (
                    currentItems.map((invoice) => (
                      <tr key={`${invoice.tipo_documento}-${invoice.numero_documento}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            invoice.tipo_documento === 'FA'
                              ? 'bg-primary-100 text-primary-800'
                              : invoice.tipo_documento === 'NC'
                                ? 'bg-success-100 text-success-800'
                                : 'bg-warning-100 text-warning-800'
                          }`}>
                            {documentTypeLabels[invoice.tipo_documento] || invoice.tipo_documento}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {invoice.numero_documento}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {invoice.numero_control}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(invoice.fecha_emision)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {invoice.razon_social}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {invoice.registro_fiscal}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                         {(() => {
                          const totalGeneral = parseFloat(invoice.total_general || "0");
                          if (!isNaN(totalGeneral)) {
                            return `$${totalGeneral.toFixed(2)}`;
                          } else {
                            return `Invalid Value`;
                          }
                        })()}
                      </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            invoice.status === 'PROCESADO'
                              ? 'bg-success-100 text-success-800'
                              : 'bg-error-100 text-error-800'
                          }`}>
                            {invoice.status === 'PROCESADO' ? 'Activa' : 'Anulada'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end items-center space-x-2">
                            <Link
                              to={`/invoices/${invoice.numero_control}`}
                              className="text-primary-600 hover:text-primary-900"
                              title="Ver detalles"
                            >
                              <Eye className="h-5 w-5" />
                            </Link>
                            <button
                              className="text-gray-600 hover:text-gray-900"
                              title="Imprimir"
                            >
                              <Printer className="h-5 w-5" />
                            </button>
                            {invoice.status === 'activo' && (
                              <>
                                <button
                                  className="text-warning-600 hover:text-warning-900"
                                  title="Anular"
                                >
                                  <XCircle className="h-5 w-5" />
                                </button>
                                <button
                                  className="text-error-600 hover:text-error-900"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No se encontraron facturas con los filtros seleccionados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredInvoices.length > 0 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="hidden sm:block">
                    <p className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a{' '}
                      <span className="font-medium">
                        {Math.min(indexOfLastItem, filteredInvoices.length)}
                      </span>{' '}
                      de <span className="font-medium">{filteredInvoices.length}</span> resultados
                    </p>
                  </div>
                  <div className="flex-1 flex justify-center sm:justify-end">
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                      >
                        <span className="sr-only">Anterior</span>
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>

                      {[...Array(totalPages)].map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentPage(index + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                            currentPage === index + 1
                              ? 'text-primary-600 bg-primary-50'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {index + 1}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                      >
                        <span className="sr-only">Siguiente</span>
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Invoices;