// Document Types
export type DocumentType = 'FA' | 'ND' | 'NC';
export type DocumentStatus = 'PROCESADO' | 'ANULADO';

export interface InvoiceResponse {
  fecha_emision: string;
  total_general: number;
  razon_social: string;
  numero_documento: number; // Added the missing property
  status: boolean;
  message?: string; // Add the optional 'message' property
  documento: Document;
  detalles: Detail[];
  saldo:number;
  // Other properties...
}

export interface Document {
  id_documento:number;
  tipo_documento: DocumentType;
  numero_documento: number;
  numero_control: number;
  fecha_emision: string;
  razon_social: string;
  registro_fiscal: string;
  direccion_fiscal: string;
  e_mail: string;
  telefono: string;
  descripcion: string;
  moneda_principal: string;
  balance_anterior: number;
  monto_exento: number;
  base_imponible: number;
  subtotal: number;
  monto_iva: number;
  porcentaje_iva: number;
  base_reducido: number;
  monto_iva_reducido: number;
  porcentaje_iva_reducido: number;
  total: number;
  base_igtf: number;
  monto_igtf: number;
  porcentaje_igtf: number;
  total_general: number;
  conversion_moneda: string;
  tasa_cambio: number;
  direccion_envio: string;
  serie_strong_id: string;
  serie: string;
  usuario: string;
  motivo_anulacion?: string;
  status: DocumentStatus;
  tipo_documento_afectado?: string;
  numero_documento_afectado?: number;
  saldo: number;
}

export interface Detail {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  monto: number;
  monto_total: number;
  monto_iva: number;
  monto_descuento: number;
  porcentaje_descuento: number;
  porcentaje_iva: number;
  es_exento: boolean;
}

export interface InvoiceRequest {
  documento: Document;
  detalles: Detail[];
}


export interface Pago {
  documento_afectado: number;
  desc_tipo_pago: string;
  monto: number;
  fecha_pago: string;
  usuario: string;
  tasa_cambio: number;
  moneda: string;
  referencia: string;
  banco: string;
  status: string;
}

export interface PagoRequest {
  documento_afectado: number;
  desc_tipo_pago: string;
  monto: number;
  fecha_pago: string;
  usuario: string;
  tasa_cambio: number;
  moneda: string;
  referencia: string;
  banco: string;
  status: string;
}

export interface ApiError {
  status: boolean;
  message: string;
  field?: string;
}

export interface AnularDocumentoRequest {
  nro_control: number;
  motivo_anulacion: string;
}

export interface EliminarDocumentoRequest {
  nro_control: number;
}

// types/api.ts
export interface Client {
  id: string;
  tipoDocumento: string;
  razonSocial: string;
  registroFiscal: string;
  direccionFiscal: string;
  email: string;
  telefono: string;
  direccionEnvio: string;
  createdAt: string;
  totalCompras: number;
  ultimaCompra: string;
}

export interface GetCustomersResponse {
  status: boolean;
  clientes: Client[];
  message?: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  taxable: boolean;
  taxRate: number | null;
}

export interface GetProductsResponse {
  status: boolean;
  productos: Product[];
  message?: string;
}

export interface ApiError {
  status: boolean;
  message: string;
  field?: string;
}

export interface LoginResponse {
  status: boolean;
  message?: string;
  name?: string;
  empresa?: string;
  sucursal?: string;
  token?: string;
  id?: string; // Add id to LoginResponse
  nombreEmpresa?: string;  // ADDED
}

export interface AuthContext {
  login: (username: string, password: string, name?: string, empresa?: string, sucursal?: string) => Promise<void>;
}

