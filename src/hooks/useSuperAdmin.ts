import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useSuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      if (!user) {
        console.log('[SuperAdmin] No user found');
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      console.log('[SuperAdmin] Checking role for user:', user.id, user.email);

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'superadmin')
          .maybeSingle();

        console.log('[SuperAdmin] Query result:', { data, error });

        if (error) {
          console.error('[SuperAdmin] Error checking role:', error);
          setIsSuperAdmin(false);
        } else {
          const isAdmin = !!data;
          console.log('[SuperAdmin] Is superadmin:', isAdmin);
          setIsSuperAdmin(isAdmin);
        }
      } catch (err) {
        console.error('[SuperAdmin] Exception:', err);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkSuperAdmin();
  }, [user, authLoading]);

  return { isSuperAdmin, loading };
}
