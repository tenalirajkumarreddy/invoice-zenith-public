import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search, 
  User, 
  Package, 
  Receipt, 
  Calendar,
  MapPin,
  Phone,
  Store,
  Save,
  X,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompanySettingsContext } from "@/contexts/CompanySettingsContext";
import { useAuth } from "@/contexts/AuthContext";

interface Customer {
  id: string;
  customer_id: string;
  name: string;
  shop_name: string;
  phone: string;
  address: string;
  pincode: string;
  balance: number;
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

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  
  // Create order state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [creatingOrder, setCreatingOrder] = useState(false);
  
  // Action dialogs
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  
  const { toast } = useToast();
  const { settings, getNextOrderNumber } = useCompanySettingsContext();
  const { profile } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch orders with customer details
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers (
            id,
            customer_id,
            name,
            shop_name,
            phone,
            address,
            pincode,
            balance,
            routes (route_name, route_code)
          )
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select(`
          *,
          routes (route_name, route_code)
        `)
        .eq('is_active', true)
        .order('shop_name');

      if (customersError) throw customersError;

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (productsError) throw productsError;

      // Fetch agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('profiles')
        .select('user_id, full_name, agent_id')
        .eq('role', 'agent')
        .eq('is_active', true)
        .order('full_name');

      if (agentsError) throw agentsError;

      console.log('Orders data:', ordersData);
      console.log('Customers data:', customersData);
      console.log('Customers count:', customersData?.length || 0);
      console.log('Products data:', productsData);
      console.log('Agents data:', agentsData);
      
      // Parse items from Json to OrderItem[] for each order
      const ordersWithParsedItems = (ordersData || []).map(order => ({
        ...order,
        items: Array.isArray(order.items) 
          ? order.items 
          : (typeof order.items === 'string' ? JSON.parse(order.items) : [])
      }));
      
      setOrders(ordersWithParsedItems);
      setCustomers(customersData || []);
      setProducts(productsData || []);
      setAgents(agentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders data",
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

  const addItemToOrder = () => {
    if (orderItems.length === 0) {
      setOrderItems([{
        product_id: "",
        product_code: "",
        product_name: "",
        quantity: 1,
        unit_price: 0,
        total_price: 0
      }]);
    } else {
      setOrderItems([...orderItems, {
        product_id: "",
        product_code: "",
        product_name: "",
        quantity: 1,
        unit_price: 0,
        total_price: 0
      }]);
    }
  };

  const removeItemFromOrder = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: any) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // If product is selected, update product details
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index].product_code = product.product_code;
        updatedItems[index].product_name = product.name;
        updatedItems[index].unit_price = product.price;
        updatedItems[index].total_price = product.price * updatedItems[index].quantity;
      }
    }
    
    // If quantity is updated, recalculate total
    if (field === 'quantity') {
      updatedItems[index].total_price = updatedItems[index].unit_price * value;
    }
    
    setOrderItems(updatedItems);
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const calculateTax = () => {
    if (!settings?.gst_enabled) {
      return 0;
    }
    const taxRate = settings?.default_tax_rate ?? 18;
    return calculateSubtotal() * (taxRate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const handleAssignToAgent = async () => {
    // Only admins can assign orders to agents
    if (profile?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only administrators can assign orders to agents",
        variant: "destructive",
      });
      return;
    }

    if (!selectedOrder || !selectedAgent) {
      toast({
        title: "Error",
        description: "Please select an agent",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          agent_id: selectedAgent,
          assigned_date: new Date().toISOString(),
          is_priority: true
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order assigned to agent successfully",
      });

      setShowAssignDialog(false);
      setSelectedOrder(null);
      setSelectedAgent("");
      fetchData();
    } catch (error) {
      console.error('Error assigning order:', error);
      toast({
        title: "Error",
        description: "Failed to assign order",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    // Only admins can delete orders
    if (profile?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only administrators can delete orders",
        variant: "destructive",
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this order?')) return;

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order deleted successfully",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    }
  };

  const handleGenerateInvoice = () => {
    if (!selectedOrder) return;
    
    // Redirect to invoice review page
    window.location.href = `/invoice-review/${selectedOrder.id}`;
  };

  const createOrder = async () => {
    // Only admins can create orders
    if (profile?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only administrators can create orders",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCustomer || orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Please select a customer and add at least one item",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatingOrder(true);
      
      // Generate order number
      const orderNumber = await getNextOrderNumber();
      
      const orderData = {
        order_number: orderNumber,
        customer_id: selectedCustomer,
        items: JSON.stringify(orderItems), // Convert to JSON string for database
        subtotal: calculateSubtotal(),
        tax_amount: calculateTax(),
        total_amount: calculateTotal(),
        status: 'pending',
        order_date: new Date().toISOString().split('T')[0]
      };

      const { error: orderError } = await supabase
        .from('orders')
        .insert(orderData);

      if (orderError) throw orderError;

      toast({
        title: "Success",
        description: "Order created successfully",
      });

      // Reset form and close dialog
      setSelectedCustomer("");
      setOrderItems([]);
      setShowCreateDialog(false);
      
      // Refresh orders list
      fetchData();
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setCreatingOrder(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.customer_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground">Orders</h3>
          <p className="text-muted-foreground">Manage customer orders and invoices</p>
        </div>
        {profile?.role === 'admin' && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Create Order
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
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
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
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

              {/* Order Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-foreground">Order Items</label>
                  <Button size="sm" onClick={addItemToOrder}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Item
                  </Button>
                </div>
                
                {orderItems.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                    <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No items added</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                        <div className="flex-1">
                          <Select 
                            value={item.product_id} 
                            onValueChange={(value) => updateOrderItem(index, 'product_id', value)}
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
                                      {product.product_code} • {formatCurrency(product.price)}
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
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            placeholder="Qty"
                          />
                        </div>
                        
                        <div className="w-32 text-right">
                          <p className="font-semibold">{formatCurrency(item.total_price)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.unit_price)} each
                          </p>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeItemFromOrder(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Summary */}
              {orderItems.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-foreground mb-3">Order Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-semibold">{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {!settings?.gst_enabled ? 'Tax:' : `Tax (${settings?.default_tax_rate ?? 18}%):`}
                      </span>
                      <span className="font-semibold">
                        {!settings?.gst_enabled ? 'No Tax' : formatCurrency(calculateTax())}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={createOrder}
                  disabled={!selectedCustomer || orderItems.length === 0 || creatingOrder}
                  className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {creatingOrder ? "Creating..." : "Create Order"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card className="p-6 bg-gradient-card shadow-card border-border/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search orders by number, customer name, or shop..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <Card className="p-12 bg-gradient-card shadow-card border-border/50">
            <div className="text-center">
              <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Orders Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "No orders match your search criteria." 
                  : "Create your first order to get started."
                }
              </p>
            </div>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className={`shadow-card border-border/50 ${
              order.status === 'cancelled' ? 'bg-destructive/10 border-destructive/30' : 'bg-gradient-card'
            }`}>
              <div className="p-4">
                {/* Basic Order Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-semibold ${order.status === 'cancelled' ? 'text-destructive' : 'text-foreground'}`}>
                        {order.order_number}
                      </h4>
                      {order.is_priority && (
                        <Badge className="bg-warning text-warning-foreground text-xs">Priority</Badge>
                      )}
                         <Badge className={
                        order.status === 'delivered' ? 'bg-success' :
                        order.status === 'cancelled' ? 'bg-destructive' :
                        order.status === 'processing' ? 'bg-warning' :
                        'bg-muted'
                      }>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-semibold ${order.status === 'cancelled' ? 'text-destructive' : 'text-foreground'}`}>
                        {formatCurrency(order.total_amount)}
                      </p>
                      <p className={`text-xs ${order.status === 'cancelled' ? 'text-destructive/70' : 'text-muted-foreground'}`}>
                        {order.items?.length || 0} items • {new Date(order.order_date).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleOrderExpansion(order.id)}
                    >
                      {expandedOrders.has(order.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleOrderExpansion(order.id)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {profile?.role === 'admin' && (
                          <>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Order
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowAssignDialog(true);
                              }}
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Assign to Agent
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowInvoiceDialog(true);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Generate Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteOrder(order)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Order
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mt-3 flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User className={`w-4 h-4 ${order.status === 'cancelled' ? 'text-destructive/70' : 'text-muted-foreground'}`} />
                    <span className={`font-medium ${order.status === 'cancelled' ? 'text-destructive' : 'text-foreground'}`}>
                      {order.customer.shop_name}
                    </span>
                    <Badge variant="outline" className="text-xs">{order.customer.customer_id}</Badge>
                  </div>
                  <span className={order.status === 'cancelled' ? 'text-destructive/70' : 'text-muted-foreground'}>•</span>
                  <span className={order.status === 'cancelled' ? 'text-destructive/70' : 'text-muted-foreground'}>
                    {order.customer.phone}
                  </span>
                  {order.agent_id && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-primary">Assigned to Agent</span>
                    </>
                  )}
                </div>

                {/* Expanded Details */}
                {expandedOrders.has(order.id) && (
                  <div className="mt-4 pt-4 border-t border-border/30 space-y-4">
                    {/* Customer Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Customer Name</p>
                        <p className="font-medium">{order.customer.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Address</p>
                        <p className="font-medium">{order.customer.address}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pincode</p>
                        <p className="font-medium">{order.customer.pincode}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Balance</p>
                        <p className={`font-medium ${order.customer.balance >= 0 ? "text-success" : "text-warning"}`}>
                          {formatCurrency(order.customer.balance)}
                        </p>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div>
                      <h5 className="font-medium text-foreground mb-2">Order Items</h5>
                      <div className="space-y-2">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-background/30 rounded">
                              <div className="flex items-center gap-3">
                                <Package className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-foreground">{item.product_name}</p>
                                  <p className="text-xs text-muted-foreground">{item.product_code}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-foreground">Qty: {item.quantity}</p>
                                <p className="text-sm text-muted-foreground">{formatCurrency(item.total_price)}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <p>No items available for this order</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div>
                      <h5 className="font-medium text-foreground mb-2">Order Summary</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span>{formatCurrency(order.subtotal || order.total_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax:</span>
                          <span>{formatCurrency(order.tax_amount || 0)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-foreground border-t pt-1">
                          <span>Total:</span>
                          <span>{formatCurrency(order.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Assign to Agent Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Order to Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Select Agent</label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.agent_id} value={agent.agent_id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{agent.full_name}</span>
                        <span className="text-xs text-muted-foreground">{agent.agent_id}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignToAgent} className="bg-gradient-primary text-primary-foreground">
                Assign Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You will be redirected to the invoice review page where you can review order details, mark items as delivered, and create the invoice with payment details.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateInvoice} className="bg-gradient-primary text-primary-foreground">
                Continue to Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}