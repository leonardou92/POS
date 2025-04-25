import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    ShoppingCart,
    UserPlus,
    Package,
    Trash2,
    Plus,
    Minus,
    CreditCard,
    DollarSign,
    Receipt,
    Search as SearchIcon,
    Info,
    AlertTriangle, // AlertTriangle
} from 'lucide-react';
import { useCartStore, getCartTotals } from '../stores/cartStore';
import { invoiceService } from '../services/api';
import { InvoiceRequest, Document, Detail, Product, GetProductsResponse, Client, PagoRequest } from '../types/api';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface CorrelativoResponse {
    status: boolean;
    id: string;
    tipo_documento: string;
    serie: string;
    ultimo_numero: number;
}

interface ConfirmationModalProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ message, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl animate-slide-up">
                <div className="flex items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-warning-100 sm:mx-0 sm:h-10 sm:w-10">
                        <AlertTriangle className="h-6 w-6 text-warning-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                            Confirmación
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onCancel}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={onConfirm}
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

const POS: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const { items, addItem, updateItem, removeItem, clearCart, customer, setCustomer } = useCartStore();
    const totals = getCartTotals();

    const [loading, setLoading] = useState(false);
    const [customerModalOpen, setCustomerModalOpen] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [customerSearchTerm, setCustomerSearchTerm] = useState(''); // Customer search term
    // const [customers, setCustomers] = useState<Client[]>([]); // customers REMOVED
    const [customerListLoading, setCustomerListLoading] = useState(false); // Loading for Customer List
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12);
    const [rifSearchModalOpen, setRifSearchModalOpen] = useState(false); // State for RIF search modal
    const [rifSearchResult, setRifSearchResult] = useState<Client | null>(null); // State to store RIF search result
    const [rifSearchLoading, setRifSearchLoading] = useState(false); // Loading state for RIF search
    const [rifSearchTerm, setRifSearchTerm] = useState(''); //Local RIF search
    const [showCreditOption, setShowCreditOption] = useState(false); // Display credit option

    //const [correlativo, setCorrelativo] = useState<CorrelativoResponse | null>(null); REMOVED: Now we fetch correlativo inside the completeSale handler
    const [correlativoLoading, setCorrelativoLoading] = useState(false);
    const [noCorrelativoAlert, setNoCorrelativoAlert] = useState(false); // State for no correlativo alert

    const [correlativoCT, setCorrelativoCT] = useState<CorrelativoResponse | null>(null);
    const [correlativoCTLoading, setCorrelativoCTLoading] = useState(false);
    const [noCorrelativoCTAlert, setNoCorrelativoCTAlert] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const rawResponse = await invoiceService.getProducts(user?.sucursal);
                const response = rawResponse as unknown as GetProductsResponse;

                if (!response || !response.status || !Array.isArray(response.productos)) {
                    console.error("API returned invalid product data:", response);
                    toast.error("Error: Invalid product data received from API.");
                    setProducts([]);
                    setFilteredProducts([]);
                    return;
                }

                const adaptedProducts: Product[] = response.productos.map(p => ({
                    id: p.id,
                    code: p.id, // Assuming 'id' can be used as 'code'
                    name: p.name,
                    price: parseFloat(p.price.toString()),
                    taxable: p.taxable,
                    taxRate: parseFloat((p.taxRate ?? '0').toString())
                }));

                setProducts(adaptedProducts);
                setFilteredProducts(adaptedProducts);
            } catch (error: any) {
                console.error('Error fetching products:', error);
                toast.error(error.message || 'Error al cargar los productos');
                setProducts([]);
                setFilteredProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [user?.sucursal]);

    const fetchCorrelativoCT = async () => {
        try {
            setCorrelativoCTLoading(true);
            const response = await invoiceService.buscarCorrelativosPorTipo('CT'); // Assuming 'CT' is the document type for Control Number

            if (response && response.status) {
                setCorrelativoCT(response);
                setNoCorrelativoCTAlert(false);
            } else {
                console.error('Error fetching correlativo CT:', response);
                toast.error(response?.message || 'Error al obtener el correlativo CT');
                setCorrelativoCT(null);
                setNoCorrelativoCTAlert(true);
            }
        } catch (error: any) {
            console.error('Error fetching correlativo CT:', error);
            toast.error(error.message || 'Error al obtener el correlativo CT');
            setCorrelativoCT(null);
            setNoCorrelativoCTAlert(true);
        } finally {
            setCorrelativoCTLoading(false);
        }
    };

    useEffect(() => {
        fetchCorrelativoCT();
    }, []);

    /*
    useEffect(() => {
        const fetchCorrelativo = async () => {
            try {
                setCorrelativoLoading(true);
                const response = await invoiceService.buscarCorrelativosPorTipo('FA'); // Assuming 'FA' is the document type for invoices

                if (response && response.status) {
                    setCorrelativo(response);
                    setNoCorrelativoAlert(false); // Clear the alert if correlativo is found
                } else {
                    console.error('Error fetching correlativo:', response);
                    toast.error(response?.message || 'Error al obtener el correlativo');
                    setCorrelativo(null);
                    setNoCorrelativoAlert(true); // Set the alert to true
                }
            } catch (error: any) {
                console.error('Error fetching correlativo:', error);
                toast.error(error.message || 'Error al obtener el correlativo');
                setCorrelativo(null);
                setNoCorrelativoAlert(true); // Set the alert to true
            } finally {
                setCorrelativoLoading(false);
            }
        };

        fetchCorrelativo();
    }, []);
    */

    const fetchCustomers = useCallback(async () => {
        try {
            setCustomerListLoading(true);  // Start loading for Customer List
        } catch (error: any) {
            console.error('Error fetching customers:', error);
            toast.error(error.message || 'Error al cargar los clientes');
        } finally {
            setCustomerListLoading(false);
        }
    }, []);

    useEffect(() => {
        //fetchCustomers(); REMOVED: Unnecessary function
    }, [fetchCustomers]);

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value.toLowerCase());
        setCurrentPage(1); // Reset to first page on search
    };
    const handleCustomerSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCustomerSearchTerm(event.target.value.toLowerCase());
    };

    const handlePageClick = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    // Apply the filter
    const filteredProductsList = products.filter(
        product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate pagination values
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredProductsList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredProductsList.length / itemsPerPage);

    const handleSelectCustomer = (client: Client) => {
        setCustomer({
            razonSocial: client.razonSocial,
            registroFiscal: client.registroFiscal,
            direccionFiscal: client.direccionFiscal,
            email: client.email,
            telefono: client.telefono,
            direccionEnvio: client.direccionEnvio,
        });
        setCustomerModalOpen(false);
    };

    const handleOpenRifSearchModal = () => {
        console.log('handleOpenRifSearchModal');
        setRifSearchModalOpen(true);
        setRifSearchTerm(""); // Clear any previous search term
        setRifSearchResult(null);
    };

    const handleCloseRifSearchModal = () => {
        setRifSearchModalOpen(false);
        setRifSearchResult(null); // Clear any previous search result
    };

    const handleSearchByRif = async () => {
        console.log('handleSearchByRif');
        try {
            setRifSearchLoading(true);
            const apiResponse = await invoiceService.getCustomersByRif(rifSearchTerm);

            if (apiResponse && typeof apiResponse === 'object' && apiResponse !== null) {
                if ((apiResponse as any).status === true) {
                    const adaptedClient: Client = {
                        id: (apiResponse as any).id || '',
                        razonSocial: (apiResponse as any).razonSocial || '',
                        registroFiscal: (apiResponse as any).registroFiscal || '',
                        direccionFiscal: (apiResponse as any).direccionFiscal || '',
                        email: (apiResponse as any).email || '',
                        telefono: (apiResponse as any).telefono || '',
                        direccionEnvio: (apiResponse as any).direccionEnvio || '',
                        createdAt: (apiResponse as any).createdAt || '',
                        totalCompras: parseFloat(((apiResponse as any).totalCompras ?? '0').toString()),
                        ultimaCompra: (apiResponse as any).ultimaCompra || ''
                    };
                    setRifSearchResult(adaptedClient);

                } else {
                    toast.error((apiResponse as any)?.message || 'No se encontró ningún cliente con el RIF proporcionado.');
                    setRifSearchResult(null);
                }
            } else {
                toast.error('Error: Respuesta de la API inválida.');
                setRifSearchResult(null);
            }

        } catch (error: any) {
            console.error('Error fetching customer by RIF:', error);
            toast.error(error.message || 'Error al buscar el cliente por RIF');
            setRifSearchResult(null);
        } finally {
            setRifSearchLoading(false);
        }
    };

    const handleSetCustomerFromRifSearch = () => {
        if (rifSearchResult) {
            setCustomer({
                razonSocial: rifSearchResult.razonSocial,
                registroFiscal: rifSearchResult.registroFiscal,
                direccionFiscal: rifSearchResult.direccionFiscal,
                email: rifSearchResult.email,
                telefono: rifSearchResult.telefono,
                direccionEnvio: rifSearchResult.direccionEnvio,
            });
            setRifSearchModalOpen(false);
            setRifSearchResult(null);
        }
    };


    const handleAddProduct = (product: Product) => {
        addItem({
            codigo: product.id,
            descripcion: product.name,
            cantidad: 1,
            precio_unitario: product.price,
            monto: product.price,
            monto_total: product.taxable ? product.price * (1 + (product.taxRate || 0) / 100) : product.price,
            monto_iva: product.taxable ? product.price * ((product.taxRate || 0) / 100) : 0,
            monto_descuento: 0,
            porcentaje_descuento: 0,
            porcentaje_iva: product.taxRate || 0,
            es_exento: !product.taxable,
        });

        toast.success(`${product.name} agregado al carrito`);
    };

    const updateQuantity = (id: string, newQuantity: number) => {
        if (newQuantity > 0) {
            updateItem(id, { cantidad: newQuantity });
        }
    };

    const handleCompleteSale = async (paymentData: any, onCredit: boolean = false) => {
        if (items.length === 0) {
            toast.error('El carrito está vacío');
            return;
        }

        if (!customer.razonSocial || !customer.registroFiscal) {
            setCustomerModalOpen(true);
            return;
        }

        if (!onCredit && !paymentData) {
            setShowCreditOption(true);
            return;
        }

        // ************************* FETCH THE CORRELATIVO HERE ******************************
        let correlativo: CorrelativoResponse | null = null;
        try {
            setCorrelativoLoading(true);
            const response = await invoiceService.buscarCorrelativosPorTipo('FA'); // Assuming 'FA' is the document type for invoices

            if (response && response.status) {
                correlativo = response;
                setNoCorrelativoAlert(false); // Clear the alert if correlativo is found
            } else {
                console.error('Error fetching correlativo:', response);
                toast.error(response?.message || 'Error al obtener el correlativo');
                correlativo = null;
                setNoCorrelativoAlert(true); // Set the alert to true
            }
        } catch (error: any) {
            console.error('Error fetching correlativo:', error);
            toast.error(error.message || 'Error al obtener el correlativo');
            correlativo = null;
            setNoCorrelativoAlert(true); // Set the alert to true
        } finally {
            setCorrelativoLoading(false);
        }

        if (!correlativo) {
            return;
        }

        // ************************* FETCH THE CORRELATIVO CT HERE ******************************
        let correlativoCT: CorrelativoResponse | null = null;
        try {
            setCorrelativoCTLoading(true);
            const response = await invoiceService.buscarCorrelativosPorTipo('CT');

            if (response && response.status) {
                correlativoCT = response;
                setNoCorrelativoCTAlert(false);
            } else {
                console.error('Error fetching correlativo CT:', response);
                toast.error(response?.message || 'Error al obtener el correlativo CT');
                correlativoCT = null;
                setNoCorrelativoCTAlert(true);
            }
        } catch (error: any) {
            console.error('Error fetching correlativo CT:', error);
            toast.error(error.message || 'Error al obtener el correlativo CT');
            correlativoCT = null;
            setNoCorrelativoCTAlert(true);
        } finally {
            setCorrelativoCTLoading(false);
        }

        if (!correlativoCT) {
            return;
        }


        try {
            setLoading(true);

            const now = new Date();
            const formattedDate = now.toISOString().split('T')[0] + ' ' +
                now.toTimeString().split(' ')[0];

            // Use the correlativo number before incrementing it
            const invoiceNumber = Number(correlativo.ultimo_numero);
            // const controlNumber = Number(invoiceNumber); //SAME VALUE
            const controlNumber = Number(correlativoCT.ultimo_numero); // Usar el correlativo de CT
            // const updatedNumber = invoiceNumber + 1;
            const updatedNumber = Number(invoiceNumber); // Ensure it's treated as a number
            const updatedNumberCT = Number(controlNumber);

            // Calculate totals in VES based on currency and exchange rate
            const totalGeneralVES = paymentData?.paymentCurrency === 'USD' ? (totals.grandTotal * paymentData?.exchangeRate) : totals.grandTotal;
            const montoExentoVES = paymentData?.paymentCurrency === 'USD' ? (totals.exemptAmount * paymentData?.exchangeRate) : totals.exemptAmount;
            const baseImponibleVES = paymentData?.paymentCurrency === 'USD' ? (totals.taxableAmount * paymentData?.exchangeRate) : totals.taxableAmount;
            const subtotalVES = paymentData?.paymentCurrency === 'USD' ? (totals.subtotal * paymentData?.exchangeRate) : totals.subtotal;
            const montoIvaVES = paymentData?.paymentCurrency === 'USD' ? (totals.tax * paymentData?.exchangeRate) : totals.tax;
            const igtfVES = paymentData?.paymentCurrency === 'USD' ? (totals.igtf * paymentData?.exchangeRate) : totals.igtf;

            const documento: Document = {
                tipo_documento: 'FA',
                numero_documento: invoiceNumber, // Convert invoice number to string
                numero_control: controlNumber, // Convert control number to string
                fecha_emision: formattedDate,
                razon_social: customer.razonSocial,
                registro_fiscal: customer.registroFiscal,
                direccion_fiscal: customer.direccionFiscal || 'Dirección no especificada',
                e_mail: customer.email || 'cliente@ejemplo.com',
                telefono: 'No especificado',
                descripcion: 'Venta de productos',
                moneda_principal: 'VES', // Base currency is VES
                balance_anterior: 0,
                monto_exento: montoExentoVES,
                base_imponible: baseImponibleVES,
                subtotal: subtotalVES,
                monto_iva: montoIvaVES,
                porcentaje_iva: 16,
                base_reducido: 0,
                monto_iva_reducido: 0,
                porcentaje_iva_reducido: 0, // Added missing property
                total: totals.grandTotal,
                base_igtf: totals.grandTotal,
                monto_igtf: igtfVES,
                porcentaje_igtf: 3,
                total_general: totalGeneralVES,
                conversion_moneda: paymentData?.currency || 'VES',
                tasa_cambio: paymentData?.exchangeRate || 1,
                direccion_envio: customer.direccionEnvio || 'test',
                serie_strong_id: 'POS-' + Date.now().toString(),
                serie: correlativo?.serie || '', // Ensure serie is not undefined
                usuario: user?.username || 'usuario',
                status: 'PROCESADO', // Even for credit, set it to PROCESSED initially
                motivo_anulacion: '',
                tipo_documento_afectado: '',
                numero_documento_afectado: undefined
            };

            const detalles: Detail[] = items.map((item) => {
                const itemMontoExentoVES = paymentData?.paymentCurrency === 'USD' ? (item.monto * paymentData?.exchangeRate) : item.monto;
                const itemMontoTotalVES = paymentData?.paymentCurrency === 'USD' ? (item.monto_total * paymentData?.exchangeRate) : item.monto_total;
                const itemMontoIvaVES = paymentData?.paymentCurrency === 'USD' ? (item.monto_iva * paymentData?.exchangeRate) : item.monto_iva;

                return {
                    codigo: item.codigo,
                    descripcion: item.descripcion,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_unitario,
                    monto: itemMontoExentoVES,
                    monto_total: itemMontoTotalVES,
                    monto_iva: itemMontoIvaVES,
                    monto_descuento: item.monto_descuento,
                    porcentaje_descuento: item.porcentaje_descuento,
                    porcentaje_iva: item.porcentaje_iva,
                    es_exento: item.es_exento,
                };
            });

            const invoiceRequest: InvoiceRequest = {
                documento,
                detalles,
            };

            try {
                const response = await invoiceService.createInvoice(invoiceRequest);

                console.log("Create Invoice Response:", response);

                if (response && response.status) {
                    // Now, after the invoice is successfully created, update the correlative:
                    if (correlativo) {
                        try {
                            await invoiceService.updateCorrelativo(correlativo.tipo_documento, { ultimo_numero: updatedNumber + 1 });
                            toast.success(`Correlativo FA actualizado correctamente a: ${updatedNumber + 1}`);

                        } catch (updateError: any) {
                            console.error('Error updating correlativo after creating the invoice', updateError);
                            toast.error("Factura creada, pero hubo un error actualizando el número correlativo FA. Contacte al administrador");
                        }
                    }

                    // Update correlativo CT
                    if (correlativoCT) {
                        try {
                            await invoiceService.updateCorrelativo(correlativoCT.tipo_documento, { ultimo_numero: updatedNumberCT + 1 });
                            toast.success(`Correlativo CT actualizado correctamente a: ${updatedNumberCT + 1}`);
                        } catch (updateError: any) {
                            console.error('Error updating correlativo CT after creating the invoice', updateError);
                            toast.error("Factura creada, pero hubo un error actualizando el número correlativo CT. Contacte al administrador");
                        }
                    }

                    if (!onCredit && paymentData && paymentData.isPaid) {
                        // Determine correct payment description based on currency
                        const paymentDescription = paymentData.currency === 'VES' ? 'Transferencia Bs' : 'Transferencia USD';

                        // Validate paymentData.amount and provide a default value if needed
                        const paymentAmount = paymentData.amount && !isNaN(parseFloat(paymentData.amount)) ? parseFloat(paymentData.amount).toFixed(2) : '0.00';

                        // Determine reference based on payment method
                        let paymentReference = paymentData.reference;
                        let banco = paymentData.banco;
                        if (paymentData.metodoPago === 'efectivo') {
                            paymentReference = `Pago efectivo ${paymentData.currency} A factura: ${controlNumber} fecha: ${formattedDate}`;
                            banco = `Efectivo ${paymentData.currency}`;
                        }

                        // Construct PagoRequest
                        const pagoRequest: PagoRequest = {
                            documento_afectado: documento.numero_control,  // Or use the actual invoice number, if available
                            desc_tipo_pago: paymentDescription,
                            monto: parseFloat(paymentAmount), // Convert paymentAmount to a number
                            fecha_pago: formattedDate,
                            usuario: user?.username || 'usuario',
                            tasa_cambio: parseFloat(paymentData.exchangeRate),
                            moneda: paymentData.currency, // Correct currency (VES or USD)
                            referencia: paymentReference, // Using the conditional paymentReference
                            banco: banco,
                            status: 'PROCESADO'  //  or a similar status that your backend recognizes
                        };

                        try {
                            // Register payment
                            const paymentResponse = await invoiceService.registerPayment(pagoRequest);
                            console.log('Payment registered successfully:', paymentResponse);
                            toast.success('Pago registrado con éxito');
                        } catch (paymentError: any) {
                            console.error('Error al registrar el pago:', paymentError);
                            toast.error(paymentError.message || 'Error al registrar el pago');
                        }
                    } else if (onCredit) {
                        toast.success('Venta a crédito completada con éxito');
                    }

                    clearCart();
                    toast.success('Venta completada con éxito');
                    setPaymentModalOpen(false);

                    // *NOW* navigate to the invoice details page, using the controlNumber we already generated
                    navigate(`/invoices/${controlNumber}`);

                } else {
                    // Handle invoice creation failure
                    console.error("Error in response in createInvoice function", response)
                    toast.error('Error al procesar la venta. Por favor, contacte al administrador.');
                }
            }
            catch (error: any) {
                console.error('Error al completar la venta:', error);
                toast.error(error.message || 'Error al procesar la venta');
            }

        } catch (error) {
            console.error('Error al completar la venta:', error);
            toast.error('Error al procesar la venta');
        } finally {
            setLoading(false);
            setShowCreditOption(false);
        }
    };
    const handleProcessOnCredit = () => {
        // Call complete sale without payment data, to indicate it's on credit
        handleCompleteSale(null, true);
        setShowCreditOption(false); // close this after processing
    };

    const showPaymentButtons = items.length > 0 && customer.razonSocial && customer.registroFiscal;

    return (

        <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row">
            {/* Left side - Product Selection */}
            <div className="w-full md:w-2/3 p-4 overflow-auto h-1/2 md:h-full">
                <div className="flex flex-col h-full">
                    <div className="flex-none">
                        <h2 className="text-2xl font-bold mb-4">Punto de Venta</h2>

                        {/* Search */}
                        <div className="mb-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    className="input pl-10 w-full"
                                    placeholder="Buscar producto..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Categories (simplified) */}
                        <div className="mb-4 flex overflow-x-auto space-x-2 pb-2">
                            <button className="px-4 py-2 bg-primary-600 text-white rounded-full text-sm whitespace-nowrap">
                                Todos
                            </button>
                            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full text-sm whitespace-nowrap">
                                Electrónicos
                            </button>
                            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full text-sm whitespace-nowrap">
                                Servicios
                            </button>
                            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full text-sm whitespace-nowrap">
                                Accesorios
                            </button>
                        </div>
                    </div>

                    {/* Products grid */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {loading ? (
                                <div className="col-span-full py-8 flex justify-center">
                                    <LoadingSpinner text="Cargando productos..." />
                                </div>
                            ) : (
                                currentItems.map((product) => (
                                    <div
                                        key={product.id}
                                        className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-medium text-gray-900">{product.name}</h3>
                                                <p className="text-sm text-gray-500">{product.id}</p>
                                            </div>
                                            <div className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded">
                                                {product.taxable ? 'Gravado' : 'Exento'}
                                            </div>
                                        </div>
                                        <div className="mt-2 flex justify-between items-end">
                                            <span className="text-lg font-bold text-gray-900">VES {parseFloat(product.price.toString()).toFixed(2)}</span>
                                            <button
                                                onClick={() => handleAddProduct(product)}
                                                className="flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white rounded p-1"
                                            >
                                                <Plus className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                            {filteredProductsList.length === 0 && !loading && (
                                <div className="col-span-full py-8 text-center text-gray-500">
                                    No se encontraron productos que coincidan con la búsqueda
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Pagination */}
                    {filteredProductsList.length > 0 && (
                        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                            <div className="flex items-center justify-between">
                                <div className="hidden sm:block">
                                    <p className="text-sm text-gray-700">
                                        Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a{' '}
                                        <span className="font-medium">
                                            {Math.min(indexOfLastItem, filteredProductsList.length)}
                                        </span>{' '}
                                        de <span className="font-medium">{filteredProductsList.length}</span> resultados
                                    </p>
                                </div>
                                <div className="flex-1 flex justify-center sm:justify-end">
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button
                                            onClick={() => handlePageClick(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                        >
                                            <span className="sr-only">Anterior</span>
                                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </button>

                                        {Array.from({ length: totalPages }, (_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handlePageClick(index + 1)}
                                                aria-current={currentPage === index + 1 ? 'page' : undefined}
                                                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${currentPage === index + 1 ? 'z-10 bg-primary-50 border-primary-500 text-primary-600' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                {index + 1}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => handlePageClick(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                        >
                                            <span className="sr-only">Siguiente</span>
                                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right side - Cart */}
            <div className="w-full md:w-1/3 bg-gray-50 border-l border-gray-200 p-4 flex flex-col h-1/2 md:h-full overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center">
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Carrito
                    </h2>

                    <div className="flex gap-2">
                        <button
                            onClick={() => handleOpenRifSearchModal()}
                            className="btn btn-secondary btn-sm flex items-center"
                        >
                            <Info className="h-4 w-4 mr-1" />
                            RIF
                        </button>
                        {/* <button
                        onClick={() => handleOpenCustomerModal()}
                        className="btn btn-secondary btn-sm flex items-center"
                    >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Cliente
                    </button>  REMOVED BUTTON */}
                    </div>

                </div>

                {/* Customer info */}
                {customer.razonSocial && (
                    <div className="bg-white p-3 rounded mb-4 text-sm">
                        <div className="font-medium">{customer.razonSocial}</div>
                        <div className="text-gray-600">{customer.registroFiscal}</div>
                    </div>
                )}

                {/* Cart items */}
                <div className="flex-1 overflow-y-auto">
                    {items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text items-center justify-center text-gray-500">
                            <Package className="h-12 w-12 mb-2" />
                            <p>El carrito está vacío</p>
                        </div>
                    ) : (
                        <div className="space-y-3">{items.map((item) => (
                            <div key={item.codigo} className="bg-white p-3 rounded shadow-sm">
                                <div className="flex justify-between">
                                    <div className="flex-1">
                                        <div className="font-medium">{item.descripcion}</div>
                                        <div className="text-sm text-gray-500">{item.codigo}</div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <button
                                            onClick={() => removeItem(item.codigo)}
                                            className="text-gray-400 hover:text-error-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-2 flex justify-between items-center">
                                    <div className="flex items-center border rounded">
                                        <button
                                            onClick={() => updateQuantity(item.codigo, item.cantidad - 1)}
                                            className="px-2 py-1 text-gray-500 hover:bg-gray-100"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="px-2 py-1 text-center w-10">{item.cantidad}</span>
                                        <button
                                            onClick={() => updateQuantity(item.codigo, item.cantidad + 1)}
                                            className="px-2 py-1 text-gray-500 hover:bg-gray-100"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>

                                    <div className="text-right">
                                        <div className="font-bold">VES {(item.monto_total).toFixed(2)}</div>
                                        <div className="text-xs text-gray-500">
                                            VES {item.precio_unitario.toFixed(2)} x {item.cantidad}
                                            {item.monto_iva > 0 && ` + IVA ${item.porcentaje_iva}%`}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        </div>
                    )}
                </div>

                {/* Cart summary */}
                <div className="mt-4 bg-white rounded p-4 border-t border-gray-200">
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>VES {totals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>IVA (16%):</span>
                            <span>VES {totals.tax.toFixed(2)}
                            </span>
                        </div>                        {totals.igtf > 0 && (
                            <div className="flex justify-between">                                <span>IGTF (3%):</span>
                                <span>VES {totals.igtf.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold border-t border-gray-200 pt-2 mt-2">
                            <span>Total:</span>
                            <span>VES {totals.grandTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Conditionally render payment buttons */}
                    {showPaymentButtons && !noCorrelativoAlert && !correlativoLoading && !noCorrelativoCTAlert && !correlativoCTLoading && (
                        <div className="mt-4 flex flex-col space-y-2">
                            {/* Display "Process on Credit" button only if it's enabled in backend */}
                            <button
                                onClick={() => setShowCreditOption(true)}
                                className="btn btn-secondary flex-1 flex justify-center items-center"
                                disabled={correlativoLoading || noCorrelativoAlert || correlativoCTLoading || noCorrelativoCTAlert}
                            >
                                <CreditCard className="h-4 w-4 mr-1" />
                                A Crédito
                            </button>

                            <button
                                onClick={() => setPaymentModalOpen(true)}
                                className="btn btn-primary flex-1 flex justify-center items-center"
                                disabled={correlativoLoading || noCorrelativoAlert || correlativoCTLoading || noCorrelativoCTAlert}
                            >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Pagar
                            </button>
                            {showCreditOption && (
                                <ConfirmationModal
                                    message="¿Desea procesar la venta a crédito?"
                                    onConfirm={handleProcessOnCredit}
                                    onCancel={() => setShowCreditOption(false)}
                                />
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* Customer Modal */}
            {customerModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl animate-slide-up">


                        <div className="flex justify-end space-x-3 pt-4">
                            <button type="button"
                                className="btn btn-secondary"
                                onClick={() => setCustomerModalOpen(false)}
                            >
                                Cancelar
                            </button>

                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {paymentModalOpen && (
                <PaymentModal
                    total={totals.grandTotal}
                    onClose={() => setPaymentModalOpen(false)}
                    onComplete={handleCompleteSale}
                    loading={loading}
                />
            )}
            {/* RIF Search Modal */}
            {rifSearchModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl animate-slide-up">
                        <h3 className="text-xl font-bold mb-4">Buscar Cliente por RIF</h3>
                        <div className="mb-4">
                            <label htmlFor="rifSearch" className="label">
                                Ingrese el RIF del cliente:
                            </label>
                            <input
                                type="text"
                                id="rifSearch"
                                className="input"
                                value={rifSearchTerm}
                                onChange={(e) => setRifSearchTerm(e.target.value)}
                                placeholder="Ej: J-12345678-9"
                            />
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button type="button"
                                className="btn btn-secondary"
                                onClick={handleCloseRifSearchModal}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleSearchByRif}
                                disabled={rifSearchLoading}
                            >
                                {rifSearchLoading ? (
                                    <LoadingSpinner size="sm" text="" />
                                ) : (
                                    "Buscar"
                                )}
                            </button>
                        </div>

                        {rifSearchResult && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <h4 className="font-semibold">Cliente Encontrado:</h4>
                                <p>Razón Social: {rifSearchResult.razonSocial}</p>
                                <p>RIF: {rifSearchResult.registroFiscal}</p>
                                <div className="mt-3">
                                    <button
                                        className="btn btn-success"
                                        onClick={handleSetCustomerFromRifSearch}
                                    >
                                        Seleccionar Cliente
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Show Credit Option Confirmation Modal */}
            {showCreditOption && (
                <ConfirmationModal
                    message="¿Procesar la venta a crédito?"
                    onConfirm={handleProcessOnCredit}
                    onCancel={() => setShowCreditOption(false)}
                />
            )}

            {/* Correlativo Loading Overlay */}
            {correlativoLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <LoadingSpinner text="Cargando correlativo FA..." />
                </div>
            )}

            {/* No Correlativo Alert */}
            {noCorrelativoAlert && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl animate-slide-up">
                        <div className="flex items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-error-100 sm:mx-0 sm:h-10 sm:w-10">
                                <AlertTriangle className="h-6 w-6 text-error-600" aria-hidden="true" />
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    Error
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        No se encontró información del correlativo FA.  Por favor, contacte al administrador.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setNoCorrelativoAlert(false)}
                            >
                                Aceptar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Correlativo CT Loading Overlay */}
            {correlativoCTLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <LoadingSpinner text="Cargando correlativo CT..." />
                </div>
            )}

            {/* No Correlativo CT Alert */}
            {noCorrelativoCTAlert && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl animate-slide-up">
                        <div className="flex items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-error-100 sm:mx-0 sm:h-10 sm:w-10">
                                <AlertTriangle className="h-6 w-6 text-error-600" aria-hidden="true" />
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    Error
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        No se encontró información del correlativo CT.  Por favor, contacte al administrador.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setNoCorrelativoCTAlert(false)}
                            >
                                Aceptar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Payment Modal Component
interface PaymentModalProps {
    total: number;
    onClose: () => void;
    onComplete: (data: any) => void;
    loading: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ total, onClose, onComplete, loading }) => {
    const [paymentMethod, setPaymentMethod] = useState('efectivo');
    const [amount, setAmount] = useState(''); // Initialize as empty string
    const [reference, setReference] = useState('');
    const [bank, setBank] = useState(' ');
    const [isPaid, setIsPaid] = useState(true);
    const [currency, setCurrency] = useState('VES'); // Default to VES
    const [exchangeRate, setExchangeRate] = useState('1');
    const [paymentCurrency, setPaymentCurrency] = useState('VES');
    const [amountError, setAmountError] = useState('');
    useEffect(() => {
        // Update amount when total changes to keep the value updated on VES, formatted to 2 decimal places
        setAmount(total.toFixed(2));
    }, [total]);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) {
            setAmountError('El monto es requerido');
            return;
        }

        const paymentData = {
            metodoPago: paymentMethod,
            amount: amount, // Use the formatted amount from state
            referencia: reference,
            banco: bank,
            isPaid: true, //Mark as paid is always true, since now credit option is shown before calling to the Payment modal
            currency: currency,
            exchangeRate: parseFloat(exchangeRate),
            paymentCurrency: paymentCurrency, // Add paymentCurrency
            //  total:total
        };

        onComplete(paymentData);
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

export default POS;