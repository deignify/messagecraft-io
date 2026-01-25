import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import type { MessageTemplate, CreateTemplateInput, UpdateTemplateInput, TemplateButton, TemplateVariables } from '@/lib/template-types';
import { useToast } from '@/hooks/use-toast';

export function useMessageTemplates() {
  const { user } = useAuth();
  const { selectedNumber } = useWhatsApp();
  const { toast } = useToast();
  
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!user || !selectedNumber) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('whatsapp_number_id', selectedNumber.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our types
      const transformedData: MessageTemplate[] = (data || []).map((item: any) => ({
        ...item,
        variables: (item.variables as TemplateVariables) || {},
        buttons: (item.buttons as TemplateButton[]) || [],
      }));
      
      setTemplates(transformedData);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, selectedNumber, toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (input: CreateTemplateInput): Promise<MessageTemplate | null> => {
    if (!user || !selectedNumber) {
      toast({
        title: 'Error',
        description: 'Please select a WhatsApp number first',
        variant: 'destructive',
      });
      return null;
    }

    setSaving(true);
    try {
      const insertData = {
        user_id: user.id,
        whatsapp_number_id: selectedNumber.id,
        template_name: input.template_name,
        category: input.category,
        language: input.language,
        status: 'draft' as const,
        header_type: input.header_type,
        header_text: input.header_text || null,
        header_media_url: input.header_media_url || null,
        body_text: input.body_text,
        footer_text: input.footer_text || null,
        variables: (input.variables || {}) as unknown as Record<string, unknown>,
        buttons: (input.buttons || []) as unknown as Record<string, unknown>[],
      };

      const { data, error } = await supabase
        .from('message_templates')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;

      const newTemplate: MessageTemplate = {
        ...data,
        variables: (data.variables as unknown as TemplateVariables) || {},
        buttons: (data.buttons as unknown as TemplateButton[]) || [],
      };

      setTemplates((prev) => [newTemplate, ...prev]);
      
      toast({
        title: 'Success',
        description: 'Template created successfully',
      });

      return newTemplate;
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create template',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = async (id: string, input: UpdateTemplateInput): Promise<boolean> => {
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {};
      
      if (input.template_name !== undefined) updateData.template_name = input.template_name;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.language !== undefined) updateData.language = input.language;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.header_type !== undefined) updateData.header_type = input.header_type;
      if (input.header_text !== undefined) updateData.header_text = input.header_text;
      if (input.header_media_url !== undefined) updateData.header_media_url = input.header_media_url;
      if (input.body_text !== undefined) updateData.body_text = input.body_text;
      if (input.footer_text !== undefined) updateData.footer_text = input.footer_text;
      if (input.variables !== undefined) updateData.variables = input.variables as unknown as Record<string, unknown>;
      if (input.buttons !== undefined) updateData.buttons = input.buttons as unknown as Record<string, unknown>[];

      const { error } = await supabase
        .from('message_templates')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...input } as MessageTemplate : t))
      );

      toast({
        title: 'Success',
        description: 'Template updated successfully',
      });

      return true;
    } catch (error: any) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update template',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    setSaving(true);
    try {
      // Soft delete
      const { error } = await supabase
        .from('message_templates')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) throw error;

      setTemplates((prev) => prev.filter((t) => t.id !== id));

      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete template',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    templates,
    loading,
    saving,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
