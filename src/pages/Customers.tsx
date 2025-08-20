import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Eye, FileText, Send, MoreVertical, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddCustomerDialog } from "@/components/AddCustomerDialog";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import CustomerProfile from "@/components/delivery/CustomerProfile";
import { 
  Dialog as UIDialog, 
  DialogContent as UIDialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

interface Customer {
  id: string;
  customer_id: string;
  name: string;
  shop_name: string;
  phone: string;
  address: string;
  pincode: string;
  total_orders: number;
  balance: number;
  outstanding: number;
  is_active: boolean;
  route_id: string | null;
  routes?: {
    route_name: string;
    route_code: string;
  };
}

interface Route {
  id: string;
  route_code: string;
  route_name: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchRoutes();
  }, []);

  const assignRouteToCustomer = async (customer: Customer) => {
    try {
      // Find route based on customer's pincode
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .select('id')
        .contains('pincodes', [customer.pincode])
        .eq('is_active', true)
        .single();

      if (routeError && routeError.code !== 'PGRST116') {
        console.error('Error finding route:', routeError);
        return;
      }

      if (routeData) {
        // Update customer with route assignment
        const { error: updateError } = await supabase
          .from('customers')
          .update({ route_id: routeData.id })
          .eq('id', customer.id);

        if (updateError) {
          console.error('Error updating customer route:', updateError);
        }
      }
    } catch (error) {
      console.error('Error in route assignment:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          routes (route_name, route_code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Auto-assign routes for customers without routes
      const customersWithoutRoutes = data?.filter(c => !c.route_id) || [];
      for (const customer of customersWithoutRoutes) {
        await assignRouteToCustomer(customer);
      }
      
      // Fetch updated data after route assignments
      const { data: updatedData, error: updatedError } = await supabase
        .from('customers')
        .select(`
          *,
          routes (route_name, route_code)
        `)
        .order('created_at', { ascending: false });

      if (updatedError) throw updatedError;
      setCustomers(updatedData || []);
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

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('is_active', true)
        .order('route_code');

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone.includes(searchTerm);
    const matchesRoute = selectedRoute === "all" || customer.routes?.route_code === selectedRoute;
    return matchesSearch && matchesRoute;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (customer: Customer) => {
    if (!customer.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    // Always show Active badge for active customers
    return <Badge className="bg-success text-success-foreground">Active</Badge>;
  };

  const availableRouteCodes = ["all", ...new Set(customers.map(c => c.routes?.route_code).filter(Boolean))];

  const handleViewDetails = (customer: Customer) => {
    setViewCustomer(customer);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditCustomer(customer);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setDeleteCustomer(customer);
  };

  const confirmDeleteCustomer = async () => {
    if (!deleteCustomer) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('customers').delete().eq('id', deleteCustomer.id);
      if (error) throw error;
      toast({ title: "Deleted", description: `Customer ${deleteCustomer.shop_name} deleted.` });
      setDeleteCustomer(null);
      fetchCustomers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete customer", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateInvoice = (customer: Customer) => {
    // Navigate to invoice creation page
    navigate(`/invoices?customer=${customer.id}`);
  };

  const handleSendReminder = (customer: Customer) => {
    toast({
      title: "Reminder Sent",
      description: `Payment reminder sent to ${customer.shop_name}`,
    });
    // TODO: Implement actual reminder functionality
  };

  const handleToggleActive = async (customer: Customer) => {
    const newStatus = !customer.is_active;
    const { error } = await supabase.from('customers').update({ is_active: newStatus }).eq('id', customer.id);
    if (!error) {
      toast({ title: newStatus ? 'Activated' : 'Deactivated', description: `Customer ${customer.shop_name} ${newStatus ? 'activated' : 'deactivated'}.` });
      fetchCustomers();
    } else {
      toast({ title: 'Error', description: error.message || 'Failed to update status', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Customer Management</h2>
          <p className="text-sm text-muted-foreground">Manage your customers, routes, and outstanding balances</p>
        </div>
        <AddCustomerDialog onCustomerAdded={fetchCustomers} routes={routes} />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{customers.length}</p>
            <p className="text-xs text-muted-foreground">Total Customers</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-success">{customers.filter(c => c.is_active).length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-warning">{customers.filter(c => c.outstanding > 0).length}</p>
            <p className="text-sm text-muted-foreground">With Outstanding</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(customers.reduce((sum, c) => sum + c.outstanding, 0))}
            </p>
            <p className="text-sm text-muted-foreground">Total Outstanding</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6 bg-gradient-card shadow-card border-border/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search customers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {availableRouteCodes.map((route) => (
                <Button
                  key={route}
                  variant={selectedRoute === route ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRoute(route)}
                  className={selectedRoute === route ? "bg-primary text-primary-foreground" : ""}
                >
                  {route === "all" ? "All Routes" : route}
                </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Customers List */}
      <Card className="bg-gradient-card shadow-card border-border/50">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">All Customers</h3>
          <div className="space-y-4">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="p-4 rounded-lg bg-background/50 border border-border/30 hover:bg-background/70 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-foreground text-lg">{customer.shop_name}</h4>
                      {getStatusBadge(customer)}
                      {customer.routes && (
                        <Badge variant="outline" className="text-xs">{customer.routes.route_code}</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Contact</p>
                        <p className="text-foreground">{customer.name}</p>
                        <p className="text-foreground">{customer.phone}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Customer ID</p>
                        <p className="text-foreground font-mono text-xs">{customer.customer_id}</p>
                        <p className="text-muted-foreground text-xs mt-1">Address</p>
                        <p className="text-foreground text-xs">{customer.address} - {customer.pincode}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Business Summary</p>
                        <p className="text-foreground">{customer.total_orders} orders</p>
                        {customer.balance > 0 && (
                          <p className="text-green-600 font-medium">Credit: {formatCurrency(customer.balance)}</p>
                        )}
                        {customer.outstanding > 0 && (
                          <p className="text-red-600 font-medium">Outstanding: {formatCurrency(customer.outstanding)}</p>
                        )}
                        {customer.balance === 0 && customer.outstanding === 0 && (
                          <p className="text-success font-medium">No Balance</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(customer)}>
                          <Eye className="w-4 h-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        {customer.is_active ? (
                          <DropdownMenuItem onClick={() => handleToggleActive(customer)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleToggleActive(customer)}>
                            <Edit className="w-4 h-4 mr-2" /> Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteCustomer(customer)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs"
                      onClick={() => handleCreateInvoice(customer)}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Create Invoice
                    </Button>
                    {customer.outstanding > 0 && (
                      <Button 
                        size="sm" 
                        className="text-xs bg-red-500 text-white"
                        onClick={() => handleSendReminder(customer)}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Send Reminder
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* View Details Modal */}
      <UIDialog open={!!viewCustomer} onOpenChange={open => !open && setViewCustomer(null)}>
        <UIDialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="sr-only">
              Customer Details - {viewCustomer?.shop_name}
            </DialogTitle>
          </DialogHeader>
          {viewCustomer && <CustomerProfile customer={viewCustomer} onBack={() => setViewCustomer(null)} />}
        </UIDialogContent>
      </UIDialog>

      {/* Edit Customer Dialog */}
      <UIDialog open={!!editCustomer} onOpenChange={open => !open && setEditCustomer(null)}>
        <UIDialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Edit Customer - {editCustomer?.shop_name}
            </DialogTitle>
          </DialogHeader>
          {editCustomer && (
            <AddCustomerDialog
              onCustomerAdded={() => { setEditCustomer(null); fetchCustomers(); }}
              routes={routes}
              initialData={editCustomer}
              editMode
            />
          )}
        </UIDialogContent>
      </UIDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCustomer} onOpenChange={open => !open && setDeleteCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
          </AlertDialogHeader>
          <div>Are you sure you want to delete <b>{deleteCustomer?.shop_name}</b>? This action cannot be undone.</div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCustomer} disabled={deleting} className="bg-red-600 text-white hover:bg-red-700">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}