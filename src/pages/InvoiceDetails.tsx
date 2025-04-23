import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import {
  ArrowLeft,
  FileText,
  Printer,
  XCircle,
  Trash2,
  CreditCard,
  Receipt,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { invoiceService } from '../services/api';
import { Document, Detail, Pago } from '../types/api';

interface AnularDocumentoRequest {
    nro_control: string;
    motivo_anulacion: string;
}

interface ApiResponse<T> {
  status: boolean;
  documento?: T;
  detalles?: Detail[]; // Tipado específico
  pagos?: Pago[];     // Tipado específico
  message?: string;
}

interface CancelInvoiceResponse {
    status: boolean;
    message?: string;
}


const InvoiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Document | null>(null);
  const [details, setDetails] = useState<Detail[]>([]);
  const [payments, setPayments] = useState<Pago[]>([]);
  const [confirmModal, setConfirmModal] = useState<'anular' | 'eliminar' | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      try {
        setLoading(true); // Start loading

        if (id) {
          const response: ApiResponse<Document> = await invoiceService.getInvoiceByControlNumber(id);

          if (response && response.status === true && response.documento) {
            setInvoice(response.documento);
            setDetails(response.detalles || []); // Usar un array vacío si es undefined
            setPayments(response.pagos || []);   // Usar un array vacío si es undefined
          } else {
            console.error('Error fetching invoice details:', response);
            toast.error(response?.message || 'Error al cargar los detalles de la factura');
            setInvoice(null);
            setDetails([]);
            setPayments([]);
          }
        } else {
          console.warn('No invoice ID provided.');
          toast.error('ID de factura no proporcionado.');
          setInvoice(null);
          setDetails([]);
          setPayments([]);
        }
      } catch (error: any) {
        console.error('Error fetching invoice details:', error);
        toast.error(error?.message || 'Error al cargar los detalles de la factura');
        setInvoice(null);
        setDetails([]);
        setPayments([]);
      } finally {
        setLoading(false); // Stop loading
      }
    };

    fetchInvoiceDetails();
  }, [id]);

  const handleCancelInvoice = async () => {
    if (!invoice || !reason) return;

    try {
      setLoading(true);

      const anularRequest: AnularDocumentoRequest = {
        nro_control: invoice.numero_control,
        motivo_anulacion: reason,
      };

      const response: CancelInvoiceResponse = await invoiceService.cancelInvoice(anularRequest);

       if (response && response.status === true) {
            // Update invoice status locally
            setInvoice({
                ...invoice,
                status: 'ANULADO',
                motivo_anulacion: reason,
            });

            setConfirmModal(null);
            setReason('');

            toast.success('Factura anulada con éxito');
        } else {
            toast.error(response?.message || 'Error al anular la factura');
        }


    } catch (error: any) {
      console.error('Error anulando factura:', error);
      toast.error(error?.message || 'Error al anular la factura');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice) return;

    try {
      setLoading(true);

      // In a real implementation, this would call the API
      // await invoiceService.deleteInvoice({
      //   nro_control: invoice.numero_control,
      // });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setConfirmModal(null);
      toast.success('Factura eliminada con éxito');

      // Navigate back to invoices list
      navigate('/invoices');
    } catch (error: any) {
      console.error('Error eliminando factura:', error);
      toast.error(error?.message || 'Error al eliminar la factura');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy HH:mm');
  };

  // Document type labels
  const documentTypeLabels: Record<string, string> = {
    FA: 'Factura',
    NC: 'Nota de Crédito',
    ND: 'Nota de Débito',
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner text="Cargando detalles de la factura..." />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-warning-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Factura no encontrada</h2>
        <p className="text-gray-600 mb-4">La factura que estás buscando no existe o ha sido eliminada.</p>
        <Link to="/invoices" className="btn btn-primary">
          Volver a facturas
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div className="flex items-center">
          <Link to="/invoices" className="mr-3 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Detalles de {documentTypeLabels[invoice.tipo_documento] || invoice.tipo_documento}
          </h1>
        </div>

        <div className="flex flex-wrap mt-4 md:mt-0 space-x-0 space-y-2 sm:space-x-2 sm:space-y-0">
          <button className="btn btn-secondary w-full sm:w-auto flex items-center justify-center">
            <Printer className="h-4 w-4 mr-1" />
            Imprimir
          </button>

          {invoice.status === 'PROCESADO' && (
            <>
              <button
                onClick={() => setConfirmModal('anular')}
                className="btn btn-secondary w-full sm:w-auto flex items-center justify-center"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Anular
              </button>

              <button
                onClick={() => setConfirmModal('eliminar')}
                className="btn btn-danger w-full sm:w-auto flex items-center justify-center"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Invoice status */}
      <div className={`mb-6 p-4 rounded-lg border ${
        invoice.status === 'PROCESADO'
          ? 'bg-success-50 border-success-200 text-success-800'
          : 'bg-error-50 border-error-200 text-error-800'
      }`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {invoice.status === 'PROCESADO' ? (
              <Receipt className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium">
              {invoice.status === 'PROCESADO' ? 'Factura activa' : 'Factura anulada'}
            </h3>
            {invoice.status === 'ANULADO' && invoice.motivo_anulacion && (
              <p className="mt-1 text-sm">
                Motivo: {invoice.motivo_anulacion}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Invoice details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary-500" />
                Información del documento
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Tipo de documento</div>
                  <div className="mt-1 text-sm text-gray-900">
                    {documentTypeLabels[invoice.tipo_documento] || invoice.tipo_documento}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Número</div>
                  <div className="mt-1 text-sm text-gray-900">{invoice.numero_documento}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Control</div>
                  <div className="mt-1 text-sm text-gray-900">{invoice.numero_control}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Fecha de emisión</div>
                  <div className="mt-1 text-sm text-gray-900">{formatDate(invoice.fecha_emision)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Serie</div>
                  <div className="mt-1 text-sm text-gray-900">{invoice.serie}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Usuario</div>
                  <div className="mt-1 text-sm text-gray-900">{invoice.usuario}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Moneda</div>
                  <div className="mt-1 text-sm text-gray-900">{invoice.moneda_principal}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Tasa de cambio</div>
                  <div className="mt-1 text-sm text-gray-900">{Number(invoice.tasa_cambio).toFixed(2)}</div>
                </div>

                <div className="sm:col-span-2">
                  <div className="text-sm font-medium text-gray-500">Descripción</div>
                  <div className="mt-1 text-sm text-gray-900">{invoice.descripcion}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Details table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Detalles de la factura
              </h3>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precio unit.
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IVA
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {details.map((detail, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>{detail.descripcion}</div>
                          <div className="text-xs text-gray-500">{detail.codigo}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {detail.cantidad}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          ${Number(detail.precio_unitario).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {detail.es_exento ? (
                            <span className="text-xs font-medium text-gray-500">Exento</span>
                          ) : (
                            <>
                              ${Number(detail.monto_iva).toFixed(2)}
                              <div className="text-xs text-gray-500">{detail.porcentaje_iva}%</div>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          ${Number(detail.monto_total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Payments */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-success-500" />
                Pagos
              </h3>

              {payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Referencia
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Banco
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {payment.desc_tipo_pago}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {payment.referencia}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {payment.banco}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(payment.fecha_pago)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                            ${Number(payment.monto).toFixed(2)}
                            <div className="text-xs text-gray-500">
                              {payment.moneda} (TC: {payment.tasa_cambio})
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No hay pagos registrados
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Summary and customer info */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen</h3>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal:</span>
                  <span className="text-gray-900">${Number(invoice.subtotal).toFixed(2)}</span>
                </div>

                {Number(invoice.monto_exento) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Monto exento:</span>
                    <span className="text-gray-900">${Number(invoice.monto_exento).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Base imponible:</span>
                  <span className="text-gray-900">${Number(invoice.base_imponible).toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">IVA ({invoice.porcentaje_iva}%):</span>
                  <span className="text-gray-900">${Number(invoice.monto_iva).toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total:</span>
                  <span className="text-gray-900">${Number(invoice.total).toFixed(2)}</span>
                </div>

                {Number(invoice.monto_igtf) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">IGTF ({invoice.porcentaje_igtf}%):</span>
                    <span className="text-gray-900">${Number(invoice.monto_igtf).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold pt-3 border-t">
                  <span>Total General:</span>
                  <span>${Number(invoice.total_general).toFixed(2)}</span>
                </div>

                {invoice.conversion_moneda && (
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-gray-500">En {invoice.conversion_moneda}:</span>
                    <span className="text-gray-900">
                      {(Number(invoice.total_general) * Number(invoice.tasa_cambio)).toFixed(2)} {invoice.conversion_moneda}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment status */}
              {payments.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center text-success-600">
                    <span className="bg-success-100 p-1 rounded-full mr-2">
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="font-medium">Pagado</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer info */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Cliente</h3>

              <div className="space-y-3">
                <div>
                  <div className="font-medium">{invoice.razon_social}</div>
                  <div className="text-sm text-gray-500">{invoice.registro_fiscal}</div>
                </div>

                <div className="text-sm">
                  <div className="text-gray-500">Dirección fiscal:</div>
                  <div>{invoice.direccion_fiscal}</div>
                </div>

                <div className="text-sm">
                  <div className="text-gray-500">Email:</div>
                  <div>{invoice.e_mail}</div>
                </div>

                <div className="text-sm">
                  <div className="text-gray-500">Teléfono:</div>
                  <div>{invoice.telefono}</div>
                </div>

                {invoice.direccion_envio && invoice.direccion_envio !== invoice.direccion_fiscal && (
                  <div className="text-sm">
                    <div className="text-gray-500">Dirección de envío:</div>
                    <div>{invoice.direccion_envio}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation modals */}
      {confirmModal === 'anular' && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-warning-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-warning-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Anular factura
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        ¿Estás seguro de que quieres anular esta factura? Esta acción no se puede deshacer.
                      </p>
                      <div className="mt-4">
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                          Motivo de anulación *
                        </label>
                        <textarea
                          id="reason"
                          rows={3}
                          className="mt-1 input"
                          placeholder="Ingrese el motivo de anulación"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-warning-600 text-base font-medium text-white hover:bg-warning-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-warning-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCancelInvoice}
                  disabled={!reason}
                >
                  Anular
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setConfirmModal(null);
                    setReason('');
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal === 'eliminar' && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-error-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-error-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Eliminar factura
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        ¿Estás seguro de que quieres eliminar permanentemente esta factura? Esta acción
                        no se puede deshacer y eliminará todos los datos asociados.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-error-600 text-base font-medium text-white hover:bg-error-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDeleteInvoice}
                >
                  Eliminar
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setConfirmModal(null)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetails;