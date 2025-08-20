import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { logTransaction } from "@/lib/transaction-utils";

interface Route {
  id: string;
  route_code: string;
  route_name: string;
}

interface AddCustomerDialogProps {
  onCustomerAdded: () => void;
  routes: Route[];
  initialData?: any; // Accepts a Customer for editing
  editMode?: boolean;
}

interface Product {
  id: string;
  name: string;
  product_code: string;
  price: number;
  category: string | null;
  unit: string;
  is_active: boolean;
  created_at: string;
}

export function AddCustomerDialog({ onCustomerAdded, routes, initialData, editMode }: AddCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    shop_name: initialData?.shop_name || "",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
    pincode: initialData?.pincode || "",
    route_id: initialData?.route_id || "none",
    balanceType: initialData?.balanceType || "opening_balance",
    balanceAmount: initialData?.balanceAmount || "0",
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [customPrices, setCustomPrices] = useState<{ [productId: string]: string }>({});

  useEffect(() => {
    if (editMode && initialData) {
      setFormData({
        name: initialData.name || "",
        shop_name: initialData.shop_name || "",
        phone: initialData.phone || "",
        address: initialData.address || "",
        pincode: initialData.pincode || "",
        route_id: initialData.route_id || "none",
        balanceType: initialData.balanceType || "opening_balance",
        balanceAmount: initialData.balanceAmount || "0",
      });
      setOpen(true);
    }
  }, [editMode, initialData]);

  useEffect(() => {
    // Fetch all active products
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (!error && data) setProducts(data);
    };
    fetchProducts();
  }, []);

  // Fetch custom prices for edit mode
  useEffect(() => {
    const fetchCustomPrices = async () => {
      if (editMode && initialData) {
        const { data, error } = await (supabase as any)
          .from('customer_product_prices')
          .select('*')
          .eq('customer_id', initialData.id);
        if (!error && data) {
          const priceMap: { [productId: string]: string } = {};
          data.forEach((row: any) => {
            priceMap[row.product_id] = row.custom_price.toString();
          });
          setCustomPrices(priceMap);
        }
      }
    };
    fetchCustomPrices();
  }, [editMode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Customer name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.shop_name.trim()) {
      toast({
        title: "Validation Error", 
        description: "Shop name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.phone.trim()) {
      toast({
        title: "Validation Error",
        description: "Phone number is required", 
        variant: "destructive",
      });
      return;
    }
    
    // Validate phone number format (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive", 
      });
      return;
    }
    
    // Validate pincode (6 digits)
    if (formData.pincode && !/^[0-9]{6}$/.test(formData.pincode)) {
      toast({
        title: "Validation Error",
        description: "Pincode must be 6 digits",
        variant: "destructive",
      });
      return;
    }
    
    // Check for duplicate phone number
    if (!editMode) {
      const { data: existingCustomers, error: phoneCheckError } = await supabase
        .from('customers')
        .select('id, phone, shop_name')
        .eq('phone', formData.phone)
        .eq('is_active', true);
        
      if (phoneCheckError) {
        toast({
          title: "Error",
          description: "Failed to validate phone number",
          variant: "destructive",
        });
        return;
      }
      
      if (existingCustomers && existingCustomers.length > 0) {
        toast({
          title: "Validation Error",
          description: `Phone number already exists for customer: ${existingCustomers[0].shop_name}`,
          variant: "destructive",
        });
        return;
      }
    }
    
    setLoading(true);
    try {
      let customerId = initialData?.id;
      let data;
      if (editMode && initialData) {
        // Update customer
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            name: formData.name,
            shop_name: formData.shop_name,
            phone: formData.phone,
            address: formData.address,
            pincode: formData.pincode,
            route_id: formData.route_id === "none" ? null : formData.route_id || null,
          })
          .eq('id', initialData.id);
        if (updateError) throw updateError;
        data = { ...initialData, ...formData, id: initialData.id };
      } else {
        // Add customer
        // Generate customer ID
        const customerIdPrefix = 'CUST';
        const timestamp = Date.now().toString().slice(-6);
        const generatedCustomerId = `${customerIdPrefix}-${timestamp}`;
        
        const { data: insertData, error } = await supabase
          .from('customers')
          .insert({
            customer_id: generatedCustomerId,
            name: formData.name,
            shop_name: formData.shop_name,
            phone: formData.phone,
            address: formData.address,
            pincode: formData.pincode,
            route_id: formData.route_id === "none" ? null : formData.route_id || null,
            balance: formData.balanceType === "outstanding"
              ? -(parseFloat(formData.balanceAmount) || 0)
              : parseFloat(formData.balanceAmount) || 0,
            total_orders: 0,
            is_active: true,
          })
          .select()
          .single();
        if (error) throw error;
        data = insertData;
        customerId = data.id;
        // Log opening balance transaction if amount is provided
        const balanceAmount = parseFloat(formData.balanceAmount) || 0;
        if (balanceAmount > 0) {
          const transactionResult = await logTransaction({
            customer_id: data.id,
            transaction_type: 'opening_balance',
            amount: balanceAmount,
            description: `Opening balance for new customer ${data.shop_name}`,
            reference_number: data.customer_id || `CUST-${data.id}`,
            metadata: {
              balance_type: formData.balanceType,
              customer_name: data.name,
              shop_name: data.shop_name
            }
          });
          if (!transactionResult.success) {
            console.warn('Failed to log opening balance transaction:', transactionResult.error);
          }
        }
      }
      // Handle custom prices with transaction safety
      const customPriceEntries = Object.entries(customPrices)
        .filter(([_, price]) => price && price.trim() !== "")
        .map(([product_id, custom_price]) => ({
          customer_id: customerId,
          product_id,
          custom_price: parseFloat(custom_price)
        }));
      
      if (editMode && initialData) {
        // Use transaction for atomicity - delete old and insert new
        try {
          await (supabase as any).from('customer_product_prices').delete().eq('customer_id', customerId);
          if (customPriceEntries.length > 0) {
            const { error: customPriceError } = await (supabase as any)
              .from('customer_product_prices')
              .insert(customPriceEntries);
            if (customPriceError) throw customPriceError;
          }
        } catch (priceError) {
          console.error('Error updating custom prices:', priceError);
          // Don't fail the entire operation for custom prices
        }
      } else if (customPriceEntries.length > 0) {
        try {
          const { error: customPriceError } = await (supabase as any)
            .from('customer_product_prices')
            .insert(customPriceEntries);
          if (customPriceError) throw customPriceError;
        } catch (priceError) {
          console.error('Error saving custom prices:', priceError);
          // Don't fail the entire operation for custom prices
        }
      }
      toast({
        title: editMode ? "Customer updated" : "Success",
        description: editMode ? `Customer ${formData.shop_name} updated successfully.` : `Customer ${data.shop_name} added successfully with ID: ${data.customer_id}`,
      });
      
      // Reset form data for next use
      if (!editMode) {
        setFormData({
          name: "",
          shop_name: "",
          phone: "",
          address: "",
          pincode: "",
          route_id: "none",
          balanceType: "opening_balance",
          balanceAmount: "0",
        });
        setCustomPrices({});
      }
      
      setOpen(false);
      onCustomerAdded();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${editMode ? "update" : "add"} customer`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    // Format phone number on the fly
    if (field === 'phone') {
      // Remove all non-digits
      const cleaned = value.replace(/\D/g, '');
      // Limit to 10 digits
      const limited = cleaned.slice(0, 10);
      setFormData(prev => ({ ...prev, [field]: limited }));
    } else if (field === 'pincode') {
      // Only allow 6 digits for pincode
      const cleaned = value.replace(/\D/g, '');
      const limited = cleaned.slice(0, 6);
      setFormData(prev => ({ ...prev, [field]: limited }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleCustomPriceChange = (productId: string, value: string) => {
    setCustomPrices((prev) => ({ ...prev, [productId]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-accent text-accent-foreground hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
        <DialogHeader>
          <VisuallyHidden.Root>
            <DialogTitle>Add New Customer</DialogTitle>
          </VisuallyHidden.Root>
        </DialogHeader>
        
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Add New Customer</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Contact Person Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter contact person name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shop_name">Shop/Business Name *</Label>
              <Input
                id="shop_name"
                value={formData.shop_name}
                onChange={(e) => handleInputChange("shop_name", e.target.value)}
                placeholder="Enter shop or business name"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Enter phone number"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input
                id="pincode"
                value={formData.pincode}
                onChange={(e) => handleInputChange("pincode", e.target.value)}
                placeholder="Enter pincode"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Enter complete address"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="route">Route (Optional)</Label>
              <Select value={formData.route_id} onValueChange={(value) => handleInputChange("route_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a route" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Route</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.route_code} - {route.route_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="balanceType">Balance Type</Label>
              <Select value={formData.balanceType} onValueChange={(value) => handleInputChange("balanceType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select balance type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opening_balance">Opening Balance (You owe customer)</SelectItem>
                  <SelectItem value="outstanding">Outstanding (Customer owes you)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="balanceAmount">Amount (₹)</Label>
              <Input
                id="balanceAmount"
                type="number"
                min="0"
                step="0.01"
                value={formData.balanceAmount}
                onChange={(e) => handleInputChange("balanceAmount", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custom Pricing (optional)</Label>
            <div className="border rounded-lg p-2 max-h-48 sm:max-h-64 overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Product</th>
                      <th className="text-left p-2">Default Price</th>
                      <th className="text-left p-2">Custom Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b last:border-b-0">
                        <td className="p-2 font-medium">{product.name}</td>
                        <td className="p-2">₹{product.price}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={customPrices[product.id] || ""}
                            onChange={(e) => handleCustomPriceChange(product.id, e.target.value)}
                            placeholder="Default"
                            className="w-full max-w-[120px]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Customer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}