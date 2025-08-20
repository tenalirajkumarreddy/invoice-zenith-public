import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, FileText, User, Store, Phone, Receipt, X, MoreVertical, Edit, Trash2, Ban, Share, Eye } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompanySettingsContext } from "@/contexts/CompanySettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { logTransaction, handleInvoiceRefund } from "@/lib/transaction-utils";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  total_amount: number;
  payment_status: string;
  invoice_date: string;
  subtotal: number;
  discount: number;
  payment_amount: number;
  balance_amount?: number;
  cash_amount?: number;
  upi_amount?: number;
  status?: string;
  source?: string;
  order_id?: string;
  customers: {
    name: string;
    shop_name: string;
  };
  invoice_items: {
    quantity: number;
  }[];
}

interface Customer {
  id: string;
  customer_id: string;
  name: string;
  shop_name: string;
  phone: string;
  address: string;
  pincode: string;
  balance: number;
  outstanding?: number;
  total_orders?: number;
  routes?: {
    route_name: string;
    route_code: string;
  };
}

interface Product {
  id: string;
  product_code: string;
  name: string;
  category: string | null;
  unit: string;
  price: number;
  is_active: boolean;
}

interface InvoiceItem {
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [selectedCustomerData, setSelectedCustomerData] = useState<Customer | null>(null);
  const [loadingCustomerData, setLoadingCustomerData] = useState(false);
  const [refreshingCustomerData, setRefreshingCustomerData] = useState(false);
  const [paymentRows, setPaymentRows] = useState<Array<{id: string, type: string, amount: string}>>([]);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { settings, getNextInvoiceNumber } = useCompanySettingsContext();

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrlKey: true,
      callback: () => setShowCreateDialog(true),
      description: 'Create new invoice (Ctrl+N)'
    },
    {
      key: 'f',
      ctrlKey: true,
      callback: () => document.getElementById('search-input')?.focus(),
      description: 'Focus search (Ctrl+F)'
    },
    {
      key: 'Escape',
      callback: () => setShowCreateDialog(false),
      description: 'Close dialog (Esc)'
    }
  ]);

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (name, shop_name),
          invoice_items (quantity)
        `)
        // .eq('status', 'active') // Remove this line to fetch all invoices
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          routes (route_name, route_code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
    }
  };

  // Function to refresh customer data for the currently selected customer
  const refreshSelectedCustomerData = async () => {
    if (!selectedCustomer) return;
    
    setRefreshingCustomerData(true);
    try {
      // Fetch fresh customer data from database
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          routes (route_name, route_code)
        `)
        .eq('id', selectedCustomer)
        .single();

      if (error) throw error;
      setSelectedCustomerData(data);
    } catch (error) {
      console.error('Error refreshing customer data:', error);
      // Don't show error toast for refresh, just log it
    } finally {
      setRefreshingCustomerData(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const customerName = invoice.customers?.name || invoice.customers?.shop_name || '';
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || invoice.payment_status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCancelInvoice = async (invoice: Invoice) => {
    // Only admins can cancel invoices
    if (profile?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only administrators can cancel invoices",
        variant: "destructive",
      });
      return;
    }

    if (!confirm('Are you sure you want to cancel this invoice?')) return;

    try {
      // Handle refund if balance was used
      const refundResult = await handleInvoiceRefund(invoice, 'cancelled');
      if (!refundResult.success) {
        throw new Error(`Refund failed: ${refundResult.error}`);
      }

      // Update invoice status to cancelled
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('id', invoice.id);

      if (error) throw error;

      // If invoice was generated from order, also cancel the order
      if (invoice.order_id) {
        const { error: orderError } = await supabase
          .from('orders')
          .update({ status: 'cancelled', invoice_status: 'cancelled' })
          .eq('id', invoice.order_id);

        if (orderError) throw orderError;
      }

      const refundMessage = invoice.balance_amount > 0 
        ? ` and ₹${invoice.balance_amount.toFixed(2)} refunded to customer balance`
        : '';

      toast({
        title: "Success",
        description: `Invoice cancelled successfully${refundMessage}`,
      });

      fetchInvoices();
      // Add a small delay to ensure database transaction is committed
      setTimeout(() => {
        refreshSelectedCustomerData(); // Refresh customer data after refund
        fetchCustomers(); // Refresh all customers list
      }, 100);
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast({
        title: "Error",
        description: "Failed to cancel invoice",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    // Only admins can delete invoices
    if (profile?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only administrators can delete invoices",
        variant: "destructive",
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Handle refund if balance was used
      const refundResult = await handleInvoiceRefund(invoice, 'deleted');
      if (!refundResult.success) {
        throw new Error(`Refund failed: ${refundResult.error}`);
      }

      // First, move to deleted_invoices table for logging
      const { error: deleteLogError } = await supabase
        .from('deleted_invoices')
        .insert({
          original_invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          customer_id: invoice.customer_id,
          agent_id: user.id,
          total_amount: invoice.total_amount,
          invoice_date: invoice.invoice_date,
          deleted_by: user.id,
          original_data: JSON.stringify(invoice)
        });

      if (deleteLogError) throw deleteLogError;

      // Delete invoice items first (foreign key constraint)
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoice.id);

      if (itemsError) throw itemsError;

      // Delete the invoice
      const { error: invoiceError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;

      // If invoice was generated from order, also delete the order
      if (invoice.order_id) {
        // Delete order items first
        const { error: orderItemsError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', invoice.order_id);

        if (orderItemsError) throw orderItemsError;

        // Delete the order
        const { error: orderError } = await supabase
          .from('orders')
          .delete()
          .eq('id', invoice.order_id);

        if (orderError) throw orderError;
      }

      const refundMessage = invoice.balance_amount > 0 
        ? ` and ₹${invoice.balance_amount.toFixed(2)} refunded to customer balance`
        : '';

      toast({
        title: "Success",
        description: `Invoice deleted successfully${refundMessage}`,
      });

      fetchInvoices();
      // Add a small delay to ensure database transaction is committed
      setTimeout(() => {
        refreshSelectedCustomerData(); // Refresh customer data after refund
        fetchCustomers(); // Refresh all customers list
      }, 100);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success text-success-foreground">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getItemsCount = (invoiceItems: { quantity: number }[]) => {
    return invoiceItems?.length || 0;
  };

  const calculateGst = (amount: number) => {
    return amount * 0.18; // Assuming 18% GST
  };

  const addItemToInvoice = () => {
    setInvoiceItems([...invoiceItems, {
      product_id: "",
      product_code: "",
      product_name: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }]);
  };

  const removeItemFromInvoice = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...invoiceItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // If product_id changed, update product details
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index].product_code = product.product_code;
        updatedItems[index].product_name = product.name;
        updatedItems[index].unit_price = product.price;
        updatedItems[index].total_price = product.price * updatedItems[index].quantity;
      }
    }

    // If quantity changed, update total_price
    if (field === 'quantity') {
      updatedItems[index].total_price = updatedItems[index].unit_price * value;
    }

    setInvoiceItems(updatedItems);
  };

  const calculateSubtotal = () => {
    return invoiceItems.reduce((total, item) => total + item.total_price, 0);
  };

  const calculateTax = () => {
    if (!settings?.gst_enabled) return 0;
    const taxRate = settings.default_tax_rate || 18;
    return calculateSubtotal() * (taxRate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const getTotalPaidAmount = () => {
    return paymentRows.reduce((total, row) => total + (parseFloat(row.amount) || 0), 0);
  };

  const getPaymentAmounts = () => {
    const amounts = {
      cash: 0,
      upi: 0,
      balance: 0
    };
    
    paymentRows.forEach(row => {
      const amount = parseFloat(row.amount) || 0;
      if (row.type === 'cash') amounts.cash += amount;
      else if (row.type === 'upi') amounts.upi += amount;
      else if (row.type === 'balance') amounts.balance += amount;
    });
    
    return amounts;
  };

  const getOutstandingAmount = () => {
    return calculateTotal() - getTotalPaidAmount();
  };

  const handleCustomerChange = async (customerId: string) => {
    setSelectedCustomer(customerId);
    setLoadingCustomerData(true);
    
    // Reset payment rows when customer changes
    setPaymentRows([]);

    try {
      // Fetch fresh customer data from database
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          routes (route_name, route_code)
        `)
        .eq('id', customerId)
        .single();

      if (error) throw error;
      setSelectedCustomerData(data);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch latest customer data",
        variant: "destructive",
      });
      
      // Fallback to existing customer data
      const customer = customers.find(c => c.id === customerId);
      setSelectedCustomerData(customer || null);
    } finally {
      setLoadingCustomerData(false);
    }
  };

  const handlePaymentModeChange = (mode: string) => {
    setPaymentMode(mode);
    
    // Reset payment rows when mode changes
    setPaymentRows([]);
    
    // Set default row based on mode
    if (mode === 'balance' && selectedCustomerData) {
      const availableBalance = selectedCustomerData.balance || 0;
      const totalAmount = calculateTotal();
      const defaultAmount = Math.min(availableBalance, totalAmount);
      setPaymentRows([{
        id: Date.now().toString(),
        type: 'balance',
        amount: defaultAmount.toString()
      }]);
    }
  };

  const addPaymentRow = () => {
    const newRow = {
      id: Date.now().toString(),
      type: 'cash',
      amount: ''
    };
    setPaymentRows([...paymentRows, newRow]);
  };

  const removePaymentRow = (id: string) => {
    setPaymentRows(paymentRows.filter(row => row.id !== id));
  };

  const updatePaymentRow = (id: string, field: 'type' | 'amount', value: string) => {
    setPaymentRows(paymentRows.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        
        // Validate balance amount
        if (field === 'amount' && row.type === 'balance') {
          const numAmount = parseFloat(value) || 0;
          const availableBalance = selectedCustomerData?.balance || 0;
          const totalAmount = calculateTotal();
          const maxBalanceAmount = Math.min(availableBalance, totalAmount);
          
          if (numAmount > maxBalanceAmount) {
            toast({
              title: "Invalid Amount",
              description: `Maximum balance amount available: ₹${maxBalanceAmount.toFixed(2)}`,
              variant: "destructive",
            });
            updatedRow.amount = maxBalanceAmount.toString();
          } else {
            updatedRow.amount = numAmount.toString();
          }
        }
        
        // Validate total payment doesn't exceed invoice amount
        if (field === 'amount') {
          const newAmount = parseFloat(value) || 0;
          const otherPayments = paymentRows
            .filter(r => r.id !== id)
            .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
          const totalPayment = otherPayments + newAmount;
          const invoiceTotal = calculateTotal();
          
          if (totalPayment > invoiceTotal) {
            const maxAmount = invoiceTotal - otherPayments;
            toast({
              title: "Payment Exceeds Invoice",
              description: `Maximum amount for this payment: ₹${maxAmount.toFixed(2)}`,
              variant: "destructive",
            });
            updatedRow.amount = Math.max(0, maxAmount).toString();
          }
        }
        
        return updatedRow;
      }
      return row;
    }));
  };

  const getAvailablePaymentTypes = (currentRowId: string) => {
    const usedTypes = paymentRows
      .filter(row => row.id !== currentRowId)
      .map(row => row.type);
    
    const allTypes = ['cash', 'upi', 'balance'];
    return allTypes.filter(type => !usedTypes.includes(type));
  };

  const getPaymentMode = () => {
    const amounts = getPaymentAmounts();
    const hasMultipleTypes = [amounts.cash, amounts.upi, amounts.balance].filter(amt => amt > 0).length > 1;
    
    if (hasMultipleTypes) return 'mixed';
    if (amounts.cash > 0) return 'cash';
    if (amounts.upi > 0) return 'upi';
    if (amounts.balance > 0) return 'balance';
    return 'credit'; // Default for unpaid amounts
  };

  const createInvoice = async () => {
    // Only admins can create invoices
    if (profile?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only administrators can create invoices",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCustomer || invoiceItems.length === 0) {
      toast({
        title: "Error",
        description: "Please select a customer and add at least one item",
        variant: "destructive",
      });
      return;
    }

    // Validate balance payment
    const amounts = getPaymentAmounts();
    const availableBalance = selectedCustomerData?.balance || 0;
    
    if (amounts.balance > availableBalance) {
      toast({
        title: "Error",
        description: `Cannot use ₹${amounts.balance.toFixed(2)} from balance. Available: ₹${availableBalance.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    // Validate total payment doesn't exceed invoice amount
    const totalPaid = getTotalPaidAmount();
    const totalAmount = calculateTotal();
    
    if (totalPaid > totalAmount) {
      toast({
        title: "Error",
        description: `Total payment (₹${totalPaid.toFixed(2)}) cannot exceed invoice amount (₹${totalAmount.toFixed(2)})`,
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatingInvoice(true);
      
      // Get current user to use as agent_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const totalAmount = calculateTotal();
      const totalPaid = getTotalPaidAmount();
      const outstandingAmount = getOutstandingAmount();
      
      // Determine payment status
      let paymentStatus = 'pending';
      if (totalPaid >= totalAmount) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial';
      }
      
      // Create invoice
      const nextInvoiceNumber = await getNextInvoiceNumber();
      const invoiceDataToInsert: any = {
        invoice_number: nextInvoiceNumber,
        customer_id: selectedCustomer,
        agent_id: user.id,
        source: 'direct',
        status: 'active',
        subtotal: calculateSubtotal(),
        total_amount: totalAmount,
        payment_mode: getPaymentMode(),
        payment_amount: totalPaid,
        cash_amount: amounts.cash,
        upi_amount: amounts.upi,
        balance_amount: amounts.balance,
        payment_status: paymentStatus,
        invoice_date: new Date().toISOString().split('T')[0]
      };

      // Add tax_amount only if GST is enabled
      if (settings?.gst_enabled) {
        invoiceDataToInsert.tax_amount = calculateTax();
      }

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceDataToInsert)
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItemsData = invoiceItems.map(item => ({
        invoice_id: invoiceData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItemsData);

      if (itemsError) throw itemsError;

      // Log transactions for payments
      const paymentAmounts = getPaymentAmounts();
      
      // Log balance payment transaction if balance was used
      if (paymentAmounts.balance > 0) {
        const balanceTransaction = await logTransaction({
          customer_id: selectedCustomer,
          invoice_id: invoiceData.id,
          transaction_type: 'balance_payment',
          amount: paymentAmounts.balance, // Positive amount that will be deducted from balance
          payment_method: 'balance',
          description: `Balance payment for invoice ${invoiceData.invoice_number}`,
          reference_number: invoiceData.invoice_number
        });

        if (!balanceTransaction.success) {
          throw new Error(`Failed to log balance transaction: ${balanceTransaction.error}`);
        }
      }

      // Log invoice payment transaction if there's outstanding amount
      if (outstandingAmount > 0) {
        const paymentMode = getPaymentMode();
        const invoiceTransaction = await logTransaction({
          customer_id: selectedCustomer,
          invoice_id: invoiceData.id,
          transaction_type: 'invoice_creation',
          amount: outstandingAmount, // Positive amount to increase outstanding
          payment_method: paymentMode === 'credit' ? undefined : paymentMode as 'cash' | 'upi' | 'balance' | 'mixed',
          description: `Invoice created with outstanding amount for ${invoiceData.invoice_number}`,
          reference_number: invoiceData.invoice_number
        });

        if (!invoiceTransaction.success) {
          throw new Error(`Failed to log invoice transaction: ${invoiceTransaction.error}`);
        }
      }

      // Update customer total orders
      if (selectedCustomerData) {
        const { error: customerError } = await supabase
          .from('customers')
          .update({
            total_orders: (selectedCustomerData.total_orders || 0) + 1
          })
          .eq('id', selectedCustomer);

        if (customerError) throw customerError;
      }

      toast({
        title: "Success",
        description: `Invoice created successfully! ${outstandingAmount > 0 ? `Outstanding: ₹${outstandingAmount.toFixed(2)}` : 'Fully paid'}`,
      });

      // Reset form and close dialog
      setSelectedCustomer("");
      setSelectedCustomerData(null);
      setInvoiceItems([]);
      setPaymentRows([]);
      setShowCreateDialog(false);
      
      // Refresh invoices list
      fetchInvoices();
      refreshSelectedCustomerData(); // Refresh customer data after invoice creation
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setCreatingInvoice(false);
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
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Invoice Management</h2>
          <p className="text-muted-foreground">Create, manage, and track your GST-compliant invoices</p>
        </div>
        {profile?.role === 'admin' && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Customer Selection */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Select Customer</label>
                {customers.length === 0 ? (
                  <div className="p-4 border border-border rounded-lg bg-muted/20">
                    <p className="text-sm text-muted-foreground text-center">
                      No customers found. Please add customers first.
                    </p>
                  </div>
                ) : (
                  <Select value={selectedCustomer} onValueChange={handleCustomerChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{customer.shop_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {customer.name} • {customer.customer_id}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Invoice Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-foreground">Invoice Items</label>
                  <Button size="sm" onClick={addItemToInvoice}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Item
                  </Button>
                </div>
                
                {invoiceItems.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                    <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No items added</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoiceItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                        <div className="flex-1">
                          <Select 
                            value={item.product_id} 
                            onValueChange={(value) => updateInvoiceItem(index, 'product_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{product.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {product.product_code} • ₹{product.price}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            min="1"
                          />
                        </div>
                        <div className="w-32">
                          <Input
                            type="number"
                            placeholder="Price"
                            value={item.unit_price}
                            onChange={(e) => updateInvoiceItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="w-32">
                          <Input
                            type="number"
                            placeholder="Total"
                            value={item.total_price}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeItemFromInvoice(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Balance Info */}
              {selectedCustomerData && (
                <div className="p-4 border border-border rounded-lg bg-muted/20">
                  {loadingCustomerData || refreshingCustomerData ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {refreshingCustomerData ? 'Updating balance...' : 'Loading latest balance...'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{selectedCustomerData.shop_name}</h4>
                        <p className="text-sm text-muted-foreground">{selectedCustomerData.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Available Balance</p>
                        <p className="text-lg font-semibold text-success">₹{(selectedCustomerData.balance || 0).toFixed(2)}</p>
                        {(selectedCustomerData.outstanding || 0) > 0 && (
                          <p className="text-sm text-warning">Outstanding: ₹{(selectedCustomerData.outstanding || 0).toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Show loading state for customer selection */}
              {selectedCustomer && !selectedCustomerData && loadingCustomerData && (
                <div className="p-4 border border-border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Loading customer details...</span>
                  </div>
                </div>
              )}

              {/* Payment Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Payment Details</label>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Payment Mode</label>
                    <Select value={paymentMode} onValueChange={handlePaymentModeChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="balance">Balance</SelectItem>
                        <SelectItem value="mixed">Mixed Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Total Paid</label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={getTotalPaidAmount().toString()}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>

                {/* Payment Rows for Mixed Payment */}
                {paymentMode === 'mixed' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Payment Breakdown</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPaymentRow}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Payment
                      </Button>
                    </div>

                    {paymentRows.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                        <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No payment methods added</p>
                        <p className="text-xs text-muted-foreground mt-1">Click "Add Payment" to start</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {paymentRows.map((row, index) => (
                          <div key={row.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                            <div className="flex-1">
                              <Select 
                                value={row.type} 
                                onValueChange={(value) => updatePaymentRow(row.id, 'type', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailablePaymentTypes(row.id).map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="w-32">
                              <Input
                                type="number"
                                placeholder="Amount"
                                value={row.amount}
                                onChange={(e) => updatePaymentRow(row.id, 'amount', e.target.value)}
                                min="0"
                                step="0.01"
                              />
                            </div>
                            {paymentRows.length > 1 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removePaymentRow(row.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Payment Summary */}
                    {paymentRows.length > 0 && (
                      <div className="border-t pt-4 space-y-2">
                        {getPaymentAmounts().cash > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Cash:</span>
                            <span>₹{getPaymentAmounts().cash.toFixed(2)}</span>
                          </div>
                        )}
                        {getPaymentAmounts().upi > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">UPI:</span>
                            <span>₹{getPaymentAmounts().upi.toFixed(2)}</span>
                          </div>
                        )}
                        {getPaymentAmounts().balance > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Balance:</span>
                            <span>₹{getPaymentAmounts().balance.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium border-t pt-2">
                          <span>Total Paid:</span>
                          <span className="text-success">₹{getTotalPaidAmount().toFixed(2)}</span>
                        </div>
                        {getOutstandingAmount() > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-warning">Outstanding:</span>
                            <span className="text-warning font-medium">₹{getOutstandingAmount().toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Single Payment Method */}
                {paymentMode !== 'mixed' && paymentMode !== 'balance' && (
                  <div className="space-y-4 p-4 border border-border rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        {paymentMode.charAt(0).toUpperCase() + paymentMode.slice(1)} Payment
                      </label>
                      <Input
                        type="number"
                        placeholder={`Enter ${paymentMode} amount`}
                        value={getTotalPaidAmount().toString()}
                        onChange={(e) => {
                          const amount = e.target.value;
                          setPaymentRows([{
                            id: Date.now().toString(),
                            type: paymentMode,
                            amount: amount
                          }]);
                        }}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                )}

                {/* Balance Payment with Validation */}
                {paymentMode === 'balance' && selectedCustomerData && (
                  <div className="space-y-4 p-4 border border-border rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Balance Payment (Available: ₹{(selectedCustomerData.balance || 0).toFixed(2)})
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter balance amount"
                        value={getTotalPaidAmount().toString()}
                        onChange={(e) => {
                          const amount = e.target.value;
                          const maxAmount = Math.min(selectedCustomerData.balance || 0, calculateTotal());
                          const finalAmount = Math.min(parseFloat(amount) || 0, maxAmount);
                          setPaymentRows([{
                            id: Date.now().toString(),
                            type: 'balance',
                            amount: finalAmount.toString()
                          }]);
                        }}
                        min="0"
                        max={Math.min(selectedCustomerData.balance || 0, calculateTotal())}
                        step="0.01"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Maximum: ₹{Math.min(selectedCustomerData.balance || 0, calculateTotal()).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">₹{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  {settings?.gst_enabled && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST ({settings.default_tax_rate || 18}%):</span>
                      <span className="font-medium">₹{calculateTax().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>₹{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createInvoice}
                  disabled={creatingInvoice || !selectedCustomer || invoiceItems.length === 0}
                  className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                >
                  {creatingInvoice ? "Creating..." : "Create Invoice"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{invoices.length}</p>
            <p className="text-xs text-muted-foreground">Total Invoices</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{invoices.filter(i => i.payment_status === 'paid').length}</p>
            <p className="text-sm text-muted-foreground">Paid</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-warning">{invoices.filter(i => i.payment_status === 'pending').length}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-destructive">{invoices.filter(i => i.payment_status === 'overdue').length}</p>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6 bg-gradient-card shadow-card border-border/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="search-input"
              placeholder="Search invoices by customer or invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {["all", "paid", "pending", "overdue"].map((status) => (
              <Button
                key={status}
                variant={selectedStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus(status)}
                className={selectedStatus === status ? "bg-primary text-primary-foreground" : ""}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Invoices List */}
      <Card className="bg-gradient-card shadow-card border-border/50">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">All Invoices</h3>
          <div className="space-y-3">
            {filteredInvoices.map((invoice) => (
              <div key={invoice.id} className={`flex items-center justify-between p-4 rounded-lg border border-border/30 hover:bg-background/70 transition-colors ${
                invoice.status === 'cancelled' ? 'bg-destructive/10 border-destructive/30' : 'bg-background/50'
              }`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${invoice.status === 'cancelled' ? 'text-destructive' : 'text-foreground'}`}>
                        {invoice.invoice_number}
                      </span>
                      {invoice.source === 'order' && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          ORDER
                        </Badge>
                      )}
                      {getStatusBadge(invoice.status === 'cancelled' ? 'cancelled' : invoice.payment_status)}
                    </div>
                    <p className={`text-sm ${invoice.status === 'cancelled' ? 'text-destructive/70' : 'text-muted-foreground'}`}>
                      {invoice.customers?.shop_name || invoice.customers?.name || 'Unknown Customer'}
                    </p>
                    <p className={`text-xs ${invoice.status === 'cancelled' ? 'text-destructive/70' : 'text-muted-foreground'}`}>
                      {getItemsCount(invoice.invoice_items)} items • GST: {formatCurrency(calculateGst(invoice.subtotal))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`text-xl font-bold ${invoice.status === 'cancelled' ? 'text-destructive' : 'text-foreground'}`}>
                      {formatCurrency(invoice.total_amount)}
                    </p>
                    <p className={`text-sm ${invoice.status === 'cancelled' ? 'text-destructive/70' : 'text-muted-foreground'}`}>
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      {profile?.role === 'admin' && (
                        <>
                          <DropdownMenuItem disabled={invoice.status === 'cancelled'}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share className="w-4 h-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleCancelInvoice(invoice)}
                            disabled={invoice.status === 'cancelled'}
                            className="text-warning"
                          >
                            <Ban className="w-4 h-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteInvoice(invoice)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}