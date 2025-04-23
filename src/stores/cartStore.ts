import { create } from 'zustand';
import { Detail } from '../types/api';

interface CartItem extends Detail {
  id: string;
}

interface CartState {
  items: CartItem[];
  taxRate: number;
  reducedTaxRate: number;
  igtfRate: number;
  customer: {
    razonSocial: string;
    registroFiscal: string;
    direccionFiscal: string;
    email: string;
    telefono: string;
    direccionEnvio: string;
  };
  addItem: (item: Omit<CartItem, 'id'>) => void;
  updateItem: (id: string, updates: Partial<CartItem>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setCustomer: (customer: CartState['customer']) => void;
  setTaxRate: (rate: number) => void;
  setReducedTaxRate: (rate: number) => void;
  setIgtfRate: (rate: number) => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  taxRate: 16, // Default to 16%
  reducedTaxRate: 8, // Default to 8%
  igtfRate: 3, // Default to 3%
  customer: {
    razonSocial: '',
    registroFiscal: '',
    direccionFiscal: '',
    email: '',
    telefono: '',
    direccionEnvio: '',
  },
  
  addItem: (item) => {
    set((state) => {
      // Check if item already exists in cart
      const existingItemIndex = state.items.findIndex(
        (cartItem) => cartItem.codigo === item.codigo
      );
      
      if (existingItemIndex !== -1) {
        // Update quantity of existing item
        const updatedItems = [...state.items];
        const existingItem = updatedItems[existingItemIndex];
        const newQuantity = existingItem.cantidad + item.cantidad;
        
        updatedItems[existingItemIndex] = {
          ...existingItem,
          cantidad: newQuantity,
          monto: newQuantity * existingItem.precio_unitario,
          monto_total: existingItem.es_exento 
            ? newQuantity * existingItem.precio_unitario
            : newQuantity * existingItem.precio_unitario * (1 + existingItem.porcentaje_iva / 100),
          monto_iva: existingItem.es_exento 
            ? 0 
            : newQuantity * existingItem.precio_unitario * (existingItem.porcentaje_iva / 100),
        };
        
        return { items: updatedItems };
      }
      
      // Add new item with generated ID
      return {
        items: [
          ...state.items,
          {
            ...item,
            id: Date.now().toString(),
          },
        ],
      };
    });
  },
  
  updateItem: (id, updates) => {
    set((state) => {
      const updatedItems = state.items.map((item) => {
        if (item.id !== id) return item;
        
        const updatedItem = { ...item, ...updates };
        
        // Recalculate totals if quantity or price changed
        if (updates.cantidad !== undefined || updates.precio_unitario !== undefined) {
          const quantity = updates.cantidad ?? item.cantidad;
          const price = updates.precio_unitario ?? item.precio_unitario;
          const isExempt = updates.es_exento !== undefined ? updates.es_exento : item.es_exento;
          const taxRate = updates.porcentaje_iva ?? item.porcentaje_iva;
          
          const subtotal = quantity * price;
          const tax = isExempt ? 0 : subtotal * (taxRate / 100);
          
          updatedItem.monto = subtotal;
          updatedItem.monto_iva = tax;
          updatedItem.monto_total = subtotal + tax;
        }
        
        return updatedItem;
      });
      
      return { items: updatedItems };
    });
  },
  
  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },
  
  clearCart: () => {
    set({ items: [] });
  },
  
  setCustomer: (customer) => {
    set({ customer });
  },
  
  setTaxRate: (rate) => {
    set({ taxRate: rate });
  },
  
  setReducedTaxRate: (rate) => {
    set({ reducedTaxRate: rate });
  },
  
  setIgtfRate: (rate) => {
    set({ igtfRate: rate });
  },
}));

// Helper functions to calculate cart totals
export const getCartTotals = (state = useCartStore.getState()) => {
  const { items, taxRate } = state;
  
  const subtotal = items.reduce((sum, item) => sum + item.monto, 0);
  const taxableAmount = items.reduce((sum, item) => sum + (item.es_exento ? 0 : item.monto), 0);
  const exemptAmount = items.reduce((sum, item) => sum + (item.es_exento ? item.monto : 0), 0);
  const tax = items.reduce((sum, item) => sum + item.monto_iva, 0);
  const total = subtotal + tax;
  
  // IGTF calculation (3% on total)
  const igtf = state.igtfRate > 0 ? total * (state.igtfRate / 100) : 0;
  const grandTotal = total + igtf;
  
  return {
    subtotal,
    taxableAmount,
    exemptAmount,
    tax,
    total,
    igtf,
    grandTotal,
  };
};