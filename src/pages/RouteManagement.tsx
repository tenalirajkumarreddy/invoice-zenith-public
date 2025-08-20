import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Users, MapPin, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Route {
  id: string;
  route_code: string;
  route_name: string;
  route_symbol: string | null;
  pincodes: string[];
  is_active: boolean;
  created_at: string;
  customer_count?: number;
}

interface Customer {
  id: string;
  customer_id: string;
  name: string;
  shop_name: string;
  phone: string;
  pincode: string;
  route_id: string | null;
}

export default function RouteManagement() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const { toast } = useToast();

  const [routeForm, setRouteForm] = useState({
    route_code: "",
    route_name: "",
    route_symbol: "",
    pincodes: "",
    is_active: true,
  });

  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [showRouteSelection, setShowRouteSelection] = useState(false);

  useEffect(() => {
    fetchRoutes();
    fetchCustomers();
  }, []);

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('route_code');

      if (error) throw error;

      // Get customer count for each route
      const routesWithCount = await Promise.all(
        data.map(async (route) => {
          const { count } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('route_id', route.id);
          
          return { ...route, customer_count: count || 0 };
        })
      );

      setRoutes(routesWithCount);
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch routes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, customer_id, name, shop_name, phone, pincode, route_id')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const pincodesArray = routeForm.pincodes
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const { data, error } = await supabase
        .from('routes')
        .insert({
          route_code: routeForm.route_code,
          route_name: routeForm.route_name,
          route_symbol: routeForm.route_symbol || null,
          pincodes: pincodesArray,
          is_active: routeForm.is_active,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Route ${data.route_name} added successfully`,
      });

      setRouteForm({
        route_code: "",
        route_name: "",
        route_symbol: "",
        pincodes: "",
        is_active: true,
      });
      setShowRouteDialog(false);
      fetchRoutes();
    } catch (error: any) {
      console.error('Error adding route:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add route",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute) return;
    setLoading(true);

    try {
      const pincodesArray = routeForm.pincodes
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const { error } = await supabase
        .from('routes')
        .update({
          route_code: routeForm.route_code,
          route_name: routeForm.route_name,
          route_symbol: routeForm.route_symbol || null,
          pincodes: pincodesArray,
          is_active: routeForm.is_active,
        })
        .eq('id', editingRoute.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Route ${routeForm.route_name} updated successfully`,
      });

      setRouteForm({
        route_code: "",
        route_name: "",
        route_symbol: "",
        pincodes: "",
        is_active: true,
      });
      setEditingRoute(null);
      setShowRouteDialog(false);
      fetchRoutes();
    } catch (error: any) {
      console.error('Error updating route:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update route",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route? This will unassign all customers from this route.')) {
      return;
    }

    try {
      // First, unassign all customers from this route
      await supabase
        .from('customers')
        .update({ route_id: null })
        .eq('route_id', routeId);

      // Then delete the route
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Route deleted successfully",
      });

      fetchRoutes();
    } catch (error: any) {
      console.error('Error deleting route:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete route",
        variant: "destructive",
      });
    }
  };

  const handleAssignCustomers = async () => {
    if (!selectedRoute || selectedCustomers.length === 0) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({ route_id: selectedRoute.id })
        .in('id', selectedCustomers);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedCustomers.length} customers assigned to route ${selectedRoute.route_name}`,
      });

      setSelectedCustomers([]);
      setShowCustomerDialog(false);
      fetchRoutes();
      fetchCustomers();
    } catch (error: any) {
      console.error('Error assigning customers:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign customers",
        variant: "destructive",
      });
    }
  };

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
        } else {
          toast({
            title: "Success",
            description: `Customer ${customer.shop_name} assigned to route automatically`,
          });
          fetchCustomers();
        }
      } else {
        toast({
          title: "No Route Found",
          description: `No route found for pincode ${customer.pincode}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in route assignment:', error);
    }
  };

  const handleRemoveCustomers = async () => {
    if (!selectedRoute || selectedCustomers.length === 0) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({ route_id: null })
        .in('id', selectedCustomers);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedCustomers.length} customers removed from route ${selectedRoute.route_name}`,
      });

      setSelectedCustomers([]);
      setShowCustomerDialog(false);
      fetchRoutes();
      fetchCustomers();
    } catch (error: any) {
      console.error('Error removing customers:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove customers",
        variant: "destructive",
      });
    }
  };

  const openCustomerDialog = (route: Route) => {
    setSelectedRoute(route);
    setSelectedCustomers([]);
    setShowCustomerDialog(true);
  };

  const openEditDialog = (route: Route) => {
    setEditingRoute(route);
    setRouteForm({
      route_code: route.route_code,
      route_name: route.route_name,
      route_symbol: route.route_symbol || "",
      pincodes: route.pincodes.join(', '),
      is_active: route.is_active,
    });
    setShowRouteDialog(true);
  };

  const filteredCustomers = customers.filter(customer => {
    const searchTerm = customerSearch.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchTerm) ||
      customer.shop_name.toLowerCase().includes(searchTerm) ||
      customer.phone.includes(searchTerm) ||
      customer.customer_id.toLowerCase().includes(searchTerm)
    );
  });

  const routeCustomers = selectedRoute 
    ? customers.filter(c => c.route_id === selectedRoute.id)
    : [];
  
  const unassignedCustomers = customers.filter(c => !c.route_id);

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
          <h2 className="text-3xl font-bold text-foreground">Route Configuration</h2>
          <p className="text-muted-foreground">Create and manage delivery routes, assign customers to routes</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => {
              setEditingRoute(null);
              setRouteForm({
                route_code: "",
                route_name: "",
                route_symbol: "",
                pincodes: "",
                is_active: true,
              });
              setShowRouteDialog(true);
            }}
            className="bg-gradient-accent text-accent-foreground hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Route
          </Button>
          <Button 
            onClick={() => {
              setSelectedRoute(null);
              setShowCustomerDialog(true);
            }}
            variant="outline"
            className="border-warning text-warning hover:bg-warning hover:text-warning-foreground"
          >
            <Users className="w-4 h-4 mr-2" />
            Unassigned Customers
          </Button>
        </div>
      </div>

      {/* Routes List */}
      <Card className="bg-gradient-card shadow-card border-border/50">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">All Routes</h3>
          <div className="space-y-4">
            {routes.map((route) => (
              <div key={route.id} className="p-4 rounded-lg bg-background/50 border border-border/30 hover:bg-background/70 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-foreground text-lg">{route.route_name}</h4>
                      <Badge variant={route.is_active ? "default" : "secondary"}>
                        {route.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {route.route_symbol && (
                        <Badge variant="outline" className="text-xs">{route.route_symbol}</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{route.route_code}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Pincodes</p>
                        <p className="text-foreground text-xs">{route.pincodes.join(', ') || 'No pincodes'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Customers</p>
                        <p className="text-foreground">{route.customer_count || 0} assigned</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => openCustomerDialog(route)}
                      className="text-xs"
                    >
                      <Users className="w-3 h-3 mr-1" />
                      Customers
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => openEditDialog(route)}
                      className="text-xs"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDeleteRoute(route.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Add/Edit Route Dialog */}
      <Dialog open={showRouteDialog} onOpenChange={setShowRouteDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingRoute ? 'Edit Route' : 'Add New Route'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={editingRoute ? handleUpdateRoute : handleAddRoute} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="route_code">Route Code *</Label>
                <Input
                  id="route_code"
                  value={routeForm.route_code}
                  onChange={(e) => setRouteForm({ ...routeForm, route_code: e.target.value })}
                  placeholder="e.g., R001"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="route_symbol">Route Symbol</Label>
                <Input
                  id="route_symbol"
                  value={routeForm.route_symbol}
                  onChange={(e) => setRouteForm({ ...routeForm, route_symbol: e.target.value })}
                  placeholder="e.g., A, B, C"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="route_name">Route Name *</Label>
              <Input
                id="route_name"
                value={routeForm.route_name}
                onChange={(e) => setRouteForm({ ...routeForm, route_name: e.target.value })}
                placeholder="e.g., North Zone Route"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincodes">Pincodes *</Label>
              <Textarea
                id="pincodes"
                value={routeForm.pincodes}
                onChange={(e) => setRouteForm({ ...routeForm, pincodes: e.target.value })}
                placeholder="Enter pincodes separated by commas (e.g., 110001, 110002, 110003)"
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                Customers with these pincodes will be automatically assigned to this route
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_active">Status</Label>
              <Select 
                value={routeForm.is_active ? "active" : "inactive"} 
                onValueChange={(value) => setRouteForm({ ...routeForm, is_active: value === "active" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRouteDialog(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingRoute ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingRoute ? 'Update Route' : 'Add Route'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customer Assignment Dialog */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRoute ? `Manage Customers - ${selectedRoute.route_name}` : 'Unassigned Customers'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedRoute ? (
              <>
                {/* Current Route Customers */}
                <div>
                  <h4 className="font-semibold mb-2">Current Route Customers ({routeCustomers.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {routeCustomers.map((customer) => (
                      <div key={customer.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div>
                          <p className="font-medium">{customer.shop_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {customer.name} • {customer.phone} • {customer.customer_id}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCustomers([customer.id]);
                            handleRemoveCustomers();
                          }}
                          className="text-xs text-red-600"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    {routeCustomers.length === 0 && (
                      <p className="text-muted-foreground text-sm">No customers assigned to this route</p>
                    )}
                  </div>
                </div>

                {/* Add Customers */}
                <div>
                  <h4 className="font-semibold mb-2">Add Customers to Route</h4>
                  <div className="space-y-2">
                    <Input
                      placeholder="Search customers by name, phone, or customer ID..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="mb-2"
                    />
                    
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {filteredCustomers
                        .filter(c => c.route_id !== selectedRoute?.id)
                        .map((customer) => (
                          <div key={customer.id} className="flex items-center justify-between p-2 bg-background/50 rounded border">
                            <div>
                              <p className="font-medium">{customer.shop_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {customer.name} • {customer.phone} • {customer.customer_id}
                              </p>
                              <p className="text-xs text-muted-foreground">Pincode: {customer.pincode}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCustomers([customer.id]);
                                handleAssignCustomers();
                              }}
                              className="text-xs"
                            >
                              Add to Route
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Unassigned Customers */
              <div>
                <h4 className="font-semibold mb-2">Unassigned Customers ({unassignedCustomers.length})</h4>
                <div className="space-y-2">
                  <Input
                    placeholder="Search unassigned customers..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="mb-2"
                  />
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {unassignedCustomers
                      .filter(c => 
                        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                        c.shop_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                        c.phone.includes(customerSearch) ||
                        c.customer_id.toLowerCase().includes(customerSearch.toLowerCase())
                      )
                      .map((customer) => (
                        <div key={customer.id} className="flex items-center justify-between p-2 bg-background/50 rounded border">
                          <div>
                            <p className="font-medium">{customer.shop_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {customer.name} • {customer.phone} • {customer.customer_id}
                            </p>
                            <p className="text-xs text-muted-foreground">Pincode: {customer.pincode}</p>
                            <p className="text-xs text-warning">No route assigned</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Auto-assign based on pincode
                                assignRouteToCustomer(customer);
                              }}
                              className="text-xs"
                            >
                              Auto Assign
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCustomers([customer.id]);
                                // Show route selection
                                setShowRouteSelection(true);
                              }}
                              className="text-xs"
                            >
                              Manual Assign
                            </Button>
                          </div>
                        </div>
                      ))}
                    {unassignedCustomers.length === 0 && (
                      <p className="text-muted-foreground text-sm">All customers are assigned to routes</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Route Selection Dialog for Manual Assignment */}
      <Dialog open={showRouteSelection} onOpenChange={setShowRouteSelection}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Select Route for Customer</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose a route to assign to the selected customer:
            </p>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {routes.map((route) => (
                <div key={route.id} className="flex items-center justify-between p-3 bg-background/50 rounded border">
                  <div>
                    <p className="font-medium">{route.route_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {route.route_code} {route.route_symbol && `(${route.route_symbol})`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pincodes: {route.pincodes.join(', ')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        const { error } = await supabase
                          .from('customers')
                          .update({ route_id: route.id })
                          .in('id', selectedCustomers);

                        if (error) throw error;

                        toast({
                          title: "Success",
                          description: `Customer assigned to ${route.route_name}`,
                        });

                        setSelectedCustomers([]);
                        setShowRouteSelection(false);
                        setShowCustomerDialog(false);
                        fetchCustomers();
                      } catch (error: any) {
                        console.error('Error assigning customer:', error);
                        toast({
                          title: "Error",
                          description: error.message || "Failed to assign customer",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 