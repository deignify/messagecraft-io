import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

async function callShopApi(action: string, whatsappNumberId: string, extra: Record<string, unknown> = {}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/mobile-shop-api`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, whatsapp_number_id: whatsappNumberId, ...extra }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

export interface SheetBranch {
  index: number;
  name: string;
  address: string;
  city: string;
  contact_phone: string;
  upi_id: string;
  is_active: string;
}

export interface SheetProduct {
  index: number;
  brand: string;
  model: string;
  variant: string;
  color: string;
  price: string;
  stock: string;
  type: string;
  available: string;
}

export interface SheetOrder {
  index: number;
  order_id: string;
  name: string;
  phone: string;
  city: string;
  branch: string;
  brand: string;
  model: string;
  variant: string;
  color: string;
  price: string;
  type: string;
  payment_status: string;
  order_status: string;
  date: string;
  pickup_date: string;
  notes: string;
}

export function useMobileShopSheet() {
  const { selectedNumber } = useWhatsApp();
  const [branches, setBranches] = useState<SheetBranch[]>([]);
  const [products, setProducts] = useState<SheetProduct[]>([]);
  const [orders, setOrders] = useState<SheetOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const syncShopDetails = useCallback(async () => {
    if (!selectedNumber) return;
    try {
      await callShopApi('sync-shop-details', selectedNumber.id);
      toast.success('Shop details synced to Google Sheet!');
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [selectedNumber]);

  const fetchBranches = useCallback(async () => {
    if (!selectedNumber) return;
    setLoading(true);
    try {
      const data = await callShopApi('get-branches', selectedNumber.id);
      setBranches(data.branches || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedNumber]);

  const fetchProducts = useCallback(async () => {
    if (!selectedNumber) return;
    setLoading(true);
    try {
      const data = await callShopApi('get-products', selectedNumber.id);
      setProducts(data.products || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedNumber]);

  const fetchOrders = useCallback(async () => {
    if (!selectedNumber) return;
    setLoading(true);
    try {
      const data = await callShopApi('get-orders', selectedNumber.id);
      setOrders(data.orders || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedNumber]);

  const updateOrder = useCallback(async (rowIndex: number, values: string[]) => {
    if (!selectedNumber) return;
    try {
      await callShopApi('update-order', selectedNumber.id, { row_index: rowIndex, values });
      toast.success('Order updated!');
      await fetchOrders();
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [selectedNumber, fetchOrders]);

  return {
    branches, products, orders, loading,
    syncShopDetails, fetchBranches, fetchProducts, fetchOrders, updateOrder,
  };
}
