import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Truck, 
  Package, 
  CreditCard, 
  IndianRupee,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AgentDashboardProps {
  agentInfo: {
    name: string;
    id: string;
    uuid?: string; // Add UUID for database queries
    route: string;
    phone: string;
  };
}

export default function AgentDashboard({ agentInfo }: AgentDashboardProps) {
  const [todayStats, setTodayStats] = useState({
    totalCustomers: 0,
    deliveredOrders: 0,
    pendingOrders: 0,
    cashCollected: 0,
    upiCollected: 0,
    pendingAmount: 0,
    creditsIssued: 0
  });

  const [stockSummary, setStockSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!agentInfo?.uuid && !agentInfo?.id) return;

      try {
        const today = new Date().toISOString().split('T')[0];

        // Use UUID if available, otherwise fall back to agent_id string
        const agentIdentifier = agentInfo.uuid || agentInfo.id;

        // Get invoices created by this agent today (delivered orders)
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select(`
            *,
            customers (
              id,
              shop_name,
              balance,
              outstanding
            )
          `)
          .eq('agent_id', agentIdentifier)
          .gte('created_at', today + 'T00:00:00');

        if (invoicesError) throw invoicesError;

        // Calculate statistics based on today's invoices
        const deliveredOrders = invoices?.length || 0;
        
        // Calculate total amounts from invoices
        const totalInvoiceAmount = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
        const totalPaidAmount = invoices?.reduce((sum, inv) => sum + (inv.payment_amount || 0), 0) || 0;
        const pendingAmount = totalInvoiceAmount - totalPaidAmount;

        // Calculate cash and UPI collected from today's deliveries
        const cashCollected = invoices?.reduce((sum, inv) => sum + (inv.cash_amount || 0), 0) || 0;
        const upiCollected = invoices?.reduce((sum, inv) => sum + (inv.upi_amount || 0), 0) || 0;

        // Calculate credits used (amount paid using customer balance)
        const creditsUsed = invoices?.reduce((sum, inv) => sum + (inv.balance_amount || 0), 0) || 0;

        // Get unique customers served today
        const customersServed = new Set(invoices?.map(inv => inv.customer_id)).size;

        // Count pending orders (invoices with outstanding amounts)
        const pendingOrders = invoices?.filter(inv => (inv.total_amount - inv.payment_amount) > 0).length || 0;

        setTodayStats({
          totalCustomers: customersServed,
          deliveredOrders,
          pendingOrders,
          cashCollected,
          upiCollected,
          pendingAmount,
          creditsIssued: creditsUsed
        });

        // TODO: Implement stock management when products table is ready
        setStockSummary([
          { product: "Sample Product", loaded: 0, delivered: 0, remaining: 0 }
        ]);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [agentInfo?.uuid, agentInfo?.id, toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{todayStats.totalCustomers}</p>
              <p className="text-xs text-muted-foreground">Total Customers</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xl font-bold text-success">{todayStats.deliveredOrders}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xl font-bold text-warning">{todayStats.pendingOrders}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{agentInfo.route}</p>
              <p className="text-xs text-muted-foreground">Current Route</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card className="bg-gradient-card shadow-card border-border/50">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">Today's Collections</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-background/50 border border-border/30">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <IndianRupee className="w-6 h-6 text-success" />
              </div>
              <p className="text-xl font-bold text-success">{formatCurrency(todayStats.cashCollected)}</p>
              <p className="text-xs text-muted-foreground">Cash Collected</p>
            </div>

            <div className="text-center p-4 rounded-lg bg-background/50 border border-border/30">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <p className="text-xl font-bold text-primary">{formatCurrency(todayStats.upiCollected)}</p>
              <p className="text-xs text-muted-foreground">UPI Collected</p>
            </div>

            <div className="text-center p-4 rounded-lg bg-background/50 border border-border/30">
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <p className="text-xl font-bold text-warning">{formatCurrency(todayStats.pendingAmount)}</p>
              <p className="text-xs text-muted-foreground">Pending Amount</p>
            </div>

            <div className="text-center p-4 rounded-lg bg-background/50 border border-border/30">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Package className="w-6 h-6 text-accent" />
              </div>
              <p className="text-xl font-bold text-accent">{formatCurrency(todayStats.creditsIssued)}</p>
              <p className="text-xs text-muted-foreground">Credits Used</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Stock Overview */}
      <Card className="bg-gradient-card shadow-card border-border/50">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Vehicle Stock Status</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground">Product</th>
                  <th className="text-center py-2 text-muted-foreground">Loaded</th>
                  <th className="text-center py-2 text-muted-foreground">Delivered</th>
                  <th className="text-center py-2 text-muted-foreground">Remaining</th>
                  <th className="text-center py-2 text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {stockSummary.map((item, index) => (
                  <tr key={index} className="border-b border-border/30">
                    <td className="py-3 text-foreground font-medium">{item.product}</td>
                    <td className="py-3 text-center text-foreground">{item.loaded}</td>
                    <td className="py-3 text-center text-foreground">{item.delivered}</td>
                    <td className="py-3 text-center text-foreground font-semibold">{item.remaining}</td>
                    <td className="py-3 text-center">
                      <Badge 
                        className={
                          item.remaining > 10 
                            ? "bg-success text-success-foreground" 
                            : item.remaining > 5 
                            ? "bg-warning text-warning-foreground"
                            : "bg-destructive text-destructive-foreground"
                        }
                      >
                        {item.remaining > 10 ? "Good" : item.remaining > 5 ? "Low" : "Critical"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}