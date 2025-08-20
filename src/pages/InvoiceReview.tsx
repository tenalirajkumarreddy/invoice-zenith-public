import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  Receipt, 
  Package, 
  User, 
  Store, 
  Phone, 
  MapPin,
  CheckCircle,
  XCircle,
  Save,
  Plus,
  X,
  Ban
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompanySettingsContext } from "@/contexts/CompanySettingsContext";
import { logTransaction } from "@/lib/transaction-utils";

interface Customer {
  id: string;
  customer_id: string;
  name: string;
  shop_name: string;
  phone: string;
  address: string;
  pincode: string;
  balance: number;
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

interface OrderItem {
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  delivered_quantity?: number;
  is_delivered?: boolean;
}

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer: Customer;
  items: OrderItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  order_date: string;
  agent_id?: string;
  assigned_date?: string;
  is_priority: boolean;
  created_at: string;
}

interface InvoiceItem {
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_delivered?: boolean;
}

interface PaymentRow {
  id: string;
  type: string;
  amount: string;
}

export default function InvoiceReview() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [selectedCustomerData, setSelectedCustomerData] = useState<Customer | null>(null);
  const { toast } = useToast();
  const { settings } = useCompanySettingsContext();

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers (
            *,
            routes (route_name, route_code)
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      // Parse items from Json to OrderItem[]
      const parsedItems = Array.isArray(data.items) 
        ? data.items 
        : (typeof data.items === 'string' ? JSON.parse(data.items) : []);

      const orderWithParsedItems = {
        ...data,
        items: parsedItems as OrderItem[]
      };

      setOrder(orderWithParsedItems);
      setSelectedCustomerData(data.customer);
      
      // Initialize invoice items from order items
      const initialInvoiceItems = parsedItems.map((item: OrderItem) => ({
        product_id: item.product_id,
        product_code: item.product_code,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }));
      
      setInvoiceItems(initialInvoiceItems);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({
        title: "Error",
        description: "Failed to fetch order details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...invoiceItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // If quantity changed, update total_price
    if (field === 'quantity') {
      updatedItems[index].total_price = updatedItems[index].unit_price * value;
    }

    setInvoiceItems(updatedItems);
  };

  const toggleItemDelivery = (index: number) => {
    const updatedItems = [...invoiceItems];
    updatedItems[index].is_delivered = !updatedItems[index].is_delivered;
    
    // If item is not delivered, set quantity to 0
    if (!updatedItems[index].is_delivered) {
      updatedItems[index].quantity = 0;
      updatedItems[index].total_price = 0;
    } else {
      // If item is delivered, restore original quantity
      const originalItem = order?.items[index];
      if (originalItem) {
        updatedItems[index].quantity = originalItem.quantity;
        updatedItems[index].total_price = originalItem.total_price;
      }
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

  const getOutstandingAmount = () => {
    return calculateTotal() - getTotalPaidAmount();
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

  const getPaymentMode = () => {
    const amounts = getPaymentAmounts();
    const hasMultipleTypes = [amounts.cash, amounts.upi, amounts.balance].filter(amt => amt > 0).length > 1;
    
    if (hasMultipleTypes) return 'mixed';
    if (amounts.cash > 0) return 'cash';
    if (amounts.upi > 0) return 'upi';
    if (amounts.balance > 0) return 'balance';
    return 'credit';
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
          updatedRow.amount = Math.min(numAmount, maxBalanceAmount).toString();
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

  const handlePaymentModeChange = (mode: string) => {
    setPaymentMode(mode);
    setPaymentRows([]);
    
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

  const createInvoice = async () => {
    if (!order || invoiceItems.length === 0) {
      toast({
        title: "Error",
        description: "No order or items to invoice",
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

      const outstandingAmount = getOutstandingAmount();
      
      // Determine payment status
      let paymentStatus = 'pending';
      if (totalPaid >= totalAmount) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial';
      }
      
      // Create invoice
      const amounts = getPaymentAmounts();
      const invoiceDataToInsert: any = {
        invoice_number: `INV-${Date.now()}`,
        customer_id: order.customer_id,
        agent_id: user.id,
        order_id: order.id,
        source: 'order',
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
      const invoiceItemsData = invoiceItems
        .filter(item => item.quantity > 0) // Only include delivered items
        .map(item => ({
          invoice_id: invoiceData.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }));

      if (invoiceItemsData.length > 0) {
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItemsData);

        if (itemsError) throw itemsError;
      }

      // Log transactions for payments
      const paymentAmounts = getPaymentAmounts();
      
      // Log balance payment transaction if balance was used
      if (paymentAmounts.balance > 0) {
        const balanceTransaction = await logTransaction({
          customer_id: order.customer_id,
          invoice_id: invoiceData.id,
          transaction_type: 'balance_payment',
          amount: -paymentAmounts.balance, // Negative because it reduces customer balance
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
          customer_id: order.customer_id,
          invoice_id: invoiceData.id,
          transaction_type: 'invoice_payment',
          amount: -outstandingAmount, // Negative because it increases outstanding
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
          .eq('id', order.customer_id);

        if (customerError) throw customerError;
      }

      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'delivered',
          invoice_status: 'active'
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      toast({
        title: "Success",
        description: `Invoice created successfully! ${outstandingAmount > 0 ? `Outstanding: ₹${outstandingAmount.toFixed(2)}` : 'Fully paid'}`,
      });

      // Redirect to invoices page
      navigate('/invoices');
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

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          invoice_status: 'cancelled'
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order cancelled successfully",
      });

      navigate('/orders');
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <XCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Order not found</p>
          <Button onClick={() => navigate('/orders')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Invoice Review</h2>
          <p className="text-muted-foreground">Review order details and create invoice</p>
        </div>
      </div>

      {/* Order Info */}
      <Card className="p-6 bg-gradient-card shadow-card border-border/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Order Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Number:</span>
                <span className="font-medium">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Date:</span>
                <span className="font-medium">{order.order_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={order.status === 'pending' ? 'secondary' : 'default'}>
                  {order.status}
                </Badge>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Customer Information</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{order.customer.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-muted-foreground" />
                <span>{order.customer.shop_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{order.customer.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{order.customer.address}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Customer Balance Info */}
      {selectedCustomerData && (
        <Card className="p-4 border border-border rounded-lg bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-foreground">{selectedCustomerData.shop_name}</h4>
              <p className="text-sm text-muted-foreground">{selectedCustomerData.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-lg font-semibold text-success">₹{(selectedCustomerData.balance || 0).toFixed(2)}</p>
              {(selectedCustomerData.balance || 0) < 0 && (
                <p className="text-sm text-warning">Outstanding: ₹{Math.abs(selectedCustomerData.balance || 0).toFixed(2)}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Order Items Review */}
      <Card className="p-6 bg-gradient-card shadow-card border-border/50">
        <h3 className="text-lg font-semibold text-foreground mb-4">Order Items Review</h3>
        <div className="space-y-3">
          {invoiceItems.map((item, index) => (
            <div key={index} className="flex items-center gap-4 p-4 border border-border rounded-lg">
              <Checkbox
                checked={item.is_delivered}
                onCheckedChange={() => toggleItemDelivery(index)}
              />
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-foreground">{item.product_name}</h4>
                  <Badge variant="outline">{item.product_code}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Original: {order.items[index].quantity} × ₹{item.unit_price} = ₹{order.items[index].total_price}
                </p>
                
                {item.is_delivered && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-foreground">Delivered Quantity:</label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      min="0"
                      max={order.items[index].quantity}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">
                      = ₹{item.total_price}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="text-right">
                {item.is_delivered ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Invoice Summary */}
      <Card className="p-6 bg-gradient-card shadow-card border-border/50">
        <h3 className="text-lg font-semibold text-foreground mb-4">Invoice Summary</h3>
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
      </Card>

      {/* Create Invoice Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => navigate('/orders')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Button>
        <Button
          variant="outline"
          onClick={handleCancelOrder}
          className="text-warning border-warning hover:bg-warning/10"
        >
          <Ban className="w-4 h-4 mr-2" />
          Cancel Order
        </Button>
        <Button
          onClick={() => setShowPaymentDialog(true)}
          disabled={invoiceItems.filter(item => item.is_delivered).length === 0}
          className="bg-gradient-primary text-primary-foreground hover:opacity-90"
        >
          <Receipt className="w-4 h-4 mr-2" />
          Generate Invoice
        </Button>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Payment Mode Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {paymentMode === 'mixed' && (
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
              )}
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
                    {paymentMode.charAt(0).toUpperCase() + paymentMode.slice(1)} Payment Amount
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
                    max={calculateTotal()}
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum: ₹{calculateTotal().toFixed(2)}
                  </p>
                </div>
                
                {/* Payment Summary for Single Payment */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span>₹{calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{paymentMode.charAt(0).toUpperCase() + paymentMode.slice(1)} Payment:</span>
                    <span className="text-success">₹{getTotalPaidAmount().toFixed(2)}</span>
                  </div>
                  {getOutstandingAmount() > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-warning">Outstanding:</span>
                      <span className="text-warning font-medium">₹{getOutstandingAmount().toFixed(2)}</span>
                    </div>
                  )}
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
                
                {/* Payment Summary for Balance Payment */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span>₹{calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance Payment:</span>
                    <span className="text-success">₹{getTotalPaidAmount().toFixed(2)}</span>
                  </div>
                  {getOutstandingAmount() > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-warning">Outstanding:</span>
                      <span className="text-warning font-medium">₹{getOutstandingAmount().toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPaymentDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={createInvoice}
                disabled={creatingInvoice || getTotalPaidAmount() === 0}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                {creatingInvoice ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 