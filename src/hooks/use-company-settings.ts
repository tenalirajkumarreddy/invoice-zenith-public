import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CompanySettings {
  id: string;
  company_name: string;
  gst_number: string | null;
  business_address: string | null;
  phone: string | null;
  email: string | null;
  invoice_prefix: string;
  next_invoice_number: number;
  order_prefix: string;
  next_order_number: number;
  default_tax_rate: number;
  gst_enabled: boolean;
  payment_terms_days: number;
  currency: string;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  account_holder_name: string | null;
  logo_url: string | null;
  signature_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching company settings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch company settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<CompanySettings>) => {
    try {
      if (!settings) {
        // If no settings exist, try to create them
        const { data: newSettings, error: createError } = await supabase
          .from('company_settings')
          .insert([updates])
          .select()
          .single();

        if (createError) throw createError;

        setSettings(newSettings);
        toast({
          title: "Success",
          description: "Company settings created successfully",
        });

        return { data: newSettings, error: null };
      }

      // Update existing settings
      const { data, error } = await supabase
        .from('company_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      toast({
        title: "Success",
        description: "Company settings updated successfully",
      });

      return { data, error: null };
    } catch (error: any) {
      console.error('Error updating company settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update company settings",
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const getNextInvoiceNumber = async () => {
    try {
      const { data, error } = await supabase.rpc('get_next_invoice_number');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting next invoice number:', error);
      // Fallback: generate manually
      if (settings) {
        const nextNumber = settings.next_invoice_number;
        const prefix = settings.invoice_prefix;
        return prefix + nextNumber.toString().padStart(3, '0');
      }
      return 'INV-2025-001';
    }
  };

  const getNextOrderNumber = async () => {
    try {
      const { data, error } = await supabase.rpc('get_next_order_number');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting next order number:', error);
      // Fallback: generate manually
      if (settings) {
        const nextNumber = settings.next_order_number;
        const prefix = settings.order_prefix;
        return prefix + nextNumber.toString().padStart(3, '0');
      }
      return 'ORD-2025-001';
    }
  };

  const cleanupDuplicateSettings = async () => {
    try {
      // Deactivate all records except the most recent one
      const { error } = await supabase
        .from('company_settings')
        .update({ is_active: false })
        .neq('id', settings?.id || '');

      if (error) throw error;
      
      // Refresh settings
      await fetchSettings();
    } catch (error) {
      console.error('Error cleaning up duplicate settings:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    fetchSettings,
    updateSettings,
    getNextInvoiceNumber,
    getNextOrderNumber,
    cleanupDuplicateSettings,
  };
} 