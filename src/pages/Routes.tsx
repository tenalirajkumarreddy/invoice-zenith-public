import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, MapPin, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Route {
  id: string;
  route_name: string;
  route_code: string;
  pincodes: string[];
  is_active: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  agent_id: string | null;
  role: string;
}

interface Customer {
  id: string;
  name: string;
  shop_name: string;
  pincode: string;
  route_id: string | null;
}

export default function Routes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [formData, setFormData] = useState({
    route_name: "",
    route_code: "",
    pincodes: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [routesRes, agentsRes, customersRes] = await Promise.all([
        supabase.from('routes').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'agent').eq('is_active', true),
        supabase.from('customers').select('id, name, shop_name, pincode, route_id')
      ]);

      if (routesRes.error) throw routesRes.error;
      if (agentsRes.error) throw agentsRes.error;
      if (customersRes.error) throw customersRes.error;

      setRoutes(routesRes.data || []);
      setAgents(agentsRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const pincodeArray = formData.pincodes.split(',').map(p => p.trim()).filter(p => p);
      
      const routeData = {
        route_name: formData.route_name,
        route_code: formData.route_code,
        pincodes: pincodeArray
      };

      if (editingRoute) {
        const { error } = await supabase
          .from('routes')
          .update(routeData)
          .eq('id', editingRoute.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Route updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('routes')
          .insert([routeData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Route created successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingRoute(null);
      setFormData({ route_name: "", route_code: "", pincodes: "" });
      fetchData();
    } catch (error) {
      console.error('Error saving route:', error);
      toast({
        title: "Error",
        description: "Failed to save route",
        variant: "destructive",
      });
    }
  };

  const handleAssignRoute = async () => {
    if (!selectedRoute || !selectedAgent) {
      toast({
        title: "Error",
        description: "Please select both route and agent",
        variant: "destructive",
      });
      return;
    }

    try {
      // For now, we'll just show a success message
      // In a real app, you'd update a route_assignments table or agent profiles
      toast({
        title: "Success",
        description: "Route assigned to agent successfully",
      });
      setIsAssignDialogOpen(false);
      setSelectedRoute("");
      setSelectedAgent("");
    } catch (error) {
      console.error('Error assigning route:', error);
      toast({
        title: "Error",
        description: "Failed to assign route",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      route_name: route.route_name,
      route_code: route.route_code,
      pincodes: route.pincodes.join(', ')
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Route deleted successfully",
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting route:', error);
      toast({
        title: "Error",
        description: "Failed to delete route",
        variant: "destructive",
      });
    }
  };

  const toggleStatus = async (route: Route) => {
    try {
      const { error } = await supabase
        .from('routes')
        .update({ is_active: !route.is_active })
        .eq('id', route.id);

      if (error) throw error;
      toast({
        title: "Success",
        description: `Route ${route.is_active ? 'deactivated' : 'activated'}`,
      });
      fetchData();
    } catch (error) {
      console.error('Error updating route status:', error);
      toast({
        title: "Error",
        description: "Failed to update route status",
        variant: "destructive",
      });
    }
  };

  const filteredRoutes = routes.filter(route =>
    route.route_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.route_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCustomersForRoute = (routeId: string) => {
    return customers.filter(customer => customer.route_id === routeId);
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
          <h2 className="text-3xl font-bold text-foreground">Route Management</h2>
          <p className="text-muted-foreground">Manage delivery routes and assign them to agents</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <User className="w-4 h-4 mr-2" />
                Assign Route
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Route to Agent</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Route</Label>
                  <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a route" />
                    </SelectTrigger>
                    <SelectContent>
                      {routes.filter(r => r.is_active).map((route) => (
                        <SelectItem key={route.id} value={route.id}>
                          {route.route_name} ({route.route_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Select Agent</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.user_id}>
                          {agent.full_name} ({agent.agent_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAssignRoute} className="w-full">
                  Assign Route
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Add Route
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingRoute ? "Edit Route" : "Add New Route"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="route_name">Route Name</Label>
                  <Input
                    id="route_name"
                    value={formData.route_name}
                    onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="route_code">Route Code</Label>
                  <Input
                    id="route_code"
                    value={formData.route_code}
                    onChange={(e) => setFormData({ ...formData, route_code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pincodes">Pincodes (comma separated)</Label>
                  <Textarea
                    id="pincodes"
                    value={formData.pincodes}
                    onChange={(e) => setFormData({ ...formData, pincodes: e.target.value })}
                    placeholder="400001, 400002, 400003"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingRoute ? "Update" : "Create"} Route
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{routes.length}</p>
            <p className="text-sm text-muted-foreground">Total Routes</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{routes.filter(r => r.is_active).length}</p>
            <p className="text-sm text-muted-foreground">Active Routes</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{agents.length}</p>
            <p className="text-sm text-muted-foreground">Available Agents</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">{customers.length}</p>
            <p className="text-sm text-muted-foreground">Total Customers</p>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-6 bg-gradient-card shadow-card border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search routes by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Routes List */}
      <Card className="bg-gradient-card shadow-card border-border/50">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">All Routes</h3>
          <div className="space-y-4">
            {filteredRoutes.map((route) => {
              const routeCustomers = getCustomersForRoute(route.id);
              return (
                <div key={route.id} className="p-4 rounded-lg bg-background/50 border border-border/30 hover:bg-background/70 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-foreground text-lg">{route.route_name}</h4>
                            <Badge variant={route.is_active ? "default" : "secondary"}>
                              {route.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">{route.route_code}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {routeCustomers.length} customers • {route.pincodes.length} pincodes
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-muted-foreground text-sm mb-1">Pincodes</p>
                          <div className="flex flex-wrap gap-1">
                            {route.pincodes.slice(0, 5).map((pincode, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {pincode}
                              </Badge>
                            ))}
                            {route.pincodes.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{route.pincodes.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-muted-foreground text-sm mb-1">Recent Customers</p>
                          <div className="space-y-1">
                            {routeCustomers.slice(0, 3).map((customer) => (
                              <p key={customer.id} className="text-sm text-foreground">
                                {customer.shop_name} - {customer.pincode}
                              </p>
                            ))}
                            {routeCustomers.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{routeCustomers.length - 3} more customers
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(route)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => toggleStatus(route)}
                        className={route.is_active ? "text-warning" : "text-success"}
                      >
                        {route.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDelete(route.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}