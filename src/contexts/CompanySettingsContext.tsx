import { createContext, useContext, ReactNode } from 'react';
import { useCompanySettings, CompanySettings } from '@/hooks/use-company-settings';

interface CompanySettingsContextType {
  settings: CompanySettings | null;
  loading: boolean;
  updateSettings: (updates: Partial<CompanySettings>) => Promise<{ data: CompanySettings | null; error: any }>;
  getNextInvoiceNumber: () => Promise<string>;
  getNextOrderNumber: () => Promise<string>;
  cleanupDuplicateSettings: () => Promise<void>;
}

const CompanySettingsContext = createContext<CompanySettingsContextType | undefined>(undefined);

export function CompanySettingsProvider({ children }: { children: ReactNode }) {
  const companySettings = useCompanySettings();

  return (
    <CompanySettingsContext.Provider value={companySettings}>
      {children}
    </CompanySettingsContext.Provider>
  );
}

export function useCompanySettingsContext() {
  const context = useContext(CompanySettingsContext);
  if (context === undefined) {
    throw new Error('useCompanySettingsContext must be used within a CompanySettingsProvider');
  }
  return context;
} 