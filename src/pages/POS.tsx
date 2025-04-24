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
    Info
} from 'lucide-react';
import { useCartStore, getCartTotals } from '../stores/cartStore';
import { invoiceService } from '../services/api';
import { InvoiceRequest, Document, Detail, Product, GetProductsResponse, Client } from '../types/api';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';

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

    const handleCompleteSale = async (paymentData: any) => {
        if (items.length === 0) {
            toast.error('El carrito está vacío');
            return;
        }

        if (!customer.razonSocial || !customer.registroFiscal) {
            setCustomerModalOpen(true);
            return;
        }

        try {
            setLoading(true);

            const now = new Date();
            const formattedDate = now.toISOString().split('T')[0] + ' ' +
                now.toTimeString().split(' ')[0];

            let invoiceNumber = '1';

            const documento: Document = {
                tipo_documento: 'FA',
                numero_documento: invoiceNumber,
                numero_control: invoiceNumber,
                fecha_emision: formattedDate,
                razon_social: customer.razonSocial,
                registro_fiscal: customer.registroFiscal,
                direccion_fiscal: customer.direccionFiscal || 'Dirección no especificada',
                e_mail: customer.email || 'cliente@ejemplo.com',
                telefono: 'No especificado',
                descripcion: 'Venta de productos',
                moneda_principal: 'USD',
                balance_anterior: 0,
                monto_exento: totals.exemptAmount,
                base_imponible: totals.taxableAmount,
                subtotal: totals.subtotal,
                monto_iva: totals.tax,
                porcentaje_iva: 16,
                base_reducido: 0,
                monto_iva_reducido: 0,
                porcentaje_iva_reducido: 0,
                total: totals.total,
                base_igtf: totals.total,
                monto_igtf: totals.igtf,
                porcentaje_igtf: 3,
                total_general: totals.grandTotal,
                conversion_moneda: paymentData.moneda || 'USD',
                tasa_cambio: paymentData.tasaCambio || 1,
                direccion_envio: customer.direccionEnvio || 'test',
                serie_strong_id: 'POS-' + Date.now().toString(),
                serie: 'A',
                usuario: user?.username || 'usuario',
                status: 'PROCESADO',
                motivo_anulacion: '',
                tipo_documento_afectado: '',
                numero_documento_afectado: ''
            };

            const detalles: Detail[] = items.map((item) => ({
                codigo: item.codigo,
                descripcion: item.descripcion,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                monto: item.monto,
                monto_total: item.monto_total,
                monto_iva: item.monto_iva,
                monto_descuento: item.monto_descuento,
                porcentaje_descuento: item.porcentaje_descuento,
                porcentaje_iva: item.porcentaje_iva,
                es_exento: item.es_exento,
            }));

            const invoiceRequest: InvoiceRequest = {
                documento,
                detalles,
            };

            try {
                const response = await invoiceService.createInvoice(invoiceRequest);

                if (paymentData.isPaid) {
                    //  implement registerPayment
                }

                clearCart();

                toast.success('Venta completada con éxito');
                setPaymentModalOpen(false);

                navigate(`/invoices/${invoiceNumber}`);
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
        }
    };

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
                                            <span className="text-lg font-bold text-gray-900">${parseFloat(product.price.toString()).toFixed(2)}</span>
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
                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
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
                                            <div className="font-bold">${(item.monto_total).toFixed(2)}</div>
                                            <div className="text-xs text-gray-500">
                                                ${item.precio_unitario.toFixed(2)} x {item.cantidad}
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
                            <span>${totals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>IVA (16%):</span>
                            <span>${totals.tax.toFixed(2)}</span>
                        </div>
                        {totals.igtf > 0 && (
                            <div className="flex justify-between">
                                <span>IGTF (3%):</span>
                                <span>${totals.igtf.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold border-t border-gray-200 pt-2 mt-2">
                            <span>Total:</span>
                            <span>${totals.grandTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="mt-4 flex space-x-2">
                        <button
                            onClick={() => clearCart()}
                            className="btn btn-secondary flex-1 flex justify-center items-center"
                            disabled={items.length === 0}
                        >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Limpiar
                        </button>
                        <button
                            onClick={() => setPaymentModalOpen(true)}
                            className="btn btn-primary flex-1 flex justify-center items-center"
                            disabled={items.length === 0}
                        >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pagar
                        </button>
                    </div>
                </div>
            </div>

            {/* Customer Modal */}
            {customerModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl animate-slide-up">
                        <h3 className="text-xl font-bold mb-4">Información del cliente</h3>
                         <div className="relative mb-4">
                            <input
                                type="text"
                                className="input pl-10 w-full"
                                placeholder="Buscar cliente..."
                                value={customerSearchTerm}
                                onChange={handleCustomerSearch}
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="h-5 w-5 text-gray-400"  viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"/>
                            </div>
                        </div>
                      {/* <div className="h-40 overflow-y-auto">  REMOVED CUSTOMER LIST FUNCTIONALITY
                            {loading ? (
                                <div className="flex justify-center">
                                    <LoadingSpinner size="sm" text="Cargando clientes..." />
                                </div>
                            ) :  (
                                filteredCustomers.map(client => (
                                    <div
                                        key={client.id}
                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                        onClick={() => {
                                            setCustomer({
                                                razonSocial: client.razonSocial,
                                                registroFiscal: client.registroFiscal,
                                                direccionFiscal: client.direccionFiscal,
                                                email: client.email,
                                                telefono: client.telefono,
                                                direccionEnvio: client.direccionEnvio,
                                            });
                                            setCustomerModalOpen(false);
                                        }}
                                    >
                                        {client.razonSocial} ({client.registroFiscal})
                                    </div>
                                ))
                            )}
                    </div> */}

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
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
    const [amount, setAmount] = useState(total.toString());
    const [reference, setReference] = useState('');
    const [bank, setBank] = useState(' ');
    const [isPaid, setIsPaid] = useState(true);
    const [currency, setCurrency] = useState('USD');
    const [exchangeRate, setExchangeRate] = useState('1');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const paymentData = {
            metodoPago: paymentMethod,
            monto: parseFloat(amount),
            referencia: reference,
            banco: bank,
            isPaid,
            moneda: currency,
            tasaCambio: parseFloat(exchangeRate),
        };

        onComplete(paymentData);
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
                        <div className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</div>
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
                            className="input"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="0"
                            step="0.01"
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
                                onChange={(e) => setCurrency(e.target.value)}
                            >
                                <option value="USD">USD</option>
                                <option value="VES">VES</option>
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
                                required
                            />
                        </div>
                    </div>

                    {paymentMethod === 'transferencia' && (
                        <>
                            <div>
                                <label htmlFor="reference" className="label">Referencia</label>
                                <input
                                    type="text"
                                    id="reference"
                                    className="input"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    required={paymentMethod === 'transferencia'}
                                />
                            </div>

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
                            disabled={loading}
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