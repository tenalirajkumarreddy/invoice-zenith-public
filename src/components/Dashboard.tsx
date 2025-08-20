import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Users, BarChart3, Settings, Loader2 } from "lucide-react";

interface DashboardStats {
  totalSales: number;
  pendingPayments: number;
  thisMonthSales: number;
  netProfit: number;
  totalInvoices: number;
  totalCustomers: number;
  totalProducts: number;
  activeRoutes: number;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
  payment_status: string;
  invoice_date: string;
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  created_at: string;
  user_name?: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    pendingPayments: 0,
    thisMonthSales: 0,
    netProfit: 0,
    totalInvoices: 0,
    totalCustomers: 0,
    totalProducts: 0,
    activeRoutes: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch invoices data
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          payment_status,
          invoice_date,
          customers (name, shop_name)
        `)
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Fetch customers count
      const { count: customersCount, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (customersError) throw customersError;

      // Fetch products count
      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (productsError) throw productsError;

      // Fetch routes count
      const { count: routesCount, error: routesError } = await supabase
        .from('routes')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (routesError) throw routesError;

      // Calculate stats from invoices
      const totalSales = invoicesData?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const pendingPayments = invoicesData?.filter(inv => inv.payment_status === 'pending')
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      
      // This month sales (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthSales = invoicesData?.filter(inv => {
        const invDate = new Date(inv.invoice_date);
        return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
      }).reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

      // Net profit (assuming 20% margin)
      const netProfit = totalSales * 0.2;

      setStats({
        totalSales,
        pendingPayments,
        thisMonthSales,
        netProfit,
        totalInvoices: invoicesData?.length || 0,
        totalCustomers: customersCount || 0,
        totalProducts: productsCount || 0,
        activeRoutes: routesCount || 0,
      });

      // Set recent invoices
      const recentInvoicesFormatted = invoicesData?.slice(0, 5).map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        customer_name: inv.customers?.shop_name || inv.customers?.name || 'Unknown Customer',
        total_amount: inv.total_amount,
        payment_status: inv.payment_status,
        invoice_date: inv.invoice_date,
      })) || [];

      setRecentInvoices(recentInvoicesFormatted);

      // Fetch recent activity (we'll create this from recent database changes)
      await fetchRecentActivity();

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

  const fetchRecentActivity = async () => {
    try {
      // Get recent invoices for activity
      const { data: recentInvoicesActivity } = await supabase
        .from('invoices')
        .select('invoice_number, created_at, customers(shop_name)')
        .order('created_at', { ascending: false })
        .limit(3);

      // Get recent customers for activity
      const { data: recentCustomersActivity } = await supabase
        .from('customers')
        .select('shop_name, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      // Get recent orders for activity
      const { data: recentOrdersActivity } = await supabase
        .from('orders')
        .select('order_number, created_at, customers(shop_name)')
        .order('created_at', { ascending: false })
        .limit(2);

      const activities: ActivityLog[] = [];

      // Add invoice activities
      recentInvoicesActivity?.forEach(invoice => {
        activities.push({
          id: `invoice-${invoice.invoice_number}`,
          action: "Invoice created",
          description: `${invoice.invoice_number} for ${invoice.customers?.shop_name || 'Unknown Customer'}`,
          created_at: invoice.created_at,
        });
      });

      // Add customer activities
      recentCustomersActivity?.forEach(customer => {
        activities.push({
          id: `customer-${customer.shop_name}`,
          action: "New customer",
          description: `${customer.shop_name} added`,
          created_at: customer.created_at,
        });
      });

      // Add order activities
      recentOrdersActivity?.forEach(order => {
        activities.push({
          id: `order-${order.order_number}`,
          action: "Order created",
          description: `${order.order_number} for ${order.customers?.shop_name || 'Unknown Customer'}`,
          created_at: order.created_at,
        });
      });

      // Sort by date and take the most recent 4
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentActivity(activities.slice(0, 4));

    } catch (error) {
      console.error('Error fetching recent activity:', error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'create-invoice':
        navigate('/invoices');
        break;
      case 'add-customer':
        navigate('/customers');
        break;
      case 'view-reports':
        navigate('/reports');
        break;
      case 'settings':
        navigate('/settings');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back! Here's your business overview.</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-gradient-success rounded-lg text-success-foreground font-medium">
            ● Business Active
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 lg:p-6 bg-gradient-card shadow-card border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground mb-1">Total Sales</p>
              <p className="text-xl font-bold text-foreground truncate">{formatCurrency(stats.totalSales)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-medium text-success">
                  {stats.totalInvoices} invoices
                </span>
              </div>
            </div>
            <div className="text-xl opacity-80 self-end sm:self-auto">💰</div>
          </div>
        </Card>

        <Card className="p-4 lg:p-6 bg-gradient-card shadow-card border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground mb-1">Pending Payments</p>
              <p className="text-xl font-bold text-foreground truncate">{formatCurrency(stats.pendingPayments)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-medium text-warning">
                  Needs attention
                </span>
              </div>
            </div>
            <div className="text-xl opacity-80 self-end sm:self-auto">⏳</div>
          </div>
        </Card>

        <Card className="p-3 sm:p-6 bg-gradient-card shadow-card border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">This Month</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground truncate">{formatCurrency(stats.thisMonthSales)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs sm:text-sm font-medium text-success">
                  Current month
                </span>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl opacity-80 self-end sm:self-auto">📊</div>
          </div>
        </Card>

        <Card className="p-3 sm:p-6 bg-gradient-card shadow-card border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Net Profit</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground truncate">{formatCurrency(stats.netProfit)}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs sm:text-sm font-medium text-success">
                  ~20% margin
                </span>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl opacity-80 self-end sm:self-auto">📈</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Invoices */}
        <Card className="lg:col-span-2 p-4 lg:p-6 bg-gradient-card shadow-card border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Invoices</h3>
            <Button 
              variant="ghost"
              onClick={() => navigate('/invoices')}
              className="text-primary hover:text-primary/80 text-sm font-medium"
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {recentInvoices.length > 0 ? (
              recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="font-medium text-foreground">{invoice.invoice_number}</span>
                      <Badge 
                        variant={
                          invoice.payment_status === 'paid' ? 'default' : 
                          invoice.payment_status === 'pending' ? 'secondary' : 
                          'destructive'
                        }
                        className={
                          invoice.payment_status === 'paid' ? 'bg-success text-success-foreground' :
                          invoice.payment_status === 'pending' ? 'bg-warning text-warning-foreground' :
                          'bg-destructive text-destructive-foreground'
                        }
                      >
                        {invoice.payment_status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{invoice.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatCurrency(invoice.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(invoice.invoice_date)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No invoices yet</p>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6 bg-gradient-card shadow-card border-border/50">
          <h3 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{getTimeAgo(activity.created_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Business Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{stats.totalCustomers}</p>
            <p className="text-xs text-muted-foreground">Total Customers</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{stats.totalProducts}</p>
            <p className="text-xs text-muted-foreground">Active Products</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{stats.activeRoutes}</p>
            <p className="text-xs text-muted-foreground">Active Routes</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{stats.totalInvoices}</p>
            <p className="text-xs text-muted-foreground">Total Invoices</p>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6 bg-gradient-card shadow-card border-border/50">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Button 
            onClick={() => handleQuickAction('create-invoice')}
            className="p-4 bg-gradient-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-all duration-300 h-auto flex flex-col gap-2"
          >
            <FileText className="w-6 h-6" />
            Create Invoice
          </Button>
          <Button 
            onClick={() => handleQuickAction('add-customer')}
            className="p-4 bg-gradient-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-all duration-300 h-auto flex flex-col gap-2"
          >
            <Users className="w-6 h-6" />
            Add Customer
          </Button>
          <Button 
            onClick={() => handleQuickAction('view-reports')}
            variant="secondary"
            className="p-4 text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-all duration-300 h-auto flex flex-col gap-2"
          >
            <BarChart3 className="w-6 h-6" />
            View Reports
          </Button>
          <Button 
            onClick={() => handleQuickAction('settings')}
            variant="secondary"
            className="p-4 text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-all duration-300 h-auto flex flex-col gap-2"
          >
            <Settings className="w-6 h-6" />
            Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}