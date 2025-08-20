import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, User, Store, Phone, MapPin, CreditCard, Receipt, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CustomerProfile from "./CustomerProfile";

interface CustomersListProps {
  route: string;
}

export default function CustomersList({ route }: CustomersListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        // Get customers for this route
        const { data, error } = await supabase
          .from('customers')
          .select(`
            *,
            routes (route_name, route_code)
          `)
          .eq('routes.route_code', route)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        // Transform data to match component expectations
        const transformedCustomers = (data || []).map(customer => ({
          id: customer.id,
          customerId: customer.customer_id,
          name: customer.name,
          shopName: customer.shop_name,
          phone: customer.phone,
          address: customer.address,
          pincode: customer.pincode,
          outstanding: customer.outstanding || 0,
          credit: customer.balance || 0,
          totalOrders: customer.total_orders || 0,
          profilePic: "/api/placeholder/50/50",
          shopPic: "/api/placeholder/300/200",
          status: customer.outstanding > 0 ? "warning" : "active",
          hasToday: false // TODO: Check if customer has orders for today
        }));

        setCustomers(transformedCustomers);
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast({
          title: "Error",
          description: "Failed to fetch customers",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (route) {
      fetchCustomers();
    }
  }, [route, toast]);

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.shopName.toLowerCase().includes(searchLower) ||
      customer.phone.includes(searchTerm) ||
      customer.customerId.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string, outstanding: number) => {
    if (outstanding > 0) {
      return <Badge className="bg-warning text-warning-foreground">Outstanding</Badge>;
    }
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground">Active</Badge>;
      case 'warning':
        return <Badge className="bg-warning text-warning-foreground">Warning</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (selectedCustomer) {
    return (
      <CustomerProfile 
        customer={selectedCustomer} 
        onBack={() => setSelectedCustomer(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground">{route} Customers</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">All customers in your assigned route</p>
        </div>
        <Badge className="bg-primary text-primary-foreground px-3 py-1">
          {filteredCustomers.length} Customers
        </Badge>
      </div>

      {/* Search */}
      <Card className="p-4 bg-gradient-card shadow-card border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name, shop, phone, or customer ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{filteredCustomers.filter(c => c.hasToday).length}</p>
            <p className="text-xs text-muted-foreground">With Today's Orders</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-warning">{filteredCustomers.filter(c => c.outstanding > 0).length}</p>
            <p className="text-xs text-muted-foreground">With Outstanding</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-success">{filteredCustomers.filter(c => c.credit > 0).length}</p>
            <p className="text-xs text-muted-foreground">With Credits</p>
          </div>
        </Card>
      </div>

      {/* Customers List */}
      <Card className="bg-gradient-card shadow-card border-border/50">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">Customer Directory</h3>
          <div className="space-y-4">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="p-3 sm:p-4 rounded-lg bg-background/50 border border-border/30 hover:bg-background/70 transition-colors cursor-pointer">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                      <AvatarImage src={customer.profilePic} alt={customer.name} />
                      <AvatarFallback>
                        <User className="w-5 h-5 sm:w-6 sm:h-6" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h4 className="font-semibold text-foreground text-base sm:text-lg truncate">{customer.name}</h4>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          <Badge variant="outline" className="text-xs">{customer.customerId}</Badge>
                          {getStatusBadge(customer.status, customer.outstanding)}
                          {customer.hasToday && (
                            <Badge className="bg-primary text-primary-foreground text-xs">Today's Order</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground flex items-center gap-1 text-xs">
                            <Store className="w-3 h-3 flex-shrink-0" />
                            Shop Details
                          </p>
                          <p className="text-foreground font-medium truncate">{customer.shopName}</p>
                          <p className="text-foreground flex items-center gap-1 text-xs">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{customer.phone}</span>
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-muted-foreground flex items-center gap-1 text-xs">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            Address
                          </p>
                          <p className="text-foreground text-xs line-clamp-2">{customer.address}</p>
                        </div>
                        
                        <div className="sm:col-span-2 lg:col-span-1">
                          <p className="text-muted-foreground text-xs">Financial Summary</p>
                          <p className="text-foreground text-xs">{customer.totalOrders} total orders</p>
                          {customer.outstanding > 0 && (
                            <p className="text-warning font-medium text-xs">Outstanding: {formatCurrency(customer.outstanding)}</p>
                          )}
                          {customer.credit > 0 && (
                            <p className="text-success font-medium text-xs">Credit: {formatCurrency(customer.credit)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto sm:ml-4">
                    <Button 
                      size="sm" 
                      className="text-xs bg-primary text-primary-foreground flex-1 sm:flex-none"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <User className="w-3 h-3 mr-1" />
                      <span className="hidden sm:inline">Open Profile</span>
                      <span className="sm:hidden">Profile</span>
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs flex-1 sm:flex-none">
                      <Receipt className="w-3 h-3 mr-1" />
                      <span className="hidden sm:inline">Create Bill</span>
                      <span className="sm:hidden">Bill</span>
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs flex-1 sm:flex-none">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span className="hidden sm:inline">Directions</span>
                      <span className="sm:hidden">Map</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}