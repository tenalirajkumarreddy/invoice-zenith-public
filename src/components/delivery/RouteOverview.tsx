import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Phone, Store, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RouteOverviewProps {
  agentInfo: {
    name: string;
    id: string;
    route: string;
    phone: string;
  };
}

export default function RouteOverview({ agentInfo }: RouteOverviewProps) {
  const [routeCustomers, setRouteCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRouteCustomers = async () => {
      if (!agentInfo?.route) return;

      try {
        // Get customers for this route
        const { data, error } = await supabase
          .from('customers')
          .select(`
            *,
            routes (route_name, route_code)
          `)
          .eq('routes.route_code', agentInfo.route)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        // Transform data to match component expectations
        const transformedCustomers = (data || []).map(customer => ({
          id: customer.id,
          name: customer.name,
          shopName: customer.shop_name,
          address: `${customer.address}, Pincode: ${customer.pincode}`,
          phone: customer.phone,
          hasOrder: false, // TODO: Check if customer has orders for today
          orderValue: 0, // TODO: Get actual order value
          status: customer.outstanding > 0 ? "pending" : "visit",
          priority: customer.outstanding > 5000 ? "high" : customer.outstanding > 1000 ? "medium" : "low"
        }));

        setRouteCustomers(transformedCustomers);
      } catch (error) {
        console.error('Error fetching route customers:', error);
        toast({
          title: "Error",
          description: "Failed to fetch route customers",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRouteCustomers();
  }, [agentInfo?.route, toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
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

  const getStatusBadge = (status: string, hasOrder: boolean) => {
    if (hasOrder) {
      return <Badge className="bg-primary text-primary-foreground">Has Order</Badge>;
    }
    return <Badge variant="outline">Visit Only</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading route data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Route Header */}
      <Card className="p-4 sm:p-6 bg-gradient-card shadow-card border-border/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground">{agentInfo.route} Overview</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Today's delivery route with {routeCustomers.length} stops</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Button variant="outline" className="gap-2 text-xs sm:text-sm">
              <Navigation className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Get Route Directions</span>
              <span className="sm:hidden">Directions</span>
            </Button>
            <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2 text-xs sm:text-sm">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Start Navigation</span>
              <span className="sm:hidden">Navigate</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Route Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{routeCustomers.length}</p>
            <p className="text-sm text-muted-foreground">Total Stops</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{routeCustomers.filter(c => c.hasOrder).length}</p>
            <p className="text-sm text-muted-foreground">With Orders</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">{routeCustomers.filter(c => !c.hasOrder).length}</p>
            <p className="text-sm text-muted-foreground">Visit Only</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-lg font-bold text-success">
              {formatCurrency(routeCustomers.reduce((sum, c) => sum + c.orderValue, 0))}
            </p>
            <p className="text-sm text-muted-foreground">Total Value</p>
          </div>
        </Card>
      </div>

      {/* Route Customers List */}
      <Card className="bg-gradient-card shadow-card border-border/50">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">Route Stops</h3>
          <div className="space-y-4">
            {routeCustomers.map((customer, index) => (
              <div key={customer.id} className="p-3 sm:p-4 rounded-lg bg-background/50 border border-border/30 hover:bg-background/70 transition-colors">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-sm sm:text-base">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h4 className="font-semibold text-foreground text-base sm:text-lg truncate">{customer.shopName}</h4>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {getStatusBadge(customer.status, customer.hasOrder)}
                          {getPriorityBadge(customer.priority)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Owner</p>
                          <p className="text-foreground font-medium truncate">{customer.name}</p>
                          <p className="text-foreground flex items-center gap-1 text-xs">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{customer.phone}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Address</p>
                          <p className="text-foreground text-xs line-clamp-2">{customer.address}</p>
                          {customer.hasOrder && (
                            <p className="text-success font-medium mt-1 text-xs">
                              Order Value: {formatCurrency(customer.orderValue)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto sm:ml-4">
                    <Button size="sm" className="text-xs bg-primary text-primary-foreground flex-1 sm:flex-none">
                      <span className="hidden sm:inline">Open Customer</span>
                      <span className="sm:hidden">Customer</span>
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs gap-1 flex-1 sm:flex-none">
                      <Navigation className="w-3 h-3" />
                      <span className="hidden sm:inline">Directions</span>
                      <span className="sm:hidden">Map</span>
                    </Button>
                    {customer.hasOrder && (
                      <Button size="sm" className="text-xs bg-success text-success-foreground flex-1 sm:flex-none">
                        <span className="hidden sm:inline">View Order</span>
                        <span className="sm:hidden">Order</span>
                      </Button>
                    )}
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