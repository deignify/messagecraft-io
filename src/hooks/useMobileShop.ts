import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MobileShop {
  id: string;
  whatsapp_number_id: string;
  user_id: string;
  name: string;
  description: string | null;
  owner_phone: string | null;
  language: string;
  welcome_message: string | null;
  advance_amount_min: number | null;
  advance_amount_max: number | null;
  upi_id: string | null;
  qr_code_url: string | null;
  google_sheet_id: string | null;
  agent_notify_phone: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MobileShopBranch {
  id: string;
  shop_id: string;
  name: string;
  address: string | null;
  city: string | null;
  contact_phone: string | null;
  upi_id: string | null;
  qr_code_url: string | null;
  is_active: boolean | null;
  display_order: number | null;
  created_at: string | null;
}

export function useMobileShop() {
  const { selectedNumber } = useWhatsApp();
  const { user } = useAuth();
  const [shop, setShop] = useState<MobileShop | null>(null);
  const [branches, setBranches] = useState<MobileShopBranch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!selectedNumber || !user) {
      setShop(null);
      setBranches([]);
      setLoading(false);
      return;
    }

    try {
      const { data: shopData, error: shopError } = await supabase
        .from('mobile_shops')
        .select('*')
        .eq('whatsapp_number_id', selectedNumber.id)
        .maybeSingle();

      if (shopError) throw shopError;
      setShop(shopData as MobileShop | null);

      if (shopData) {
        const { data: branchData, error: branchError } = await supabase
          .from('mobile_shop_branches')
          .select('*')
          .eq('shop_id', shopData.id)
          .order('display_order');

        if (branchError) throw branchError;
        setBranches((branchData || []) as MobileShopBranch[]);
      }
    } catch (error) {
      console.error('Error fetching mobile shop:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedNumber, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createShop = async (data: Partial<MobileShop>) => {
    if (!selectedNumber || !user) return;
    const { error } = await supabase.from('mobile_shops').insert({
      whatsapp_number_id: selectedNumber.id,
      user_id: user.id,
      name: data.name || 'My Mobile Shop',
      ...data,
    } as any);
    if (error) { toast.error('Failed to create shop'); throw error; }
    toast.success('Mobile shop created!');
    await fetchData();
  };

  const updateShop = async (data: Partial<MobileShop>) => {
    if (!shop) return;
    const { error } = await supabase.from('mobile_shops').update(data as any).eq('id', shop.id);
    if (error) { toast.error('Failed to update shop'); throw error; }
    toast.success('Shop updated!');
    await fetchData();
  };

  const createBranch = async (data: Partial<MobileShopBranch>) => {
    if (!shop) return;
    const { error } = await supabase.from('mobile_shop_branches').insert({
      shop_id: shop.id,
      name: data.name || 'New Branch',
      ...data,
    } as any);
    if (error) { toast.error('Failed to create branch'); throw error; }
    toast.success('Branch added!');
    await fetchData();
  };

  const updateBranch = async (branchId: string, data: Partial<MobileShopBranch>) => {
    const { error } = await supabase.from('mobile_shop_branches').update(data as any).eq('id', branchId);
    if (error) { toast.error('Failed to update branch'); throw error; }
    toast.success('Branch updated!');
    await fetchData();
  };

  const deleteBranch = async (branchId: string) => {
    const { error } = await supabase.from('mobile_shop_branches').delete().eq('id', branchId);
    if (error) { toast.error('Failed to delete branch'); throw error; }
    toast.success('Branch deleted!');
    await fetchData();
  };

  return {
    shop,
    branches,
    loading,
    refetch: fetchData,
    createShop,
    updateShop,
    createBranch,
    updateBranch,
    deleteBranch,
  };
}
