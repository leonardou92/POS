import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
    Search,
    Plus,
    Edit,
    Trash2,
    X,
    Check,
    PackageIcon // Using PackageIcon for Products
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { invoiceService } from '../services/api';
import { Product, GetProductsResponse } from '../types/api'; // Import the Product interface
import { useAuth } from '../hooks/useAuth'; // Import useAuth
import { useNavigate } from 'react-router-dom';

const Products: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [filteredProductsState, setFilteredProductsState] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const navigate = useNavigate();

    const [formData, setFormData] = useState<Omit<Product, 'id'>>({
        code: '',
        name: '',
        price: 0,
        taxable: false,
        taxRate: 0,
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const { user } = useAuth();  // Get the user object from useAuth

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);

                // Pass sucursal to getProducts
                const rawResponse = await invoiceService.getProducts(user?.sucursal);
                 const response = rawResponse as unknown as GetProductsResponse;

                 if (!response || !response.status || !Array.isArray(response.productos)) {
                   console.error("API returned invalid product data:", response);
                   toast.error("Error: Invalid product data received from API.");
                   setProducts([]);
                   setFilteredProductsState([]);
                   return;
                 }

                 const adaptedProducts: Product[] = response.productos.map(p => ({
                   id: p.id,
                   code: p.code,
                   name: p.name,
                   price: parseFloat(p.price.toString()),
                   taxable: p.taxable,
                   taxRate: parseFloat((p.taxRate ?? '0').toString())
                 }));

                 setProducts(adaptedProducts);
                 setFilteredProductsState(adaptedProducts);
            } catch (error: any) {
                console.error('Error fetching products:', error);
                toast.error(error.message || 'Error al cargar los productos');
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [user?.sucursal]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const filteredProducts = products.filter(product => {
        const searchLower = searchTerm.toLowerCase();
        return (
            product.name.toLowerCase().includes(searchLower) ||
            product.code.toLowerCase().includes(searchLower)
        );
    });

    const handleOpenModal = (product?: Product) => {
        if (product) {
            setSelectedProduct(product);
            setFormData({
                code: product.code,
                name: product.name,
                price: product.price,
                taxable: product.taxable,
                taxRate: product.taxRate || 0, // Ensure taxRate is handled correctly (default to 0 if null)
            });
        } else {
            setSelectedProduct(null);
            setFormData({
                code: '',
                name: '',
                price: 0,
                taxable: false,
                taxRate: 0,
            });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setLoading(true);

            // Validate required fields
            if (!formData.code || !formData.name) {
                toast.error('Los campos Código y Nombre son obligatorios');
                return;
            }

            if (selectedProduct) {
                // Update existing product (SIMULATED - API DOES NOT SUPPORT UPDATES)
                const updatedProducts = products.map(product =>
                    product.id === selectedProduct.id
                        ? { ...product, ...formData }
                        : product
                );
                setProducts(updatedProducts);
                toast.success('Producto actualizado con éxito (Simulado)');
            } else {
                // Create new product (SIMULATED - API DOES NOT SUPPORT CREATION)
                const newProduct: Product = {
                    id: Date.now().toString(),
                    ...formData,
                };
                setProducts([...products, newProduct]);
                toast.success('Producto creado con éxito (Simulado)');
            }

            setModalOpen(false);
        } catch (error: any) {
            console.error('Error saving product:', error);
            toast.error(error.message || 'Error al guardar el producto');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            setLoading(true);

            setProducts(products.filter(product => product.id !== id));
            setConfirmDelete(null);
            toast.success('Producto eliminado con éxito (Simulado)');
        } catch (error: any) {
            console.error('Error deleting product:', error);
            toast.error(error.message || 'Error al eliminar el producto');
        } finally {
            setLoading(false);
        }
    };

    // Get current products for pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

    const handlePageClick = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

     const handleGoBack = () => {
        navigate(-1); // Navigate back to the previous page
    };

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">Productos</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleOpenModal()}
                        className="btn btn-primary flex items-center justify-center"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Nuevo Producto
                    </button>
                     <button onClick={handleGoBack} className="btn">
                        Volver
                    </button>
                </div>
            </div>

            {/* Search and filters */}
            <div className="bg-white rounded-lg shadow mb-6 p-4">
                <div className="relative">
                    <input
                        type="text"
                        className="input pl-10"
                        placeholder="Buscar por nombre o código..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                </div>
            </div>

            {/* Products list */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 flex justify-center">
                        <LoadingSpinner text="Cargando productos..." />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Código
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Nombre
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Precio
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Impuesto
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentItems.length > 0 ? (
                                        currentItems.map((product) => (
                                            <tr key={product.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {product.code}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {product.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        ${product.price.toFixed(2)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {product.taxable ? `Sí (${product.taxRate}%)` : 'No'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-medium">
                                                    <div className="flex justify-end space-x-2">
                                                        <button
                                                            onClick={() => handleOpenModal(product)}
                                                            className="text-primary-600 hover:text-primary-900"
                                                        >
                                                            <Edit className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDelete(product.id)}
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
                                                No se encontraron productos
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {filteredProducts.length > 0 && (
                            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="hidden sm:block">
                                        <p className="text-sm text-gray-700">
                                            Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a{' '}
                                            <span className="font-medium">
                                                {Math.min(indexOfLastItem, filteredProducts.length)}
                                            </span>{' '}
                                            de <span className="font-medium">{filteredProducts.length}</span> resultados
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

            {/* Product Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl animate-slide-up">
                        <h2 className="text-lg font-bold mb-4">{selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                                    Código *
                                </label>
                                <input
                                    type="text"
                                    id="code"
                                    className="input"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                    Nombre *
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    className="input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                                    Precio
                                </label>
                                <input
                                    type="number"
                                    id="price"
                                    className="input"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox h-5 w-5 text-primary-600"
                                        checked={formData.taxable}
                                        onChange={(e) => setFormData({ ...formData, taxable: e.target.checked })}
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Impuesto</span>
                                </label>
                            </div>
                            {formData.taxable && (
                                <div>
                                    <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700">
                                        Tasa de Impuesto (%)
                                    </label>
                                    <input
                                        type="number"
                                        id="taxRate"
                                        className="input"
                                        value={formData.taxRate || ''}
                                        onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) })}
                                    />
                                </div>
                            )}
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

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl animate-slide-up">
                        <h2 className="text-lg font-bold mb-4">Confirmar Eliminación</h2>
                        <p className="text-gray-700 mb-4">
                            ¿Estás seguro de que quieres eliminar este producto?
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

export default Products;