import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeft,
  FileText,
  Printer,
  XCircle,
  Trash2,
  CreditCard,
  Receipt,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { invoiceService } from '../services/api';
import { Document, Detail, Pago, InvoiceRequest, PagoRequest } from '../types/api';

interface AnularDocumentoRequest {
  nro_control: number;
  motivo_anulacion: string;
  tipo_documento: string;
}

interface ApiResponse<T> {
  status: boolean;
  documento?: T;
  detalles?: Detail[];
  pagos?: Pago[];
  message?: string;
}

interface CancelInvoiceResponse {
  status: boolean;
  message?: string;
}

interface CorrelativoResponse {
  status: boolean;
  id: string;
  tipo_documento: string;
  serie: string;
  ultimo_documento: number;
  ultimo_control: number;
  message?: string;
}

const InvoiceDetails: React.FC = () => {
  const { id, tipo_documento } = useParams<{ tipo_documento: string; id: string; }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Document | null>(null);
  const [details, setDetails] = useState<Detail[]>([]);
  const [payments, setPayments] = useState<Pago[]>([]);
  const [confirmModal, setConfirmModal] = useState<'anular' | 'eliminar' | null>(null);
  const [reason, setReason] = useState('');
  const [generatingCreditNote, setGeneratingCreditNote] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState<PagoRequest | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [correlativoNC, setCorrelativoNC] = useState<CorrelativoResponse | null>(null);
  const [correlativoLoading, setCorrelativoLoading] = useState(false);

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      try {
        setLoading(true);

        if (id && tipo_documento) {
          const response: ApiResponse<Document> = await invoiceService.getInvoiceByControlNumber(tipo_documento, id);

          if (response && response.status === true && response.documento) {
            setInvoice(response.documento);
            setDetails(response.detalles || []);
            setPayments(response.pagos || []);
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
        setLoading(false);
      }
    };

    fetchInvoiceDetails();
  }, [tipo_documento, id]);

  const handleCancelInvoice = async () => {
    if (!invoice || !reason) return;

    try {
      setLoading(true);

      const anularRequest: AnularDocumentoRequest = {
        nro_control: invoice.numero_control,
        motivo_anulacion: reason,
        tipo_documento: invoice.tipo_documento,
      };

      const response: CancelInvoiceResponse = await invoiceService.cancelInvoice(anularRequest);

      if (response && response.status === true) {
        setInvoice({
          ...invoice,
          status: 'ANULADO',
          motivo_anulacion: reason,
          tipo_documento: invoice.tipo_documento,
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConfirmModal(null);
      toast.success('Factura eliminada con éxito');
      navigate('/invoices');
    } catch (error: any) {
      console.error('Error eliminando factura:', error);
      toast.error(error?.message || 'Error al eliminar la factura');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCreditNote = useCallback(async () => {
    if (!invoice) {
      toast.error('No se puede generar la nota de crédito: factura no cargada.');
      return;
    }

    let correlativo: CorrelativoResponse | null = null;

    try {
      setCorrelativoLoading(true);
      const responseNC = await invoiceService.buscarCorrelativosPorTipo('NC');


      if (responseNC && responseNC.status) {
        correlativo = responseNC;
        setCorrelativoNC(responseNC);

      } else {
        console.error('Error fetching correlativo NC:', responseNC);
        toast.error(responseNC?.message || 'Error al obtener el correlativo NC');
        setCorrelativoNC(null);
        return;
      }
    } catch (error: any) {
      console.error('Error fetching correlativo:', error);
      toast.error(error.message || 'Error al obtener el correlativo');
      setCorrelativoNC(null);
      return;
    } finally {
      setCorrelativoLoading(false);
    }


    if (!correlativo) {
      toast.error('No se pudo obtener el correlativo para la Nota de Crédito.');
      return;
    }

    try {
      setGeneratingCreditNote(true);
      const now = new Date();
      const formattedDate = format(now, 'yyyy-MM-dd HH:mm:ss');

      const creditNoteNumber = Number(correlativo.ultimo_documento);
      const controlNumber = Number(correlativo.ultimo_control);

      const documentoNC: Document = {
        id_documento: 0,
        tipo_documento: 'NC',
        numero_documento: creditNoteNumber,
        numero_control: controlNumber,
        fecha_emision: formattedDate,
        razon_social: invoice.razon_social,
        registro_fiscal: invoice.registro_fiscal,
        direccion_fiscal: invoice.direccion_fiscal,
        e_mail: invoice.e_mail,
        telefono: invoice.telefono,
        descripcion: `Nota de crédito para la factura ${invoice.numero_documento}`,
        moneda_principal: invoice.moneda_principal,
        balance_anterior: invoice.balance_anterior,
        monto_exento: invoice.monto_exento,
        base_imponible: invoice.base_imponible,
        subtotal: invoice.subtotal,
        monto_iva: invoice.monto_iva,
        porcentaje_iva: invoice.porcentaje_iva,
        base_reducido: invoice.base_reducido,
        monto_iva_reducido: invoice.monto_iva_reducido,
        porcentaje_iva_reducido: invoice.porcentaje_igtf,
        total: invoice.total,
        base_igtf: invoice.base_igtf,
        monto_igtf: invoice.monto_igtf,
        porcentaje_igtf: invoice.porcentaje_igtf,
        total_general: invoice.total_general,
        conversion_moneda: invoice.conversion_moneda,
        tasa_cambio: invoice.tasa_cambio,
        direccion_envio: invoice.direccion_envio,
        serie_strong_id: `NC-` + Date.now().toString(),
        serie: correlativo.serie,
        usuario: user?.username || '',
        status: 'PROCESADO',
        motivo_anulacion: 'Nota de crédito generada automáticamente',
        tipo_documento_afectado: invoice.tipo_documento,
        numero_documento_afectado: invoice.numero_documento,
        saldo: invoice.total,
      };

      const detallesNC: Detail[] = details.map(detail => ({
        codigo: detail.codigo,
        descripcion: detail.descripcion,
        cantidad: detail.cantidad,
        precio_unitario: detail.precio_unitario,
        monto: detail.monto,
        monto_total: detail.monto_total,
        monto_iva: detail.monto_iva,
        monto_descuento: detail.monto_descuento,
        porcentaje_descuento: detail.porcentaje_iva,
        porcentaje_iva: detail.porcentaje_iva,
        es_exento: detail.es_exento,
      }));

      const invoiceRequestNC: InvoiceRequest = {
        documento: documentoNC,
        detalles: detallesNC,
      };

      const responseNC = await invoiceService.createInvoice(invoiceRequestNC);

      if (responseNC && responseNC.status) {
        try {
          const updateResponse = await invoiceService.updateCorrelativoDocumento(
            correlativo.tipo_documento,
            {
              ultimo_documento: Number(creditNoteNumber) + 1,
              ultimo_control: Number(controlNumber) + 1
            }
          );

          if (updateResponse && updateResponse.status) {
            toast.success(`Nota de crédito creada y correlativo NC actualizado a: ${Number(creditNoteNumber) + 1}`);
            navigate(`/invoices/${correlativo.tipo_documento}/${controlNumber}`);
          } else {
            console.error('Error updating correlativo:', updateResponse);
            toast.error("Nota de crédito creada, pero hubo un error actualizando el número correlativo. Contacte al administrador");
          }
        } catch (updateError: any) {
          console.error('Error updating correlativo after creating the credit note', updateError);
          toast.error("Nota de crédito creada, pero hubo un error actualizando el número correlativo. Contacte al administrador");
        }
      } else {
        console.error('Error creating credit note:', responseNC);
        toast.error(responseNC?.message || 'Error al crear la nota de crédito');
      }
    } catch (error: any) {
      console.error('Error al generar la nota de crédito:', error);
      toast.error(error.message || 'Error al generar la nota de crédito');
    } finally {
      setGeneratingCreditNote(false);
    }
  }, [invoice, user, details, navigate, invoiceService]);

  const handleOpenPaymentModal = () => {
    setPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setPaymentModalOpen(false);
    setPaymentData(null);
  };

  const handlePaymentSuccess = async (paymentInfo: any) => {
    if (!invoice) {
      toast.error('No se puede registrar el pago: factura no cargada.');
      return;
    }

    setIsPaying(true);
    const paymentAmount = paymentInfo.amount && !isNaN(parseFloat(paymentInfo.amount)) ? parseFloat(paymentInfo.amount).toFixed(2) : '0.00';

    let paymentReference = paymentInfo.reference;
    let banco = paymentInfo.banco;
    if (paymentInfo.metodoPago === 'efectivo') {
      paymentReference = `Pago efectivo ${paymentInfo.currency} A factura: ${invoice.numero_control} fecha: ${paymentInfo.fecha_pago}`;
      banco = `Efectivo ${paymentInfo.currency}`;
    }

    const pagoRequest: PagoRequest = {
      documento_afectado: invoice.numero_documento,
      desc_tipo_pago: paymentInfo.metodoPago,
      monto: parseFloat(paymentAmount),
      fecha_pago: paymentInfo.fecha_pago,
      usuario: user?.username || 'usuario',
      tasa_cambio: parseFloat(paymentInfo.exchangeRate),
      moneda: paymentInfo.currency,
      referencia: paymentReference,
      banco: banco,
      status: 'PROCESADO'
    };

    try {
      const response = await invoiceService.registerPayment(pagoRequest);

      if (response && response.status === true) {
        toast.success('Pago registrado con éxito!');
        setPaymentModalOpen(false);
        const fetchInvoiceDetails = async () => {
          try {
            setLoading(true);
            if (id && tipo_documento) {
              const response: ApiResponse<Document> = await invoiceService.getInvoiceByControlNumber(tipo_documento, id);

              if (response && response.status === true && response.documento) {
                setInvoice(response.documento);
                setDetails(response.detalles || []);
                setPayments(response.pagos || []);
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
            setLoading(false);
          }
        };
        await fetchInvoiceDetails();
      } else {
        toast.error(response?.message || 'No se pudo registrar el pago. Por favor, inténtelo de nuevo.');
      }


    } catch (error: any) {
      console.error('Error al registrar el pago:', error);
      toast.error(error.message || 'Error al registrar el pago');
    } finally {
      setIsPaying(false);
      setPaymentModalOpen(false);
      setPaymentData(null);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy HH:mm');
  };

  const documentTypeLabels: Record<string, string> = {
    FA: 'Factura',
    NC: 'Nota de Crédito',
    ND: 'Nota de Débito',
  };

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined) return '0.00';
    return Number(amount).toFixed(2);
  };

  const getInvoiceStatusStyle = () => {
    if (invoice && invoice.status === 'ANULADO') {
      return 'bg-error-50 border-error-200 text-error-800';
    } else if (invoice && invoice.saldo == 0.00) {
      return 'bg-success-50 border-success-200 text-success-800';
    } else if (invoice && invoice.saldo !== undefined && invoice.saldo < Number(invoice.total_general)) {
      return 'bg-warning-50 border-warning-200 text-warning-800';
    } else {
      return 'bg-gray-50 border-gray-200 text-gray-800'; // or any other default style
    }
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
          {invoice.tipo_documento === 'FA' && invoice.status == 'PROCESADO' && (
            <>
              <button
                onClick={handleGenerateCreditNote}
                className="btn btn-secondary w-full sm:w-auto flex items-center justify-center"
                disabled={generatingCreditNote || correlativoLoading}
              >
                {generatingCreditNote || correlativoLoading ? (
                  <LoadingSpinner size="sm" text="Generando..." />
                ) : (
                  <>
                    <Receipt className="h-4 w-4 mr-1" />
                    Generar Nota de Crédito
                  </>
                )}
              </button>
            </>
          )}
          <button className="btn btn-secondary w-full sm:w-auto flex items-center justify-center">
            <Printer className="h-4 w-4 mr-1" />
            Imprimir
          </button>

          {invoice.status === 'PROCESADO' && invoice.tipo_documento == 'FA' && (
            <>
              {invoice.saldo != 0.00 && (
                <button
                  onClick={handleOpenPaymentModal}
                  className="btn btn-success w-full sm:w-auto flex items-center justify-center"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Pagar Factura
                </button>
              )}

              <button
                onClick={() => setConfirmModal('anular')}
                className="btn btn-secondary w-full sm:w-auto flex items-center justify-center"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Anular
              </button>


            </>
          )}
        </div>
      </div>

      {/* Invoice status */}
      <div className={`mb-6 p-4 rounded-lg border ${getInvoiceStatusStyle()}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {invoice.status === 'ANULADO' ? (
              <XCircle className="h-5 w-5" />
            ) : invoice.saldo === 0 ? (
              <Receipt className="h-5 w-5" />
            ) : (invoice.saldo !== undefined && invoice.saldo < Number(invoice.total_general)) ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium">
              {invoice.status === 'ANULADO' ? 'Factura anulada' :
                invoice.saldo == 0.00 ? 'Factura pagada' : (invoice.saldo > 0 && invoice.saldo < Number(invoice.total_general)) ? 'Factura parcialmente pagada' : 'Factura pendiente por pagar'}
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
                          VES {formatCurrency(detail.precio_unitario)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {detail.es_exento ? (
                            <span className="text-xs font-medium text-gray-500">Exento</span>
                          ) : (
                            <>
                              VES {formatCurrency(detail.monto_iva)}
                              <div className="text-xs text-gray-500">{detail.porcentaje_iva}%</div>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          VES {formatCurrency(detail.monto_total)}
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
                            VES {formatCurrency(payment.monto)}
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
                  <span className="text-gray-900">VES {formatCurrency(invoice.subtotal)}</span>
                </div>

                {Number(invoice.monto_exento) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Monto exento:</span>
                    <span className="text-gray-900">VES {formatCurrency(invoice.monto_exento)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Base imponible:</span>
                  <span className="text-gray-900">VES {formatCurrency(invoice.base_imponible)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">IVA ({invoice.porcentaje_iva}%):</span>
                  <span className="text-gray-900">VES {formatCurrency(invoice.monto_iva)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total:</span>
                  <span className="text-gray-900">VES {formatCurrency(invoice.total)}</span>
                </div>

                {Number(invoice.monto_igtf) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">IGTF ({invoice.porcentaje_igtf}%):</span>
                    <span className="text-gray-900">VES {formatCurrency(invoice.monto_igtf)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold pt-3 border-t">
                  <span>Pendiente:</span>
                  <span>VES {formatCurrency(invoice.saldo)}</span>
                </div>

                <div className="flex justify-between font-bold pt-3 border-t">
                  <span>Total General:</span>
                  <span>VES {formatCurrency(invoice.total_general)}</span>
                </div>



                {invoice.conversion_moneda && (
                  <div className="flex justify-between font-bold pt-3 border-t">
                    <span className="text-gray-500">En {invoice.conversion_moneda}:</span>
                    <span className="text-gray-900">
                      {(Number(invoice.total_general) / Number(invoice.tasa_cambio)).toFixed(2)} {invoice.conversion_moneda}
                    </span>
                  </div>
                )}
              </div>


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
  className="w-full inline-flex justify-center rounded-md  border border-transparent shadow-sm px-4 py-2 bg-warning-600 text-base font-medium text-white hover:bg-warning-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-warning-500 sm:ml-3 sm:w-auto sm:text-sm"
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

{paymentModalOpen && invoice && (
<PaymentModal
invoice={invoice}
initialAmount={invoice.saldo || 0} // Pass the initial saldo value
total={Number(invoice.total_general)}
onClose={handleClosePaymentModal}
onPaymentSuccess={handlePaymentSuccess}
loading={isPaying}
/>
)}
{/* Correlativo Loading Overlay */}
{correlativoLoading && (
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
<LoadingSpinner text="Cargando correlativo NC..." />
</div>
)}
</div>
);
};

// Payment Modal Component
interface PaymentModalProps {
invoice: Document,
total: number;
onClose: () => void;
onPaymentSuccess: (paymentInfo: any) => void;
loading: boolean;
initialAmount: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ total, onClose, onPaymentSuccess, loading, invoice, initialAmount }) => {
const [paymentMethod, setPaymentMethod] = useState('efectivo');
const [amount, setAmount] = useState(String(initialAmount)); // Initialize as empty string
const [reference, setReference] = useState('');
const [bank, setBank] = useState(' ');
const [isPaid, setIsPaid] = useState(true);
const [currency, setCurrency] = useState('VES'); // Default to VES
const [exchangeRate, setExchangeRate] = useState('1');
const [paymentCurrency, setPaymentCurrency] = useState('VES');
const [amountError, setAmountError] = useState('');
const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

useEffect(() => {
// Update amount when initialAmount changes to keep the value updated on VES, formatted to 2 decimal places
setAmount(String(initialAmount));
}, [initialAmount]);

const handleSubmit = (e: React.FormEvent) => {
e.preventDefault();
if (!amount) {
setAmountError('El monto es requerido');
return;
}

// Get the current time
const now = new Date();
const formattedTime = now.toTimeString().split(' ')[0]; // Get HH:mm:ss

// Combine selected date with current time
const formattedPaymentDate = `${paymentDate} ${formattedTime}`; //yyyy-MM-dd HH:mm:ss

const paymentInfo = {
metodoPago: paymentMethod,
amount: amount, // Use the formatted amount from state
referencia: reference,
banco: bank,
isPaid: true, // Mark as paid is always true, since now credit option is shown before calling to the Payment modal
currency: currency,
exchangeRate: parseFloat(exchangeRate),
paymentCurrency: paymentCurrency,
fecha_pago: formattedPaymentDate // Send combined date and time
};

onPaymentSuccess(paymentInfo);
};

const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
const value = e.target.value;
setAmount(value);

if (!value) {
setAmountError('El monto es requerido');
} else if (isNaN(parseFloat(value))) {
setAmountError('El monto debe ser un número');
} else {
setAmountError('');
}
};

const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
setReference(e.target.value);
}

const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
setCurrency(e.target.value);
setPaymentCurrency(e.target.value); //Also, update the payment currency
if (e.target.value === 'VES') {
setExchangeRate('1'); // Reset exchange rate to 1 if VES is selected
}
};
const handlePaymentDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
setPaymentDate(e.target.value);
};

return (
<div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
<div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl animate-slide-up">
<h3 className="text-xl font-bold mb-4 flex items-center">
<CreditCard className="h-5 w-5 mr-2" />
Procesar pago
</h3>

<form onSubmit={handleSubmit} className="space-y-4">
<div className="bg-gray-50 p-3 rounded-lg mb-4">
<div className="text-gray-700">Total a pagar:</div>
<div className="text-2xl font-bold text-gray-900">
{currency === 'USD' ? `VES ${(total * parseFloat(exchangeRate)).toFixed(2)}` : `VES ${total.toFixed(2)}`}
</div>
</div>

<div>
<label className="label">Método de pago</label>
<div className="grid grid-cols-2 gap-3">
<button
type="button"
className={`flex items-center justify-center p-3 rounded-lg border ${paymentMethod === 'efectivo'
  ? 'bg-primary-50 border-primary-500 text-primary-700'
  : 'border-gray-300 text-gray-700'
  }`}
onClick={() => setPaymentMethod('efectivo')}
>
<DollarSign className="h-5 w-5 mr-2" />
Efectivo
</button>

<button
type="button"
className={`flex items-center justify-center p-3 rounded-lg border ${paymentMethod === 'transferencia'
  ? 'bg-primary-50 border-primary-500 text-primary-700'
  : 'border-gray-300 text-gray-700'
  }`}
onClick={() => setPaymentMethod('transferencia')}
>
<CreditCard className="h-5 w-5 mr-2" />
Transferencia
</button>
</div>
</div>

<div>
<label htmlFor="amount" className="label">Monto recibido</label>
<input
type="number"
id="amount"
className={`input ${amountError ? 'border-error-500' : ''}`} // Apply a class for error styling
value={amount}
onChange={handleAmountChange}
min="0"
step="0.01"
required
/>
{amountError && <p className="text-error-500 text-sm">{amountError}</p>}
</div>

<div>
<label htmlFor="reference" className="label">Referencia</label>
<input
type="text"
id="reference"
className="input"
value={reference}
onChange={handleReferenceChange}
/>
</div>
<div>
<label htmlFor="paymentDate" className="label">Fecha de pago</label>
<input
type="date"
id="paymentDate"
className="input"
value={paymentDate}
onChange={handlePaymentDateChange}
required
/>
</div>

<div className="grid grid-cols-2 gap-4">
<div>
<label htmlFor="currency" className="label">Moneda</label>
<select
id="currency"
className="input"
value={currency}
onChange={handleCurrencyChange}
>
<option value="VES">VES</option>
<option value="USD">USD</option>
</select>
</div>

<div>
<label htmlFor="exchangeRate" className="label">Tasa de cambio</label>
<input
type="number"
id="exchangeRate"
className="input"
value={exchangeRate}
onChange={(e) => setExchangeRate(e.target.value)}
min="0"
step="0.01"
required={currency === 'USD'}
disabled={currency === 'VES'}
/>
</div>
</div>

{paymentMethod === 'transferencia' && (
<>

<div>
<label htmlFor="bank" className="label">Banco</label>
<select
  id="bank"
  className="input"
  value={bank}
  onChange={(e) => setBank(e.target.value)}
  required={paymentMethod === 'transferencia'}
>
  <option value="">Seleccionar banco...</option>
  <option value="Banesco">Banesco</option>
  <option value="Provincial">Provincial</option>
  <option value="Mercantil">Mercantil</option>
  <option value="Venezuela">Venezuela</option>
</select>
</div>
</>
)}

<div className="flex items-center mt-4">
<input
type="checkbox"
id="isPaid"
checked={isPaid}
onChange={(e) => setIsPaid(e.target.checked)}
className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
/>
<label htmlFor="isPaid" className="ml-2 block text-sm text-gray-900">
Marcar como pagado
</label>
</div>

<div className="flex justify-end space-x-3 pt-4">
<button
type="button"
className="btn btn-secondary"
onClick={onClose}
disabled={loading}
>
Cancelar
</button>
<button
type="submit"
className="btn btn-success flex items-center"
disabled={loading || amountError !== ''}
>
{loading ? (
<LoadingSpinner size="sm" text="" />
) : (
<>
  <Receipt className="h-4 w-4 mr-1" />
  Completar venta
</>
)}
</button>
</div>
</form>
</div>
</div>
);
};

export default InvoiceDetails;