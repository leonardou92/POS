import axios, { AxiosError } from 'axios';
import {
    InvoiceRequest,
    PagoRequest,
    AnularDocumentoRequest,
    EliminarDocumentoRequest,
    InvoiceResponse,
    ApiError,
    Client,
    Product,
    LoginResponse,
} from '../types/api';

// Define GetProductsResponse interface
export interface GetProductsResponse {
    status: boolean;
    productos: any[]; // Replace 'any' with a more specific type if possible
    message?: string;
}

// Define the Correlativo interface
export interface CorrelativoResponse {
    status: boolean;
    id: string;
    tipo_documento: string;
    serie: string;
    ultimo_numero: number;
    message?: string;
}

let API_TOKEN: string | null = localStorage.getItem('authToken');

// Creating an axios instance with default configuration
const api = axios.create({
    baseURL: 'https://demo.icarosoft.com/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the token in the Authorization header
api.interceptors.request.use((config) => {
    if (API_TOKEN) {
        config.headers.Authorization = `Bearer ${API_TOKEN}`;
    }
    return config;
});

// Helper function to handle API calls and errors
async function handleApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
        const response = await apiCall();
        return response;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
}

// Helper function to handle API errors
function handleApiError(error: unknown): void {
    if (axios.isAxiosError(error)) {
        const serverError = error.response?.data as ApiError;
        if (serverError?.message) {
            throw new Error(serverError.message);
        }
    }
    throw new Error('Error de conexión al servidor');
}

// Function to update the API token
export const setApiToken = (newToken: string | null) => {
    API_TOKEN = newToken;
};

// API functions
export const invoiceService = {
    // Create a new document (invoice, credit note, debit note)
    createInvoice: async (data: InvoiceRequest): Promise<InvoiceResponse> => {
        return handleApiCall(() => api.post('/crearDocumento/crearDocumento.php', data).then(response => response.data));
    },

    // Register payment for an invoice
    registerPayment: async (data: PagoRequest): Promise<any> => {
        return handleApiCall(() => api.post('/pagarFactura/pagarFactura.php', data).then(response => response.data));
    },

    // Search document by control number
    getInvoiceByControlNumber: async (nroControl: string): Promise<InvoiceResponse> => {
        return handleApiCall(() =>
            api.get('/buscarDocumentoControl/buscarDocumentoControl.php', {
                params: { nro_control: nroControl },
            }).then(response => response.data)
        );
    },

    // Search document by type and number
    getInvoiceByTypeAndNumber: async (
        tipoDocumento: string,
        numeroDocumento: string
    ): Promise<InvoiceResponse> => {
        return handleApiCall(() =>
            api.get('/buscarDocumentoNumero/buscarDocumentoNumero.php', {
                params: { tipo_documento: tipoDocumento, numeroDocumento: numeroDocumento },
            }).then(response => response.data)
        );
    },

    // Search documents by date range
    getInvoicesByDateRange: async (
        fechaDesde: string,
        fechaHasta: string
    ): Promise<InvoiceResponse[]> => {
        return handleApiCall(() =>
            api.get('/buscarDocumentoEntreFecha/buscarDocumentoEntreFecha.php', {
                params: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta },
            }).then(response => response.data)
        );
    },

    // Cancel an invoice
    cancelInvoice: async (data: AnularDocumentoRequest): Promise<any> => {
        return handleApiCall(() => api.post('/anularDocumento/anularDocumento.php', data).then(response => response.data));
    },

    // Delete an invoice
    deleteInvoice: async (data: EliminarDocumentoRequest): Promise<any> => {
        return handleApiCall(() => api.post('/eliminarDocumento/eliminarDocumento.php', data).then(response => response.data));
    },

    // Search clients
    getCustomers: async (searchTerm?: string): Promise<Client[]> => {
        return handleApiCall(() =>
            api.get('/buscarClientes/buscarClientes.php', {
                params: { searchTerm: searchTerm }
            }).then(response => response.data)
        );
    },

    // Search clients by RIF
    getCustomersByRif: async (rif: string): Promise<any> => {
        return handleApiCall(() =>
            api.get('/buscarClientesPorRif/buscarClientesPorRif.php', {
                params: { rif: rif }
            }).then(response => response.data)
        );
    },

    // Get all products (without pagination)
    getProducts: async (sucursal?: string): Promise<GetProductsResponse> => {
        return handleApiCall(() =>
            api
                .get('/buscarProductos/buscarProductos.php', {
                    params: { sucursal: sucursal }, // Add sucursal as a query parameter
                })
                .then((response) => response.data)
        );
    },

    login: async (usuario: string, password: string): Promise<LoginResponse> => {
        try {
            const response = await api.post<LoginResponse>('/login/login.php', {  // Changed to POST
                usuario: usuario,
                password: password,
            });
            return response.data;
        } catch (error: any) {
            console.error("Login failed in API:", error);
            throw error; // Re-throw for the component to handle
        }
    },
    // Get Correlativo by tipo_documento
    buscarCorrelativosPorTipo: async (tipoDocumento: string): Promise<CorrelativoResponse> => {
        return handleApiCall(() =>
            api.get(`/buscarCorrelativosPorTipo/buscarCorrelativosPorTipo.php?tipo_documento=${tipoDocumento}`)
                .then(response => response.data)
        );
    },

    // Update Correlativo
    updateCorrelativo: async (tipoDocumento: string, data: { ultimo_numero: number }): Promise<any> => {
        return handleApiCall(() =>
            api.put(`/actualizarCorrelativo/actualizarCorrelativo.php?tipo_documento=${tipoDocumento}`, data)
                .then(response => response.data)
        );
    }
};

export default api;