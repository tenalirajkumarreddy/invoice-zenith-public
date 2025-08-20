import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Package, 
  Navigation, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Phone,
  User,
  MapPin,
  Loader2,
  Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import CustomerProfile from "./CustomerProfile";

interface OrdersToDeliverProps {
  route: string;
  routeAssignment?: any;
  agentInfo: any;
}

export default function OrdersToDeliver({ route, routeAssignment, agentInfo }: OrdersToDeliverProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchOrders = async () => {
      if (!route || !agentInfo) return;

      try {
        setLoading(true);
        
        // Use agentInfo.uuid if available, otherwise fall back to user.id
        const agentIdentifier = agentInfo.uuid || user?.id;
        
        // Fetch admin-assigned orders (orders directly assigned to this agent)
        const { data: adminAssignedOrders, error: adminOrdersError } = await supabase
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
              outstanding,
              total_orders,
              routes (route_name, route_code)
            )
          `)
          .eq('agent_id', agentIdentifier)
          .in('status', ['pending', 'processing'])
          .order('order_date', { ascending: true })
          .order('created_at', { ascending: true });

        if (adminOrdersError) throw adminOrdersError;

        // Fetch route-based orders (orders for customers in this route, not directly assigned)
        const { data: routeOrders, error: routeOrdersError } = await supabase
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
              outstanding,
              total_orders,
              routes (route_name, route_code)
            )
          `)
          .eq('customer.routes.route_code', route)
          .is('agent_id', null) // Only orders NOT directly assigned to any agent
          .in('status', ['pending', 'processing'])
          .order('order_date', { ascending: true })
          .order('created_at', { ascending: true });

        if (routeOrdersError) throw routeOrdersError;

        // Transform and combine orders
        const transformOrder = (order: any, isAdminAssigned: boolean = false) => ({
          id: order.order_number,
          customerId: order.customer.id,
          customerName: order.customer.name,
          shopName: order.customer.shop_name,
          phone: order.customer.phone,
          address: order.customer.address,
          amount: order.total_amount,
          items: Array.isArray(order.items) ? order.items.length : (typeof order.items === 'string' ? JSON.parse(order.items).length : 0),
          status: order.status,
          priority: isAdminAssigned ? "admin-assigned" : (order.total_amount > 5000 ? "high" : order.total_amount > 1000 ? "medium" : "low"),
          orderDate: order.order_date,
          deliverySlot: "Morning", // Default slot
          orderItems: Array.isArray(order.items) ? order.items : (typeof order.items === 'string' ? JSON.parse(order.items) : []),
          subtotal: order.subtotal,
          taxAmount: order.tax_amount,
          totalAmount: order.total_amount,
          isAdminAssigned,
          customer: {
            id: order.customer.id,
            customer_id: order.customer.customer_id,
            name: order.customer.name,
            shop_name: order.customer.shop_name,
            phone: order.customer.phone,
            address: order.customer.address,
            pincode: order.customer.pincode,
            outstanding: order.customer.outstanding,
            credit: order.customer.balance,
            total_orders: order.customer.total_orders,
            routes: order.customer.routes
          }
        });

        // Transform admin assigned orders (higher priority)
        const transformedAdminOrders = (adminAssignedOrders || []).map(order => transformOrder(order, true));
        
        // Transform route orders (lower priority)
        const transformedRouteOrders = (routeOrders || []).map(order => transformOrder(order, false));

        // Combine with admin orders first (higher priority)
        const allOrders = [...transformedAdminOrders, ...transformedRouteOrders];

        setOrders(allOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast({
          title: "Error",
          description: "Failed to fetch orders",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [route, agentInfo, user, toast]);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.phone.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      case 'delivered':
        return <Badge className="bg-success text-success-foreground">Delivered</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500 text-white">Processing</Badge>;
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "admin-assigned":
        return <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white animate-pulse"><Star className="w-3 h-3 mr-1" />Admin Assigned</Badge>;
      case 'high':
        return <Badge className="bg-destructive text-destructive-foreground">High Priority</Badge>;
      case 'medium':
        return <Badge className="bg-warning text-warning-foreground">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low Priority</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'admin-assigned':
        return <Star className="w-4 h-4 text-purple-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'medium':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-success" />;
      default:
        return <Package className="w-4 h-4 text-primary" />;
    }
  };

  const markAsDelivered = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('order_number', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Order ${orderId} marked as delivered!`,
      });

      // Refresh orders
      window.location.reload();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (selectedCustomer) {
    return (
      <CustomerProfile 
        customer={selectedCustomer} 
        onBack={() => setSelectedCustomer(null)}
        routeAssignment={routeAssignment}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground">Orders to Deliver</h3>
          <p className="text-muted-foreground text-sm sm:text-base">Today's delivery schedule for {route}</p>
        </div>
        <Badge className="bg-primary text-primary-foreground px-3 py-1 w-fit">
          {filteredOrders.length} Orders
        </Badge>
      </div>

      {/* Order Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{filteredOrders.length}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-warning">
              {filteredOrders.filter(o => o.status === 'pending').length}
            </p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-blue-500">
              {filteredOrders.filter(o => o.status === 'processing').length}
            </p>
            <p className="text-xs text-muted-foreground">Processing</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-success">
              {formatCurrency(filteredOrders.reduce((sum, o) => sum + o.amount, 0))}
            </p>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 sm:p-6 bg-gradient-card shadow-card border-border/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search orders by customer name, shop, or order number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
          </select>
        </div>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <Card className="p-12 bg-gradient-card shadow-card border-border/50">
            <div className="text-center">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Orders to Deliver</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "No orders match your search criteria." 
                  : "All orders have been delivered or there are no pending orders for this route."
                }
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Admin Assigned Orders Section */}
            {filteredOrders.filter(order => order.isAdminAssigned).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
                  <Star className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                    Admin Assigned Orders ({filteredOrders.filter(order => order.isAdminAssigned).length})
                  </h3>
                </div>
                {filteredOrders.filter(order => order.isAdminAssigned).map((order) => (
                  <Card key={order.id} className={`shadow-card border-border/50 ${
                    order.isAdminAssigned 
                      ? "bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-l-purple-500 dark:from-purple-900/20 dark:to-blue-900/20" 
                      : "bg-gradient-card"
                  }`}>
                    <div className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            {getPriorityIcon(order.priority)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <h4 className="text-lg font-semibold text-foreground truncate">{order.id}</h4>
                              <div className="flex flex-wrap gap-2">
                                {getStatusBadge(order.status)}
                                {getPriorityBadge(order.priority)}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Order Date: {new Date(order.orderDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right sm:text-right flex-shrink-0">
                          <p className="text-lg font-bold text-foreground">₹{order.amount.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">{order.items} items</p>
                        </div>
                      </div>

                      {/* Customer Information */}
                      <div className="bg-card/50 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <h5 className="font-medium text-foreground">{order.customerName}</h5>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground truncate">{order.phone}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground break-words text-sm">{order.address}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button 
                          onClick={() => setSelectedCustomer(order.customer)}
                          variant="outline" 
                          size="sm" 
                          className="flex-1 justify-center"
                        >
                          <User className="w-4 h-4 mr-2" />
                          View Profile
                        </Button>
                        <Button 
                          onClick={() => markAsDelivered(order.id)}
                          className="flex-1 bg-success hover:bg-success/80 text-success-foreground justify-center"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Delivered
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="sm:px-3 justify-center"
                        >
                          <Navigation className="w-4 h-4 sm:mr-0" />
                          <span className="sm:hidden ml-2">Navigate</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Route Orders Section */}
            {filteredOrders.filter(order => !order.isAdminAssigned).length > 0 && (
              <div className="space-y-4">
                {filteredOrders.filter(order => order.isAdminAssigned).length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                      Route Orders ({filteredOrders.filter(order => !order.isAdminAssigned).length})
                    </h3>
                  </div>
                )}
                {filteredOrders.filter(order => !order.isAdminAssigned).map((order) => (
                  <Card key={order.id} className="shadow-card border-border/50 bg-gradient-card">
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            {getPriorityIcon(order.priority)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <h4 className="text-lg font-semibold text-foreground truncate">{order.id}</h4>
                              <div className="flex flex-wrap gap-2">
                                {getStatusBadge(order.status)}
                                {getPriorityBadge(order.priority)}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Order Date: {new Date(order.orderDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right sm:text-right flex-shrink-0">
                          <p className="text-xl sm:text-2xl font-bold text-foreground">{formatCurrency(order.amount)}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.items} item{order.items !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 p-3 bg-background/50 rounded-lg">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
                            <h5 className="font-semibold text-foreground truncate">{order.shopName}</h5>
                            <Badge variant="outline" className="text-xs w-fit">{order.customer.customer_id}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {order.customerName} • {order.phone}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.address} • {order.customer.pincode}
                          </p>
                        </div>
                        <div className="text-right text-sm flex-shrink-0">
                          <p className="text-success">Credit: {formatCurrency(order.customer.credit)}</p>
                          <p className="text-warning">Outstanding: {formatCurrency(order.customer.outstanding)}</p>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="space-y-2 mb-4">
                        <h6 className="font-semibold text-foreground">Order Items:</h6>
                        {order.orderItems.map((item: any, index: number) => (
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
                        ))}
                      </div>

                      {/* Order Summary */}
                      <div className="border-t border-border/30 pt-4 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span>{formatCurrency(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tax:</span>
                          <span>{formatCurrency(order.taxAmount)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-foreground">
                          <span>Total:</span>
                          <span>{formatCurrency(order.totalAmount)}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => setSelectedCustomer(order.customer)}
                          className="flex-1 justify-center"
                        >
                          <User className="w-4 h-4 mr-2" />
                          View Customer
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 sm:flex-none justify-center gap-2"
                        >
                          <Navigation className="w-4 h-4" />
                          <span className="sm:hidden">Directions</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 sm:flex-none justify-center gap-2"
                        >
                          <Phone className="w-4 h-4" />
                          <span className="sm:hidden">Call</span>
                        </Button>
                        {order.status === 'pending' && (
                          <Button 
                            size="sm"
                            onClick={() => markAsDelivered(order.id)}
                            className="bg-success text-success-foreground hover:bg-success/90 justify-center"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Delivered
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}