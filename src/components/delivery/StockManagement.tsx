import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface StockManagementProps {
  agentId: string;
  routeAssignment?: any;
}

export default function StockManagement({ agentId, routeAssignment }: StockManagementProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchStockData();
  }, [routeAssignment]);

  const fetchStockData = async () => {
    if (!routeAssignment?.opening_stock) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get product codes from opening stock
      const productCodes = Object.keys(routeAssignment.opening_stock);
      
      if (productCodes.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Fetch product details
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('product_code', productCodes)
        .eq('is_active', true);

      if (productsError) throw productsError;

      // Calculate delivered quantities from route orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('route_orders')
        .select('items')
        .eq('route_assignment_id', routeAssignment.id)
        .eq('status', 'delivered');

      if (ordersError) throw ordersError;

      // Calculate delivered quantities
      const deliveredQuantities: { [key: string]: number } = {};
      ordersData?.forEach(order => {
        const orderItems = Array.isArray(order.items) ? order.items : (typeof order.items === 'string' ? JSON.parse(order.items) : []);
        orderItems.forEach((item: any) => {
          const productCode = item.product_code || item.product_id;
          if (productCode) {
            deliveredQuantities[productCode] = (deliveredQuantities[productCode] || 0) + item.quantity;
          }
        });
      });

      // Combine product data with stock information
      const productsWithStock = (productsData || []).map(product => {
        const loaded = routeAssignment.opening_stock[product.product_code] || 0;
        const delivered = deliveredQuantities[product.product_code] || 0;
        const remaining = Math.max(0, loaded - delivered);

        return {
          ...product,
          loaded,
          delivered,
          remaining
        };
      });

      setProducts(productsWithStock);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch stock data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (remaining: number, loaded: number) => {
    const percentage = loaded > 0 ? (remaining / loaded) * 100 : 0;
    
    if (percentage >= 50) {
      return { label: "Good", color: "text-success", bg: "bg-success/10" };
    } else if (percentage >= 25) {
      return { label: "Low", color: "text-warning", bg: "bg-warning/10" };
    } else {
      return { label: "Critical", color: "text-destructive", bg: "bg-destructive/10" };
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

  const totalValue = products.reduce((sum, product) => sum + (product.remaining * product.unit_price), 0);
  const deliveredValue = products.reduce((sum, product) => sum + (product.delivered * product.unit_price), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading stock data...</p>
        </div>
      </div>
    );
  }

  if (!routeAssignment || !routeAssignment.opening_stock) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Stock Data</h3>
          <p className="text-muted-foreground">
            No opening stock has been entered for this route yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{products.length}</p>
            <p className="text-sm text-muted-foreground">Products</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{formatCurrency(totalValue)}</p>
            <p className="text-sm text-muted-foreground">Remaining Value</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-lg font-bold text-success">{formatCurrency(deliveredValue)}</p>
            <p className="text-sm text-muted-foreground">Delivered Value</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-warning">
              {products.filter(p => getStockStatus(p.remaining, p.loaded).label !== "Good").length}
            </p>
            <p className="text-sm text-muted-foreground">Low Stock Items</p>
          </div>
        </Card>
      </div>

      {/* Stock Table */}
      <Card className="bg-gradient-card shadow-card border-border/50">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Stock Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 font-semibold text-foreground">Product</th>
                  <th className="text-center py-3 font-semibold text-foreground">Unit Price</th>
                  <th className="text-center py-3 font-semibold text-foreground">Loaded</th>
                  <th className="text-center py-3 font-semibold text-foreground">Delivered</th>
                  <th className="text-center py-3 font-semibold text-foreground">Remaining</th>
                  <th className="text-center py-3 font-semibold text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const status = getStockStatus(product.remaining, product.loaded);
                  return (
                    <tr key={product.id} className="border-b border-border/30">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Package className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{product.product_name}</p>
                            <p className="text-xs text-muted-foreground">{product.product_code}</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-4 text-center text-foreground">
                        {formatCurrency(product.unit_price)}
                      </td>
                      
                      <td className="py-4 text-center">
                        <span className="text-foreground font-semibold">{product.loaded}</span>
                      </td>
                      
                      <td className="py-4 text-center">
                        <span className="text-success font-semibold">{product.delivered}</span>
                      </td>
                      
                      <td className="py-4 text-center">
                        <span className="text-foreground font-bold text-lg">{product.remaining}</span>
                      </td>
                      
                      <td className="py-4 text-center">
                        <Badge className={`${status.bg} ${status.color} border-0`}>
                          {status.label === "Critical" && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {status.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Stock Alerts */}
      {products.filter(p => getStockStatus(p.remaining, p.loaded).label === "Critical").length > 0 && (
        <Card className="p-6 bg-destructive/10 border-destructive/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <h4 className="font-semibold text-destructive">Low Stock Alert</h4>
              <p className="text-sm text-destructive/80">
                Some products are running critically low on stock. Consider restocking soon.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}