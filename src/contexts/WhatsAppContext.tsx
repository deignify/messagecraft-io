import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import type { WhatsAppNumber } from '@/lib/supabase-types';

interface WhatsAppContextType {
  numbers: WhatsAppNumber[];
  selectedNumber: WhatsAppNumber | null;
  loading: boolean;
  selectNumber: (id: string) => void;
  refreshNumbers: () => Promise<void>;
}

const WhatsAppContext = createContext<WhatsAppContextType | undefined>(undefined);

export function WhatsAppProvider({ children }: { children: ReactNode }) {
  const { user, settings, updateSettings } = useAuth();
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<WhatsAppNumber | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNumbers = useCallback(async () => {
    if (!user) {
      setNumbers([]);
      setSelectedNumber(null);
      setLoading(false);
      return;
    }

    try {
      // First check if the user is a team member of another workspace
      const { data: myMembership } = await supabase
        .from('team_members')
        .select('workspace_owner_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const effectiveOwnerId = myMembership?.workspace_owner_id || user.id;

      // Fetch numbers for the effective workspace owner
      // RLS already allows team members to view workspace numbers
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('user_id', effectiveOwnerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const fetchedNumbers = (data || []) as WhatsAppNumber[];
      setNumbers(fetchedNumbers);

      // Auto-select based on settings or first available
      if (settings?.selected_whatsapp_id) {
        const selected = fetchedNumbers.find(n => n.id === settings.selected_whatsapp_id);
        setSelectedNumber(selected || fetchedNumbers[0] || null);
      } else if (fetchedNumbers.length > 0) {
        setSelectedNumber(fetchedNumbers[0]);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp numbers:', error);
    } finally {
      setLoading(false);
    }
  }, [user, settings?.selected_whatsapp_id]);

  useEffect(() => {
    fetchNumbers();
  }, [fetchNumbers]);

  const selectNumber = (id: string) => {
    const number = numbers.find(n => n.id === id);
    if (number) {
      setSelectedNumber(number);
      updateSettings({ selected_whatsapp_id: id });
    }
  };

  const refreshNumbers = async () => {
    await fetchNumbers();
  };

  return (
    <WhatsAppContext.Provider value={{
      numbers,
      selectedNumber,
      loading,
      selectNumber,
      refreshNumbers,
    }}>
      {children}
    </WhatsAppContext.Provider>
  );
}

export function useWhatsApp() {
  const context = useContext(WhatsAppContext);
  if (context === undefined) {
    throw new Error('useWhatsApp must be used within a WhatsAppProvider');
  }
  return context;
}
