import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  User, 
  Store, 
  Phone, 
  MapPin, 
  CreditCard, 
  Receipt,
  Plus,
  Minus,
  Save,
  Navigation
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import TransactionHistory from "@/components/TransactionHistory";
import { logTransaction } from "@/lib/transaction-utils";

interface CustomerProfileProps {
  customer: any;
  onBack: () => void;
  routeAssignment?: any;
}

export default function CustomerProfile({ customer, onBack, routeAssignment }: CustomerProfileProps) {
  const [activeTab, setActiveTab] = useState("profile");
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [customer.id, routeAssignment]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch available products from route assignment opening stock
      if (routeAssignment?.opening_stock) {
        const productIds = Object.keys(routeAssignment.opening_stock);
        if (productIds.length > 0) {
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('*')
            .in('product_code', productIds)
            .eq('is_active', true);

          if (productsError) throw productsError;

          // Add stock quantities to products
          const productsWithStock = (productsData || []).map(product => ({
            ...product,
            stock: routeAssignment.opening_stock[product.product_code] || 0
          }));

          setProducts(productsWithStock);
        }
      }

      // Fetch order history for this customer
      const { data: ordersData, error: ordersError } = await supabase
        .from('route_orders')
        .select(`
          *,
          route_assignments (route_id, routes (route_name))
        `)
        .eq('customer_id', customer.id)
        .order('order_date', { ascending: false })
        .order('order_time', { ascending: false })
        .limit(10);

      if (ordersError) throw ordersError;

      setOrderHistory(ordersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customer data",
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

  const addToCart = (product: any) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    if (existingItem) {
      setCartItems(cartItems.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCartItems(cartItems.filter(item => item.id !== productId));
    } else {
      setCartItems(cartItems.map(item => 
        item.id === productId 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.unit_price * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateTotal() * 0.18; // 18% GST
  };

  const calculateGrandTotal = () => {
    return calculateTotal() + calculateTax();
  };

  const handlePayment = async () => {
    if (!routeAssignment) {
      toast({
        title: "Error",
        description: "No active route assignment found",
        variant: "destructive",
      });
      return;
    }

    const grandTotal = calculateGrandTotal();
    const paidAmount = parseFloat(paymentAmount) || grandTotal;
    
    try {
      // Create route order
      const orderData = {
        route_assignment_id: routeAssignment.id,
        customer_id: customer.id,
        order_number: `RO-${Date.now()}`,
        items: cartItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.unit_price * item.quantity
        })),
        subtotal: calculateTotal(),
        tax_amount: calculateTax(),
        total_amount: grandTotal,
        payment_method: paymentMode,
        cash_amount: paymentMode === 'cash' ? paidAmount : 0,
        upi_amount: paymentMode === 'upi' ? paidAmount : 0,
        balance_used: paymentMode === 'balance' ? paidAmount : 0,
        outstanding_amount: grandTotal - paidAmount,
        status: 'delivered',
        delivered_time: new Date().toISOString()
      };

      const { error: orderError } = await supabase
        .from('route_orders')
        .insert(orderData);

      if (orderError) throw orderError;

      // Update customer balance
      const newOutstanding = (customer.outstanding || 0) + (grandTotal - paidAmount);
      const newCredit = Math.max(0, (customer.credit || 0) - paidAmount);

      const { error: customerError } = await supabase
        .from('customers')
        .update({
          outstanding: newOutstanding,
          credit: newCredit,
          total_orders: (customer.total_orders || 0) + 1
        })
        .eq('id', customer.id);

      if (customerError) throw customerError;

      // Log transactions for payments
      const orderNumber = `RO-${Date.now()}`;
      
      // Log balance payment transaction if balance was used
      if (paymentMode === 'balance' && paidAmount > 0) {
        const balanceTransaction = await logTransaction({
          customer_id: customer.id,
          order_id: orderData.order_number,
          transaction_type: 'balance_payment',
          amount: -paidAmount, // Negative because it reduces customer balance
          payment_method: 'balance',
          description: `Balance payment for route order ${orderNumber}`,
          reference_number: orderNumber
        });

        if (!balanceTransaction.success) {
          console.warn('Failed to log balance transaction:', balanceTransaction.error);
        }
      }

      // Log invoice payment transaction if there's outstanding amount
      if (grandTotal - paidAmount > 0) {
        const invoiceTransaction = await logTransaction({
          customer_id: customer.id,
          order_id: orderData.order_number,
          transaction_type: 'invoice_payment',
          amount: -(grandTotal - paidAmount), // Negative because it increases outstanding
          payment_method: paymentMode === 'credit' ? undefined : paymentMode as 'cash' | 'upi' | 'balance' | 'mixed',
          description: `Route order created with outstanding amount for ${orderNumber}`,
          reference_number: orderNumber
        });

        if (!invoiceTransaction.success) {
          console.warn('Failed to log invoice transaction:', invoiceTransaction.error);
        }
      }

      toast({
        title: "Success",
        description: `Order completed successfully! ${grandTotal - paidAmount > 0 ? `Outstanding: ₹${(grandTotal - paidAmount).toFixed(2)}` : 'Fully paid'}`,
      });

      // Reset cart and payment
      setCartItems([]);
      setPaymentAmount('');
      setPaymentMode('cash');
      
      // Refresh customer data
      onBack();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Customers
        </Button>
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={customer.profile_pic_url} alt={customer.name} />
            <AvatarFallback>
              <User className="w-8 h-8" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{customer.name}</h2>
            <p className="text-muted-foreground">{customer.shop_name} • {customer.customer_id}</p>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" className="gap-2">
            <Navigation className="w-4 h-4" />
            Directions
          </Button>
          <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2">
            <Phone className="w-4 h-4" />
            Call Customer
          </Button>
        </div>
      </div>

      {/* Customer Background */}
      <Card className="relative overflow-hidden bg-gradient-card shadow-card border-border/50">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${customer.shop_pic_url})` }}
        />
        <div className="relative p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{customer.total_orders || 0}</p>
              <p className="text-sm text-muted-foreground">Total Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{formatCurrency(customer.credit || 0)}</p>
              <p className="text-sm text-muted-foreground">Credit Balance</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{formatCurrency(customer.outstanding || 0)}</p>
              <p className="text-sm text-muted-foreground">Outstanding</p>
            </div>
            <div className="text-center">
              <Badge className={(customer.outstanding || 0) > 0 ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground"}>
                {(customer.outstanding || 0) > 0 ? "Payment Due" : "All Clear"}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl bg-card border border-border">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="billing">Create Bill</TabsTrigger>
          <TabsTrigger value="history">Order History</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 bg-gradient-card shadow-card border-border/50">
              <h3 className="text-lg font-semibold text-foreground mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{customer.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Store className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{customer.shop_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{customer.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{customer.address}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card shadow-card border-border/50">
              <h3 className="text-lg font-semibold text-foreground mb-4">Financial Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit Balance:</span>
                  <span className="text-success font-semibold">{formatCurrency(customer.credit || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outstanding Amount:</span>
                  <span className="text-warning font-semibold">{formatCurrency(customer.outstanding || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Orders:</span>
                  <span className="text-foreground font-semibold">{customer.total_orders || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Route:</span>
                  <span className="text-foreground font-semibold">{customer.routes?.route_name || 'Not Assigned'}</span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          {!routeAssignment || routeAssignment.status !== 'started' ? (
            <Card className="p-6 bg-gradient-card shadow-card border-border/50">
              <div className="text-center">
                <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Route Not Started</h3>
                <p className="text-muted-foreground">
                  You need to start your route before you can create bills.
                </p>
              </div>
            </Card>
          ) : (
            <>
              {/* Available Products */}
              <Card className="p-6 bg-gradient-card shadow-card border-border/50">
                <h3 className="text-lg font-semibold text-foreground mb-4">Available Products</h3>
                {loading ? (
                  <p className="text-muted-foreground">Loading products...</p>
                ) : products.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {products.map((product) => (
                      <div key={product.id} className="p-4 border border-border/30 rounded-lg bg-background/50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-foreground">{product.product_name}</h4>
                          <Badge variant="outline">{product.stock} in stock</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-foreground font-semibold">{formatCurrency(product.unit_price)}</span>
                          <Button 
                            size="sm" 
                            onClick={() => addToCart(product)}
                            disabled={product.stock <= 0}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No products available for this route.</p>
                )}
              </Card>

              {/* Cart */}
              {cartItems.length > 0 && (
                <Card className="p-6 bg-gradient-card shadow-card border-border/50">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Cart</h3>
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border border-border/30 rounded-lg">
                        <div>
                          <h4 className="font-semibold text-foreground">{item.product_name}</h4>
                          <p className="text-sm text-muted-foreground">{formatCurrency(item.unit_price)} each</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-semibold">{item.quantity}</span>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(item.unit_price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Payment Section */}
                  <div className="mt-6 p-4 border border-border/30 rounded-lg bg-background/50">
                    <h4 className="font-semibold text-foreground mb-4">Payment Details</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Subtotal</label>
                          <p className="text-foreground font-semibold">{formatCurrency(calculateTotal())}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Tax (18%)</label>
                          <p className="text-foreground font-semibold">{formatCurrency(calculateTax())}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Grand Total</label>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(calculateGrandTotal())}</p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-muted-foreground">Payment Method</label>
                          <Select value={paymentMode} onValueChange={setPaymentMode}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                              <SelectItem value="balance">Customer Credit</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Amount Paid</label>
                          <Input
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder={formatCurrency(calculateGrandTotal())}
                          />
                        </div>
                      </div>

                      <Button 
                        className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
                        onClick={handlePayment}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Create Order
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Order History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="p-6 bg-gradient-card shadow-card border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-4">Order History</h3>
            {loading ? (
              <p className="text-muted-foreground">Loading orders...</p>
            ) : orderHistory.length > 0 ? (
              <div className="space-y-3">
                {orderHistory.map((order) => (
                  <div key={order.id} className="p-4 border border-border/30 rounded-lg bg-background/50">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-foreground">{order.order_number}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.order_date).toLocaleDateString()} • {order.route_assignments?.routes?.route_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-foreground font-semibold">{formatCurrency(order.total_amount)}</p>
                        <Badge className={order.status === 'delivered' ? 'bg-success' : 'bg-warning'}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Payment: {order.payment_method} • Outstanding: {formatCurrency(order.outstanding_amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No orders found for this customer.</p>
            )}
          </Card>
        </TabsContent>

        {/* Transaction History Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <TransactionHistory 
            customerId={customer.id} 
            customerName={customer.shop_name || customer.name} 
          />
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card className="p-6 bg-gradient-card shadow-card border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-4">Customer Details</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Customer ID</label>
                <p className="text-foreground font-semibold">{customer.customer_id}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Full Name</label>
                <p className="text-foreground font-semibold">{customer.name}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Shop Name</label>
                <p className="text-foreground font-semibold">{customer.shop_name}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Phone</label>
                <p className="text-foreground font-semibold">{customer.phone}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Address</label>
                <p className="text-foreground font-semibold">{customer.address}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Pincode</label>
                <p className="text-foreground font-semibold">{customer.pincode}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Assigned Route</label>
                <p className="text-foreground font-semibold">{customer.routes?.route_name || 'Not Assigned'}</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}