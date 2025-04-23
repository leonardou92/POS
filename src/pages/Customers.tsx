// components/Customers.tsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
    Search,
    UserPlus,
    Edit,
    Trash2,
    Phone,
    Mail,
    MapPin,
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { invoiceService } from '../services/api';
import { Client } from '../types/api';

const Customers: React.FC = () => {
    const [customers, setCustomers] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Client | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const [formData, setFormData] = useState<Omit<Client, 'id' | 'createdAt' | 'totalCompras' | 'ultimaCompra'>>({
        razonSocial: '',
        registroFiscal: '',
        direccionFiscal: '',
        email: '',
        telefono: '',
        direccionEnvio: '',
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                setLoading(true);
                const apiResponse = await invoiceService.getCustomers();

                 // Check if the API call succeeded and the response is in the expected format
                if (apiResponse && typeof apiResponse === 'object' && apiResponse !== null && 'status' in apiResponse && 'clientes' in apiResponse) {
                    // Extract 'clientes' array from API response
                    const { status, clientes } = apiResponse as { status: boolean; clientes: Client[] };

                    if (!status) {
                        console.error("API returned error status:", apiResponse);
                        toast.error("Error al cargar los clientes: La API retornó un estado de error.");
                        return;
                    }
                    // Ensure that 'clientes' is indeed an array
                    if (Array.isArray(clientes)) {
                        // Add a check for null or undefined values in each property
                        const safeClientes = clientes.map(customer => ({
                            ...customer,
                            razonSocial: customer.razonSocial || '',
                            registroFiscal: customer.registroFiscal || '',
                            email: customer.email || ''
                        }));
                        setCustomers(safeClientes);
                    } else {
                        console.error("API response's 'clientes' is not an array:", apiResponse);
                        toast.error("Error al cargar los clientes: La estructura de respuesta de la API es inválida.");
                    }
                } else {
                    // Log detailed error message and display a user-friendly message
                    console.error("Invalid API response:", apiResponse);
                    toast.error("Error al cargar los clientes: La API no devolvió los datos en el formato esperado.");
                }
            } catch (error: any) {
                console.error('Error fetching customers:', error);
                toast.error(error.message || 'Error al cargar los clientes');
            } finally {
                setLoading(false);
            }
        };

        fetchCustomers();
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

   const filteredCustomers = customers.filter(customer => {
        const searchLower = searchTerm.toLowerCase();
        // Add null checks for each property before calling toLowerCase()
        return (
            (customer.razonSocial && customer.razonSocial.toLowerCase().includes(searchLower)) ||
            (customer.registroFiscal && customer.registroFiscal.toLowerCase().includes(searchLower)) ||
            (customer.email && customer.email.toLowerCase().includes(searchLower))
        );
    });

    const handleOpenModal = (customer?: Client) => {
        if (customer) {
            setSelectedCustomer(customer);
            setFormData({
                razonSocial: customer.razonSocial,
                registroFiscal: customer.registroFiscal,
                direccionFiscal: customer.direccionFiscal,
                email: customer.email,
                telefono: customer.telefono,
                direccionEnvio: customer.direccionEnvio,
            });
        } else {
            setSelectedCustomer(null);
            setFormData({
                razonSocial: '',
                registroFiscal: '',
                direccionFiscal: '',
                email: '',
                telefono: '',
                direccionEnvio: '',
            });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            setLoading(true);

            if (!formData.razonSocial || !formData.registroFiscal) {
                toast.error('Los campos marcados con * son obligatorios');
                return;
            }

            if (selectedCustomer) {
                const updatedCustomers = customers.map(customer =>
                    customer.id === selectedCustomer.id
                        ? { ...customer, ...formData }
                        : customer
                );
                setCustomers(updatedCustomers);
                toast.success('Cliente actualizado con éxito (Simulado)');
            } else {
                const newCustomer: Client = {
                    id: Date.now().toString(),
                    ...formData,
                    createdAt: new Date().toISOString(),
                    totalCompras: 0,
                    ultimaCompra: '-',
                };
                setCustomers([...customers, newCustomer]);
                toast.success('Cliente creado con éxito (Simulado)');
            }

            setModalOpen(false);
        } catch (error: any) {
            console.error('Error saving customer:', error);
            toast.error(error.message || 'Error al guardar el cliente');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            setLoading(true);

            setCustomers(customers.filter(customer => customer.id !== id));
            setConfirmDelete(null);
            toast.success('Cliente eliminado con éxito (Simulado)');
        } catch (error: any) {
            console.error('Error deleting customer:', error);
            toast.error(error.message || 'Error al eliminar el cliente');
        } finally {
            setLoading(false);
        }
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

    const handlePageClick = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">Clientes</h1>

                <button
                    onClick={() => handleOpenModal()}
                    className="btn btn-primary flex items-center justify-center"
                >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Nuevo cliente
                </button>
            </div>

            <div className="bg-white rounded-lg shadow mb-6 p-4">
                <div className="relative">
                    <input
                        type="text"
                        className="input pl-10"
                        placeholder="Buscar por nombre, RIF o email..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 flex justify-center">
                        <LoadingSpinner text="Cargando clientes..." />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Cliente
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Contacto
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Dirección
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Compras
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentItems.length > 0 ? (
                                        currentItems.map((customer) => (
                                            <tr key={customer.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {customer.razonSocial}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {customer.registroFiscal}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        Cliente desde: {customer.createdAt}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900 flex items-center">
                                                        <Phone className="h-4 w-4 mr-1 text-gray-400" />
                                                        {customer.telefono}
                                                    </div>
                                                    <div className="text-sm text-gray-900 flex items-center mt-1">
                                                        <Mail className="h-4 w-4 mr-1 text-gray-400" />
                                                        {customer.email}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900 flex items-start">
                                                        <MapPin className="h-4 w-4 mr-1 text-gray-400 mt-1 flex-shrink-0" />
                                                        <div>
                                                            <div>{customer.direccionFiscal}</div>
                                                            {customer.direccionEnvio && customer.direccionEnvio !== customer.direccionFiscal && (
                                                                <div className="text-gray-500 mt-1">
                                                                    Envío: {customer.direccionEnvio}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        ${customer.totalCompras.toFixed(2)}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Última: {customer.ultimaCompra}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-medium">
                                                    <div className="flex justify-end space-x-2">
                                                        <button
                                                            onClick={() => handleOpenModal(customer)}
                                                            className="text-primary-600 hover:text-primary-900"
                                                        >
                                                            <Edit className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDelete(customer.id)}
                                                            className="text-error-600 hover:text-error-900"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                No se encontraron clientes
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {filteredCustomers.length > 0 && (
                            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="hidden sm:block">
                                        <p className="text-sm text-gray-700">
                                            Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a{' '}
                                            <span className="font-medium">
                                                {Math.min(indexOfLastItem, filteredCustomers.length)}
                                            </span>{' '}
                                            de <span className="font-medium">{filteredCustomers.length}</span> resultados
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
                    </>
                )}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl animate-slide-up">
                        <h2 className="text-lg font-bold mb-4">{selectedCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="razonSocial" className="block text-sm font-medium text-gray-700">
                                    Razón Social *
                                </label>
                                <input
                                    type="text"
                                    id="razonSocial"
                                    className="input"
                                    value={formData.razonSocial}
                                    onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="registroFiscal" className="block text-sm font-medium text-gray-700">
                                    Registro Fiscal *
                                </label>
                                <input
                                    type="text"
                                    id="registroFiscal"
                                    className="input"
                                    value={formData.registroFiscal}
                                    onChange={(e) => setFormData({ ...formData, registroFiscal: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="direccionFiscal" className="block text-sm font-medium text-gray-700">
                                    Dirección Fiscal
                                </label>
                                <input
                                    type="text"
                                    id="direccionFiscal"
                                    className="input"
                                    value={formData.direccionFiscal}
                                    onChange={(e) => setFormData({ ...formData, direccionFiscal: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    className="input"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">
                                    Teléfono
                                </label>
                                <input
                                    type="tel"
                                    id="telefono"
                                    className="input"
                                    value={formData.telefono}
                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="direccionEnvio" className="block text-sm font-medium text-gray-700">
                                    Dirección de Envío
                                </label>
                                <input
                                    type="text"
                                    id="direccionEnvio"
                                    className="input"
                                    value={formData.direccionEnvio}
                                    onChange={(e) => setFormData({ ...formData, direccionEnvio: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {confirmDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl animate-slide-up">
                        <h2 className="text-lg font-bold mb-4">Confirmar Eliminación</h2>
                        <p className="text-gray-700 mb-4">
                            ¿Estás seguro de que quieres eliminar este cliente?
                        </p>
                        <div className="flex justify-end space-x-2">
                            <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>
                                Cancelar
                            </button>
                            <button type="button" className="btn btn-error" onClick={() => handleDelete(confirmDelete)}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;