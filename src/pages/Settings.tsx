import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { MapPin, Save, Loader2, Palette } from "lucide-react";
import { useCompanySettingsContext } from "@/contexts/CompanySettingsContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function Settings() {
  const { settings, loading, updateSettings, cleanupDuplicateSettings } = useCompanySettingsContext();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    gst_number: '',
    business_address: '',
    phone: '',
    email: '',
    invoice_prefix: '',
    order_prefix: '',
    default_tax_rate: 18,
    gst_enabled: true,
    payment_terms_days: 30,
    currency: 'INR',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_holder_name: '',
  });

  // Update form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || '',
        gst_number: settings.gst_number || '',
        business_address: settings.business_address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        invoice_prefix: settings.invoice_prefix || '',
        order_prefix: settings.order_prefix || '',
        default_tax_rate: settings.default_tax_rate || 18,
        gst_enabled: settings.gst_enabled ?? true,
        payment_terms_days: settings.payment_terms_days || 30,
        currency: settings.currency || 'INR',
        bank_name: settings.bank_name || '',
        account_number: settings.account_number || '',
        ifsc_code: settings.ifsc_code || '',
        account_holder_name: settings.account_holder_name || '',
      });
    }
  }, [settings]);

  // Clean up duplicate settings on component mount
  useEffect(() => {
    cleanupDuplicateSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('Saving settings with data:', formData);
      const result = await updateSettings(formData);
      console.log('Save result:', result);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Company Settings</h2>
          <p className="text-muted-foreground">Configure your business information and invoice preferences</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-primary text-primary-foreground hover:opacity-90"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card className="p-6 bg-gradient-card shadow-card border-border/50">
          <h3 className="text-xl font-semibold text-foreground mb-4">Company Information</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="companyName" className="text-foreground">Company Name</Label>
              <Input 
                id="companyName" 
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="mt-1" 
              />
            </div>
            <div>
              <Label htmlFor="gstNumber" className="text-foreground">GST Number</Label>
              <Input 
                id="gstNumber" 
                value={formData.gst_number}
                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                className="mt-1 font-mono" 
              />
            </div>
            <div>
              <Label htmlFor="address" className="text-foreground">Business Address</Label>
              <Input 
                id="address" 
                value={formData.business_address}
                onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                className="mt-1" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone" className="text-foreground">Phone</Label>
                <Input 
                  id="phone" 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1" 
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input 
                  id="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1" 
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Invoice Settings */}
        <Card className="p-6 bg-gradient-card shadow-card border-border/50">
          <h3 className="text-xl font-semibold text-foreground mb-4">Invoice Settings</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invoicePrefix" className="text-foreground">Invoice Prefix</Label>
              <Input 
                id="invoicePrefix" 
                value={formData.invoice_prefix}
                onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                className="mt-1" 
              />
              <p className="text-sm text-muted-foreground mt-1">
                Next invoice: {formData.invoice_prefix}{settings?.next_invoice_number?.toString().padStart(3, '0') || '001'}
              </p>
            </div>
            <div>
              <Label htmlFor="orderPrefix" className="text-foreground">Order Prefix</Label>
              <Input 
                id="orderPrefix" 
                value={formData.order_prefix}
                onChange={(e) => setFormData({ ...formData, order_prefix: e.target.value })}
                className="mt-1" 
              />
              <p className="text-sm text-muted-foreground mt-1">
                Next order: {formData.order_prefix}{settings?.next_order_number?.toString().padStart(3, '0') || '001'}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Enable GST</Label>
                <p className="text-sm text-muted-foreground">Apply tax to invoices and orders</p>
              </div>
              <Switch
                checked={formData.gst_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, gst_enabled: checked })}
              />
            </div>
            {formData.gst_enabled && (
              <div>
                <Label htmlFor="taxRate" className="text-foreground">Default Tax Rate (%)</Label>
                <Input 
                  id="taxRate" 
                  value={formData.default_tax_rate}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setFormData({ ...formData, default_tax_rate: isNaN(value) ? 0 : value });
                  }}
                  type="number" 
                  step="0.01"
                  min="0"
                  max="100"
                  className="mt-1" 
                />
              </div>
            )}
            <div>
              <Label htmlFor="paymentTerms" className="text-foreground">Payment Terms (Days)</Label>
              <Input 
                id="paymentTerms" 
                value={formData.payment_terms_days}
                onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) || 0 })}
                type="number" 
                className="mt-1" 
              />
            </div>
            <div>
              <Label htmlFor="currency" className="text-foreground">Currency</Label>
              <Input 
                id="currency" 
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="mt-1" 
              />
            </div>
          </div>
        </Card>

        {/* Bank Details */}
        <Card className="p-6 bg-gradient-card shadow-card border-border/50">
          <h3 className="text-xl font-semibold text-foreground mb-4">Bank Details</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bankName" className="text-foreground">Bank Name</Label>
              <Input 
                id="bankName" 
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="mt-1" 
              />
            </div>
            <div>
              <Label htmlFor="accountNumber" className="text-foreground">Account Number</Label>
              <Input 
                id="accountNumber" 
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                className="mt-1 font-mono" 
              />
            </div>
            <div>
              <Label htmlFor="ifscCode" className="text-foreground">IFSC Code</Label>
              <Input 
                id="ifscCode" 
                value={formData.ifsc_code}
                onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                className="mt-1 font-mono" 
              />
            </div>
            <div>
              <Label htmlFor="accountHolder" className="text-foreground">Account Holder Name</Label>
              <Input 
                id="accountHolder" 
                value={formData.account_holder_name}
                onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                className="mt-1" 
              />
            </div>
          </div>
        </Card>

        {/* System Preferences */}
        <Card className="p-6 bg-gradient-card shadow-card border-border/50">
          <h3 className="text-xl font-semibold text-foreground mb-4">System Preferences</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Theme</Label>
                <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                  className="text-xs"
                >
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                  className="text-xs"
                >
                  Dark
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Current Theme</Label>
                <p className="text-sm text-muted-foreground">Active theme setting</p>
              </div>
              <Badge className={theme === 'dark' ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-800"}>
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Auto Backup</Label>
                <p className="text-sm text-muted-foreground">Daily backup at 11:00 PM</p>
              </div>
              <Badge className="bg-success text-success-foreground">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Payment reminders and alerts</p>
              </div>
              <Badge className="bg-success text-success-foreground">On</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">WhatsApp Integration</Label>
                <p className="text-sm text-muted-foreground">Send invoices via WhatsApp</p>
              </div>
              <Badge variant="secondary">Setup Required</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Route Management */}
      <Card className="p-6 bg-gradient-card shadow-card border-border/50">
        <h3 className="text-xl font-semibold text-foreground mb-4">Delivery Route Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-background/30 rounded-lg">
            <h4 className="font-medium text-foreground mb-2">Route-A</h4>
            <p className="text-sm text-muted-foreground">Mumbai Central, Dadar, Bandra</p>
            <p className="text-xs text-primary mt-1">2 customers assigned</p>
          </div>
          <div className="p-4 bg-background/30 rounded-lg">
            <h4 className="font-medium text-foreground mb-2">Route-B</h4>
            <p className="text-sm text-muted-foreground">Andheri, Malad, Borivali</p>
            <p className="text-xs text-primary mt-1">2 customers assigned</p>
          </div>
          <div className="p-4 bg-background/30 rounded-lg">
            <h4 className="font-medium text-foreground mb-2">Route-C</h4>
            <p className="text-sm text-muted-foreground">Thane, Kalyan, Dombivli</p>
            <p className="text-xs text-primary mt-1">1 customer assigned</p>
          </div>
        </div>
        <Link to="/route-management">
          <Button variant="outline" className="mt-4">
            <MapPin className="w-4 h-4 mr-2" />
            Manage Routes
          </Button>
        </Link>
      </Card>
    </div>
  );
}