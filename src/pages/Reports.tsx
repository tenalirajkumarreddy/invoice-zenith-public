import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  Printer, 
  FileText, 
  BarChart3, 
  Users, 
  MapPin,
  Calendar,
  TrendingUp,
  DollarSign,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  generateReportHeader, 
  generateTableHTML, 
  generateSummaryCard,
  formatCurrency,
  formatDate,
  getStatusBadgeClass,
  downloadAsHTML,
  downloadAsCSV,
  printReport
} from "@/lib/report-generator";

interface RouteReport {
  id: string;
  route_id: string;
  route_code: string;
  route_name: string;
  agent_name: string;
  agent_id: string;
  assigned_date: string;
  status: string;
  opening_stock_value: number;
  return_stock_value: number;
  cash_collected: number;
  upi_collected: number;
  pending_amount: number;
  total_collected: number;
  customers_visited: number;
  total_orders: number;
  orders: any[];
}

interface CustomerReport {
  id: string;
  customer_name: string;
  customer_code: string;
  total_orders: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  last_order_date: string;
  payment_history: any[];
}

interface SalesReport {
  period: string;
  total_sales: number;
  total_orders: number;
  cash_sales: number;
  upi_sales: number;
  credit_sales: number;
  gst_collected: number;
  outstanding: number;
}

interface RouteDetailReport {
  route_id: string;
  route_code: string;
  route_name: string;
  agent_name: string;
  agent_id: string;
  assigned_date: string;
  assigned_time: string;
  accepted_time: string | null;
  started_time: string | null;
  finished_time: string | null;
  status: string;
  opening_stock: any[];
  return_stock: any[];
  invoices: RouteInvoice[];
}

interface RouteInvoice {
  id: string;
  customer_name: string;
  customer_code: string;
  created_at: string;
  total_amount: number;
  cash_amount: number;
  upi_amount: number;
  credit_amount: number;
  payment_amount: number;
  payment_status: 'paid' | 'pending' | 'partial';
  order_details: any[];
}

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState("overview");
  const [dateRange, setDateRange] = useState("current_month");
  const [routeReports, setRouteReports] = useState<RouteReport[]>([]);
  const [customerReports, setCustomerReports] = useState<CustomerReport[]>([]);
  const [salesReports, setSalesReports] = useState<SalesReport[]>([]);
  const [selectedRoute, setSelectedRoute] = useState("all");
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRouteDetail, setSelectedRouteDetail] = useState<string | null>(null);
  const [routeDetailData, setRouteDetailData] = useState<RouteDetailReport | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedReportType !== "overview") {
      fetchReportData();
    }
  }, [selectedReportType, dateRange, selectedRoute]);

  const fetchInitialData = async () => {
    try {
      const { data: routesData } = await supabase
        .from('routes')
        .select('*')
        .eq('is_active', true)
        .order('route_code');
      
      setRoutes(routesData || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      switch (selectedReportType) {
        case 'route':
          await fetchRouteReports();
          break;
        case 'customer':
          await fetchCustomerReports();
          break;
        case 'sales':
          await fetchSalesReports();
          break;
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch report data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRouteReports = async () => {
    let query = supabase
      .from('route_assignments')
      .select(`
        *,
        routes (route_name, route_code),
        agent:profiles!route_assignments_agent_id_fkey (full_name, agent_id)
      `);

    // Apply route filter if not "all"
    if (selectedRoute && selectedRoute !== "all") {
      query = query.eq('route_code', selectedRoute);
    }

    const { data, error } = await query
      .order('assigned_date', { ascending: false });

    if (error) throw error;

    // Transform data to match RouteReport interface
    const transformedData: RouteReport[] = (data || []).map(assignment => ({
      id: assignment.id,
      route_id: assignment.route_id,
      route_code: assignment.route_code,
      route_name: assignment.routes?.route_name || '',
      agent_name: assignment.agent?.full_name || '',
      agent_id: assignment.agent?.agent_id || '',
      assigned_date: assignment.assigned_date,
      status: assignment.status,
      opening_stock_value: 0,
      return_stock_value: 0,
      cash_collected: assignment.cash_collected || 0,
      upi_collected: assignment.upi_collected || 0,
      pending_amount: assignment.pending_amount || 0,
      total_collected: assignment.total_collected || 0,
      customers_visited: assignment.customers_visited || 0,
      total_orders: assignment.total_orders || 0,
      orders: [],
    }));

    setRouteReports(transformedData);
  };

  const fetchCustomerReports = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        orders(total_amount, created_at),
        invoices(total_amount, payment_amount)
      `)
      .order('name');

    if (error) throw error;

    const customerReports: CustomerReport[] = (data || []).map(customer => {
      const orders = customer.orders || [];
      const invoices = customer.invoices || [];
      
      return {
        id: customer.id,
        customer_name: customer.name,
        customer_code: customer.customer_id,
        total_orders: orders.length,
        total_amount: invoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0),
        paid_amount: invoices.reduce((sum: number, inv: any) => sum + (inv.payment_amount || 0), 0),
        outstanding_amount: customer.outstanding || 0, // Use the outstanding column from customers table
        last_order_date: orders.length > 0 ? orders[orders.length - 1].created_at : '',
        payment_history: invoices,
      };
    });

    setCustomerReports(customerReports);
  };

  const fetchSalesReports = async () => {
    // Get invoices data to calculate sales reports
    const { data, error } = await supabase
      .from('invoices')
      .select('total_amount, payment_amount, cash_amount, upi_amount, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group by month/period based on dateRange selection
    // For now, create a sample monthly report
    const totalSales = (data || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalCash = (data || []).reduce((sum, inv) => sum + (inv.cash_amount || 0), 0);
    const totalUPI = (data || []).reduce((sum, inv) => sum + (inv.upi_amount || 0), 0);
    const totalPaid = (data || []).reduce((sum, inv) => sum + (inv.payment_amount || 0), 0);

    const salesData: SalesReport[] = [
      {
        period: "January 2025",
        total_sales: totalSales,
        total_orders: (data || []).length,
        cash_sales: totalCash,
        upi_sales: totalUPI,
        credit_sales: totalSales - totalPaid, // Outstanding/credit amount
        gst_collected: totalSales * 0.15, // Assume 15% GST
        outstanding: totalSales - totalPaid,
      }
    ];

    setSalesReports(salesData);
  };

  const fetchRouteDetailData = async (routeId: string) => {
    setLoadingDetail(true);
    try {
      // Fetch route assignment details
      const { data: routeData, error: routeError } = await supabase
        .from('route_assignments')
        .select(`
          *,
          routes (route_name, route_code),
          agent:profiles!route_assignments_agent_id_fkey (full_name, agent_id)
        `)
        .eq('route_id', routeId)
        .single();

      if (routeError) throw routeError;

      // Get the agent UUID from the route assignment
      // The route_assignments.agent_id is a string (like "AGT-97555"), 
      // but invoices.agent_id is a UUID that references profiles.user_id
      const agentIdString = routeData.agent_id; // This is the string agent_id from route_assignments
      const assignedDate = routeData.assigned_date;
      const finishedTime = routeData.finished_time;

      // Convert the string agent_id to UUID by looking up the profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('agent_id', agentIdString)
        .single();
      
      if (profileError) {
        console.error('Error finding agent profile:', profileError);
        throw new Error(`Could not find agent profile for agent_id: ${agentIdString}`);
      }

      const agentUUID = profileData.user_id;
      console.log(`Converting agent_id "${agentIdString}" to UUID "${agentUUID}"`);

      // Build the query for invoices using the correct UUID
      let invoiceQuery = supabase
        .from('invoices')
        .select(`
          *,
          customers (name, customer_id),
          orders (
            id,
            order_items (
              quantity,
              unit_price,
              products (name, product_code)
            )
          )
        `)
        .eq('agent_id', agentUUID)
        .gte('created_at', assignedDate);

      // If the route is finished, filter invoices up to the finish time
      if (finishedTime) {
        invoiceQuery = invoiceQuery.lte('created_at', finishedTime);
      } else {
        // If not finished, get invoices from the assigned date to end of that day
        const endOfDay = new Date(assignedDate);
        endOfDay.setHours(23, 59, 59, 999);
        invoiceQuery = invoiceQuery.lte('created_at', endOfDay.toISOString());
      }

      const { data: invoicesData, error: invoicesError } = await invoiceQuery.order('created_at');

      if (invoicesError) throw invoicesError;

      // Transform invoices data
      const transformedInvoices: RouteInvoice[] = (invoicesData || []).map(invoice => {
        const totalAmount = invoice.total_amount || 0;
        const paymentAmount = invoice.payment_amount || 0;
        const cashAmount = invoice.cash_amount || 0;
        const upiAmount = invoice.upi_amount || 0;
        const creditAmount = totalAmount - paymentAmount;

        let paymentStatus: 'paid' | 'pending' | 'partial' = 'pending';
        if (paymentAmount >= totalAmount) {
          paymentStatus = 'paid';
        } else if (paymentAmount > 0) {
          paymentStatus = 'partial';
        }

        return {
          id: invoice.id,
          customer_name: invoice.customers?.name || 'Unknown',
          customer_code: invoice.customers?.customer_id || '',
          created_at: invoice.created_at,
          total_amount: totalAmount,
          cash_amount: cashAmount,
          upi_amount: upiAmount,
          credit_amount: creditAmount,
          payment_amount: paymentAmount,
          payment_status: paymentStatus,
          order_details: invoice.orders?.order_items || []
        };
      });

      // Mock stock data for now - you can implement actual stock fetching
      const mockOpeningStock = [
        { product_code: 'P001', product_name: 'Product A', quantity: 50 },
        { product_code: 'P002', product_name: 'Product B', quantity: 30 },
        { product_code: 'P003', product_name: 'Product C', quantity: 25 }
      ];

      const mockReturnStock = [
        { product_code: 'P001', product_name: 'Product A', quantity: 5 },
        { product_code: 'P002', product_name: 'Product B', quantity: 3 },
        { product_code: 'P003', product_name: 'Product C', quantity: 2 }
      ];

      const detailData: RouteDetailReport = {
        route_id: routeData.route_id,
        route_code: routeData.route_code,
        route_name: routeData.routes?.route_name || '',
        agent_name: routeData.agent?.full_name || '',
        agent_id: routeData.agent?.agent_id || '',
        assigned_date: routeData.assigned_date,
        assigned_time: routeData.assigned_time,
        accepted_time: routeData.accepted_time,
        started_time: routeData.started_time,
        finished_time: routeData.finished_time,
        status: routeData.status,
        opening_stock: mockOpeningStock,
        return_stock: mockReturnStock,
        invoices: transformedInvoices
      };

      setRouteDetailData(detailData);
    } catch (error) {
      console.error('Error fetching route detail data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch route details",
        variant: "destructive",
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRouteClick = (routeId: string) => {
    setSelectedRouteDetail(routeId);
    fetchRouteDetailData(routeId);
  };

  const handleBackToRoutes = () => {
    setSelectedRouteDetail(null);
    setRouteDetailData(null);
  };

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return 'N/A';
    return new Date(dateTime).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentStatusBadge = (status: 'paid' | 'pending' | 'partial') => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500 text-white">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-red-500 text-white">Pending</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500 text-white">Partial</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const generatePrintableReport = () => {
    const reportContent = generateReportHTML();
    printReport(reportContent);
  };

  const generateReportHTML = () => {
    const currentDate = formatDate(new Date());
    const header = generateReportHeader(
      "Invoice Zenith Billing Hub",
      `${selectedReportType.toUpperCase()} REPORT`,
      currentDate,
      `Period: ${dateRange.replace(/_/g, ' ').toUpperCase()}`
    );
    
    let content = header;

    switch (selectedReportType) {
      case 'route':
        content += generateRouteReportHTML();
        break;
      case 'customer':
        content += generateCustomerReportHTML();
        break;
      case 'sales':
        content += generateSalesReportHTML();
        break;
    }

    return content;
  };

  const generateRouteReportHTML = () => {
    if (routeReports.length === 0) return '<p>No route data available for the selected criteria</p>';

    const totalCollected = routeReports.reduce((sum, report) => sum + report.total_collected, 0);
    const totalCash = routeReports.reduce((sum, report) => sum + report.cash_collected, 0);
    const totalUPI = routeReports.reduce((sum, report) => sum + report.upi_collected, 0);
    const totalOrders = routeReports.reduce((sum, report) => sum + report.total_orders, 0);

    const summary = generateSummaryCard("Route Performance Summary", [
      { label: "Total Routes", value: routeReports.length },
      { label: "Total Orders", value: totalOrders },
      { label: "Cash Collection", value: formatCurrency(totalCash) },
      { label: "UPI Collection", value: formatCurrency(totalUPI) },
      { label: "Total Collection", value: formatCurrency(totalCollected) }
    ]);

    const headers = [
      'Route ID', 'Route Name', 'Agent', 'Date', 'Status', 
      'Orders', 'Cash', 'UPI', 'Total', 'Customers'
    ];

    const rows = routeReports.map(report => [
      report.route_id,
      report.route_name,
      report.agent_name,
      formatDate(report.assigned_date),
      `<span class="status-badge ${getStatusBadgeClass(report.status)}">${report.status}</span>`,
      report.total_orders,
      formatCurrency(report.cash_collected),
      formatCurrency(report.upi_collected),
      formatCurrency(report.total_collected),
      report.customers_visited
    ]);

    const table = generateTableHTML(headers, rows);
    
    return summary + table;
  };

  const generateCustomerReportHTML = () => {
    if (customerReports.length === 0) return '<p>No customer data available for the selected criteria</p>';

    const totalAmount = customerReports.reduce((sum, customer) => sum + customer.total_amount, 0);
    const totalPaid = customerReports.reduce((sum, customer) => sum + customer.paid_amount, 0);
    const totalOutstanding = customerReports.reduce((sum, customer) => sum + customer.outstanding_amount, 0);

    const summary = generateSummaryCard("Customer Analysis Summary", [
      { label: "Total Customers", value: customerReports.length },
      { label: "Total Business", value: formatCurrency(totalAmount) },
      { label: "Amount Received", value: formatCurrency(totalPaid) },
      { label: "Outstanding Amount", value: formatCurrency(totalOutstanding) },
      { label: "Collection Rate", value: `${((totalPaid / totalAmount) * 100).toFixed(1)}%` }
    ]);

    const headers = [
      'Customer Code', 'Customer Name', 'Total Orders', 'Total Amount', 
      'Paid Amount', 'Outstanding', 'Last Order Date'
    ];

    const rows = customerReports.map(customer => [
      customer.customer_code,
      customer.customer_name,
      customer.total_orders,
      formatCurrency(customer.total_amount),
      formatCurrency(customer.paid_amount),
      formatCurrency(customer.outstanding_amount),
      customer.last_order_date ? formatDate(customer.last_order_date) : 'N/A'
    ]);

    const table = generateTableHTML(headers, rows);
    
    return summary + table;
  };

  const generateSalesReportHTML = () => {
    if (salesReports.length === 0) return '<p>No sales data available for the selected criteria</p>';

    const totalSales = salesReports.reduce((sum, report) => sum + report.total_sales, 0);
    const totalCash = salesReports.reduce((sum, report) => sum + report.cash_sales, 0);
    const totalUPI = salesReports.reduce((sum, report) => sum + report.upi_sales, 0);
    const totalGST = salesReports.reduce((sum, report) => sum + report.gst_collected, 0);

    const summary = generateSummaryCard("Sales Performance Summary", [
      { label: "Total Sales", value: formatCurrency(totalSales) },
      { label: "Cash Sales", value: formatCurrency(totalCash) },
      { label: "UPI Sales", value: formatCurrency(totalUPI) },
      { label: "GST Collected", value: formatCurrency(totalGST) },
      { label: "Average Order Value", value: formatCurrency(totalSales / salesReports.reduce((sum, r) => sum + r.total_orders, 0)) }
    ]);

    const headers = [
      'Period', 'Total Sales', 'Orders', 'Cash Sales', 
      'UPI Sales', 'Credit Sales', 'GST Collected', 'Outstanding'
    ];

    const rows = salesReports.map(report => [
      report.period,
      formatCurrency(report.total_sales),
      report.total_orders,
      formatCurrency(report.cash_sales),
      formatCurrency(report.upi_sales),
      formatCurrency(report.credit_sales),
      formatCurrency(report.gst_collected),
      formatCurrency(report.outstanding)
    ]);

    const table = generateTableHTML(headers, rows);
    
    return summary + table;
  };

  const downloadReport = () => {
    const reportContent = generateReportHTML();
    const filename = `${selectedReportType}_report_${new Date().toISOString().split('T')[0]}`;
    downloadAsHTML(reportContent, filename);
  };

  const downloadCSV = () => {
    let data: any[] = [];
    let filename = '';

    switch (selectedReportType) {
      case 'route':
        data = routeReports.map(report => ({
          'Route ID': report.route_id,
          'Route Name': report.route_name,
          'Agent Name': report.agent_name,
          'Date': formatDate(report.assigned_date),
          'Status': report.status,
          'Total Orders': report.total_orders,
          'Cash Collected': report.cash_collected,
          'UPI Collected': report.upi_collected,
          'Total Collected': report.total_collected,
          'Customers Visited': report.customers_visited
        }));
        filename = `route_report_${selectedRoute === 'all' ? 'all_routes' : selectedRoute}_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'customer':
        data = customerReports.map(customer => ({
          'Customer Code': customer.customer_code,
          'Customer Name': customer.customer_name,
          'Total Orders': customer.total_orders,
          'Total Amount': customer.total_amount,
          'Paid Amount': customer.paid_amount,
          'Outstanding Amount': customer.outstanding_amount,
          'Last Order Date': customer.last_order_date ? formatDate(customer.last_order_date) : 'N/A'
        }));
        filename = `customer_report_${new Date().toISOString().split('T')[0]}`;
        break;
      case 'sales':
        data = salesReports.map(report => ({
          'Period': report.period,
          'Total Sales': report.total_sales,
          'Total Orders': report.total_orders,
          'Cash Sales': report.cash_sales,
          'UPI Sales': report.upi_sales,
          'Credit Sales': report.credit_sales,
          'GST Collected': report.gst_collected,
          'Outstanding': report.outstanding
        }));
        filename = `sales_report_${new Date().toISOString().split('T')[0]}`;
        break;
    }

    if (data.length > 0) {
      downloadAsCSV(data, filename);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Reports & Analytics</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Comprehensive business reports and insights</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={downloadCSV}
            disabled={selectedReportType === "overview"}
            className="w-full sm:w-auto"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={downloadReport}
            disabled={selectedReportType === "overview"}
            className="w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">HTML</span>
          </Button>
          <Button 
            onClick={generatePrintableReport}
            disabled={selectedReportType === "overview"}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 w-full sm:w-auto"
          >
            <Printer className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>
      </div>

      {/* Report Type Selection */}
      <Card className="p-6 bg-gradient-card shadow-card border-border/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="reportType">Report Type</Label>
            <Select value={selectedReportType} onValueChange={setSelectedReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview Dashboard</SelectItem>
                <SelectItem value="route">Route Reports</SelectItem>
                <SelectItem value="customer">Customer Reports</SelectItem>
                <SelectItem value="sales">Monthly Sales Reports</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateRange">Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="current_week">This Week</SelectItem>
                <SelectItem value="current_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                <SelectItem value="current_year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedReportType === "route" && (
            <div className="space-y-2">
              <Label htmlFor="route">Specific Route (Optional)</Label>
              <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                <SelectTrigger>
                  <SelectValue placeholder="All routes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Routes</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.route_code}>
                      {route.route_name} ({route.route_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-end">
            <Button 
              onClick={fetchReportData}
              disabled={selectedReportType === "overview" || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Report Content */}
      {selectedReportType === "overview" && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-card shadow-card border-border/50">
              <div className="text-center">
                <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-xl font-bold text-foreground">₹2,45,670</p>
                <p className="text-xs text-muted-foreground">Monthly Sales</p>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-card shadow-card border-border/50">
              <div className="text-center">
                <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-xl font-bold text-foreground">45</p>
                <p className="text-xs text-muted-foreground">Active Customers</p>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-card shadow-card border-border/50">
              <div className="text-center">
                <MapPin className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <p className="text-xl font-bold text-foreground">12</p>
                <p className="text-xs text-muted-foreground">Active Routes</p>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-card shadow-card border-border/50">
              <div className="text-center">
                <TrendingUp className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-xl font-bold text-foreground">+15.8%</p>
                <p className="text-xs text-muted-foreground">Growth Rate</p>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="p-6 bg-gradient-card shadow-card border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-4">Quick Report Access</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="p-6 h-auto flex-col"
                onClick={() => setSelectedReportType("route")}
              >
                <MapPin className="w-8 h-8 mb-2 text-blue-500" />
                <div className="font-medium">Route Reports</div>
                <div className="text-xs text-muted-foreground">Track route performance and collections</div>
              </Button>
              <Button 
                variant="outline" 
                className="p-6 h-auto flex-col"
                onClick={() => setSelectedReportType("customer")}
              >
                <Users className="w-8 h-8 mb-2 text-green-500" />
                <div className="font-medium">Customer Reports</div>
                <div className="text-xs text-muted-foreground">Customer analysis and payment history</div>
              </Button>
              <Button 
                variant="outline" 
                className="p-6 h-auto flex-col"
                onClick={() => setSelectedReportType("sales")}
              >
                <BarChart3 className="w-8 h-8 mb-2 text-purple-500" />
                <div className="font-medium">Sales Reports</div>
                <div className="text-xs text-muted-foreground">Monthly sales analysis and trends</div>
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Route Reports */}
      {selectedReportType === "route" && !selectedRouteDetail && (
        <Card className="bg-gradient-card shadow-card border-border/50">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Route Performance Report</h3>
            <p className="text-sm text-muted-foreground mb-6">Click on any route to view detailed information</p>
            {routeReports.length > 0 ? (
              <div className="space-y-4">
                {routeReports.map((report) => (
                  <div 
                    key={report.id} 
                    className="p-4 rounded-lg bg-background/50 border border-border/30 hover:bg-background/70 cursor-pointer transition-colors"
                    onClick={() => handleRouteClick(report.route_id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                          {report.route_id}
                          <Button variant="ghost" size="sm" className="h-6 text-xs">
                            View Details →
                          </Button>
                        </h4>
                        <p className="text-sm text-muted-foreground">{report.route_name} • {report.agent_name}</p>
                      </div>
                      <Badge className={`${report.status === 'finished' ? 'bg-green-500' : 'bg-blue-500'} text-white`}>
                        {report.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Orders</p>
                        <p className="text-lg font-semibold text-foreground">{report.total_orders}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cash Collected</p>
                        <p className="text-lg font-semibold text-foreground">{formatCurrency(report.cash_collected)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">UPI Collected</p>
                        <p className="text-lg font-semibold text-foreground">{formatCurrency(report.upi_collected)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Collected</p>
                        <p className="text-lg font-semibold text-foreground">{formatCurrency(report.total_collected)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No route data available for the selected criteria</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Route Detail View */}
      {selectedReportType === "route" && selectedRouteDetail && (
        <Card className="bg-gradient-card shadow-card border-border/50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Route Details: {selectedRouteDetail}</h3>
                <p className="text-sm text-muted-foreground">Comprehensive route performance and transaction details</p>
              </div>
              <Button onClick={handleBackToRoutes} variant="outline">
                ← Back to Routes
              </Button>
            </div>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : routeDetailData ? (
              <div className="space-y-6">
                {/* Route Summary Table */}
                <div>
                  <h4 className="text-md font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Route Summary
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-border rounded-lg">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 border-b border-border">Route Code</th>
                          <th className="text-left p-3 border-b border-border">Route Name</th>
                          <th className="text-left p-3 border-b border-border">Agent</th>
                          <th className="text-left p-3 border-b border-border">Date</th>
                          <th className="text-left p-3 border-b border-border">Assigned Time</th>
                          <th className="text-left p-3 border-b border-border">Accepted Time</th>
                          <th className="text-left p-3 border-b border-border">Started Time</th>
                          <th className="text-left p-3 border-b border-border">Finished Time</th>
                          <th className="text-left p-3 border-b border-border">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-background/50">
                          <td className="p-3 border-b border-border">{routeDetailData.route_code}</td>
                          <td className="p-3 border-b border-border">{routeDetailData.route_name}</td>
                          <td className="p-3 border-b border-border">
                            <div>
                              <div className="font-medium">{routeDetailData.agent_name}</div>
                              <div className="text-xs text-muted-foreground">{routeDetailData.agent_id}</div>
                            </div>
                          </td>
                          <td className="p-3 border-b border-border">{formatDate(routeDetailData.assigned_date)}</td>
                          <td className="p-3 border-b border-border">{formatDateTime(routeDetailData.assigned_time)}</td>
                          <td className="p-3 border-b border-border">{formatDateTime(routeDetailData.accepted_time)}</td>
                          <td className="p-3 border-b border-border">{formatDateTime(routeDetailData.started_time)}</td>
                          <td className="p-3 border-b border-border">{formatDateTime(routeDetailData.finished_time)}</td>
                          <td className="p-3 border-b border-border">
                            <Badge className={`${routeDetailData.status === 'finished' ? 'bg-green-500' : 'bg-blue-500'} text-white`}>
                              {routeDetailData.status}
                            </Badge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Stock Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Opening Stock */}
                  <div>
                    <h4 className="text-md font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Opening Stock
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border border-border rounded-lg">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3 border-b border-border">Product Code</th>
                            <th className="text-left p-3 border-b border-border">Product Name</th>
                            <th className="text-right p-3 border-b border-border">Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {routeDetailData.opening_stock.map((item, index) => (
                            <tr key={index} className="bg-background/50">
                              <td className="p-3 border-b border-border">{item.product_code}</td>
                              <td className="p-3 border-b border-border">{item.product_name}</td>
                              <td className="p-3 border-b border-border text-right">{item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Return/Closing Stock */}
                  <div>
                    <h4 className="text-md font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Return/Closing Stock
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border border-border rounded-lg">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3 border-b border-border">Product Code</th>
                            <th className="text-left p-3 border-b border-border">Product Name</th>
                            <th className="text-right p-3 border-b border-border">Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {routeDetailData.return_stock.map((item, index) => (
                            <tr key={index} className="bg-background/50">
                              <td className="p-3 border-b border-border">{item.product_code}</td>
                              <td className="p-3 border-b border-border">{item.product_name}</td>
                              <td className="p-3 border-b border-border text-right">{item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Invoices Table */}
                <div>
                  <h4 className="text-md font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Route Invoices ({routeDetailData.invoices.length} transactions)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-border rounded-lg">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 border-b border-border">Customer</th>
                          <th className="text-left p-3 border-b border-border">Customer Code</th>
                          <th className="text-left p-3 border-b border-border">Time</th>
                          <th className="text-right p-3 border-b border-border">Total Amount</th>
                          <th className="text-right p-3 border-b border-border">Cash</th>
                          <th className="text-right p-3 border-b border-border">UPI</th>
                          <th className="text-right p-3 border-b border-border">Credit</th>
                          <th className="text-right p-3 border-b border-border">Paid Amount</th>
                          <th className="text-center p-3 border-b border-border">Payment Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {routeDetailData.invoices.length > 0 ? (
                          routeDetailData.invoices.map((invoice) => (
                            <tr key={invoice.id} className="bg-background/50 hover:bg-background/70">
                              <td className="p-3 border-b border-border font-medium">{invoice.customer_name}</td>
                              <td className="p-3 border-b border-border text-muted-foreground">{invoice.customer_code}</td>
                              <td className="p-3 border-b border-border">{formatDateTime(invoice.created_at)}</td>
                              <td className="p-3 border-b border-border text-right font-semibold">{formatCurrency(invoice.total_amount)}</td>
                              <td className="p-3 border-b border-border text-right">{formatCurrency(invoice.cash_amount)}</td>
                              <td className="p-3 border-b border-border text-right">{formatCurrency(invoice.upi_amount)}</td>
                              <td className="p-3 border-b border-border text-right">{formatCurrency(invoice.credit_amount)}</td>
                              <td className="p-3 border-b border-border text-right font-semibold">{formatCurrency(invoice.payment_amount)}</td>
                              <td className="p-3 border-b border-border text-center">
                                {getPaymentStatusBadge(invoice.payment_status)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-muted-foreground">
                              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              No invoices found for this route
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Print/Download Actions */}
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={() => printReport('route-detail', `Route ${selectedRouteDetail} Details`)}
                    className="flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print Report
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      if (routeDetailData) {
                        const csvData = [
                          {
                            type: 'Route Summary',
                            route_code: routeDetailData.route_code,
                            route_name: routeDetailData.route_name,
                            agent_name: routeDetailData.agent_name,
                            status: routeDetailData.status,
                            total_invoices: routeDetailData.invoices.length
                          },
                          ...routeDetailData.invoices.map(invoice => ({
                            type: 'Invoice',
                            customer_name: invoice.customer_name,
                            customer_code: invoice.customer_code,
                            time: invoice.created_at,
                            total_amount: invoice.total_amount,
                            cash_amount: invoice.cash_amount,
                            upi_amount: invoice.upi_amount,
                            credit_amount: invoice.credit_amount,
                            payment_amount: invoice.payment_amount,
                            payment_status: invoice.payment_status
                          }))
                        ];
                        downloadAsCSV(csvData, `route-${selectedRouteDetail}-details`);
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Failed to load route details</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Customer Reports */}
      {selectedReportType === "customer" && (
        <Card className="bg-gradient-card shadow-card border-border/50">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Customer Analysis Report</h3>
            {customerReports.length > 0 ? (
              <div className="space-y-4">
                {customerReports.map((customer) => (
                  <div key={customer.id} className="p-4 rounded-lg bg-background/50 border border-border/30">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-base font-semibold text-foreground">{customer.customer_name}</h4>
                        <p className="text-sm text-muted-foreground">Code: {customer.customer_code}</p>
                      </div>
                      {customer.outstanding_amount > 0 && (
                        <Badge variant="destructive">Outstanding: {formatCurrency(customer.outstanding_amount)}</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Orders</p>
                        <p className="text-lg font-semibold text-foreground">{customer.total_orders}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Business</p>
                        <p className="text-lg font-semibold text-foreground">{formatCurrency(customer.total_amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Paid Amount</p>
                        <p className="text-lg font-semibold text-foreground">{formatCurrency(customer.paid_amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Order</p>
                        <p className="text-lg font-semibold text-foreground">
                          {customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString('en-IN') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No customer data available for the selected criteria</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Sales Reports */}
      {selectedReportType === "sales" && (
        <Card className="bg-gradient-card shadow-card border-border/50">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Sales Analysis Report</h3>
            {salesReports.length > 0 ? (
              <div className="space-y-4">
                {salesReports.map((report, index) => (
                  <div key={index} className="p-4 rounded-lg bg-background/50 border border-border/30">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold text-foreground">{report.period}</h4>
                      <Badge className="bg-green-500 text-white">
                        {report.total_orders} Orders
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Sales</p>
                        <p className="text-lg font-semibold text-foreground">{formatCurrency(report.total_sales)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cash Sales</p>
                        <p className="text-lg font-semibold text-foreground">{formatCurrency(report.cash_sales)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">UPI Sales</p>
                        <p className="text-lg font-semibold text-foreground">{formatCurrency(report.upi_sales)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">GST Collected</p>
                        <p className="text-lg font-semibold text-foreground">{formatCurrency(report.gst_collected)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No sales data available for the selected criteria</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}