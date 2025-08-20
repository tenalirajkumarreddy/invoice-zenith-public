import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Search, 
  Plus, 
  MapPin, 
  Truck, 
  User,
  Clock,
  CheckCircle,
  X,
  AlertTriangle,
  Play,
  StopCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface RouteAssignment {
  id: string;
  route_id: string;
  route_code: string;
  agent_id: string;
  assigned_by: string | null;
  assigned_date: string;
  assigned_time: string;
  accepted_time: string | null;
  started_time: string | null;
  finished_time: string | null;
  status: 'assigned' | 'accepted' | 'started' | 'finished' | 'cancelled';
  cash_collected: number;
  upi_collected: number;
  pending_amount: number;
  total_collected: number;
  customers_visited: number;
  customers_with_orders: number;
  total_orders: number;
  admin_notes: string | null;
  agent_notes: string | null;
  created_at: string;
  updated_at: string;
  routes?: {
    route_name: string;
    route_code: string;
  };
  agent?: {
    full_name: string;
    agent_id: string;
  };
}

interface Route {
  id: string;
  route_code: string;
  route_name: string;
  is_active: boolean;
}

interface Agent {
  id: string;
  full_name: string;
  agent_id: string;
  role: string;
}

export default function RouteAssignment() {
  const [assignments, setAssignments] = useState<RouteAssignment[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('Fetching route assignment data...');
      
      // Fetch route assignments with related data
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('route_assignments')
        .select(`
          *,
          routes (route_name, route_code),
          agent:profiles!route_assignments_agent_id_fkey (full_name, agent_id)
        `)
        .order('assigned_date', { ascending: false })
        .order('assigned_time', { ascending: false });

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        throw assignmentsError;
      }

      console.log('Assignments data:', assignmentsData);

      // Fetch routes
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('*')
        .eq('is_active', true)
        .order('route_code');

      if (routesError) {
        console.error('Error fetching routes:', routesError);
        throw routesError;
      }

      console.log('Routes data:', routesData);

      // Fetch agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('profiles')
        .select('id, full_name, agent_id, role')
        .eq('role', 'agent')
        .order('full_name');

      if (agentsError) {
        console.error('Error fetching agents:', agentsError);
        throw agentsError;
      }

      console.log('Agents data:', agentsData);

      // Cast status to proper union type
      const assignmentsWithCastedStatus = (assignmentsData || []).map(assignment => ({
        ...assignment,
        status: assignment.status as 'assigned' | 'accepted' | 'started' | 'finished' | 'cancelled'
      }));
      
      setAssignments(assignmentsWithCastedStatus);
      setRoutes(routesData || []);
      setAgents(agentsData || []);
      
      // Show warnings if no data
      if (!routesData || routesData.length === 0) {
        toast({
          title: "No Routes Available",
          description: "Please create some routes in Route Management first",
          variant: "destructive",
        });
      }
      
      if (!agentsData || agentsData.length === 0) {
        toast({
          title: "No Agents Available",
          description: "Please create some agent accounts first",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch route assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignRoute = async () => {
    if (!selectedRoute || !selectedAgent) {
      toast({
        title: "Error",
        description: "Please select both route and agent",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate route assignment ID
      const { data: routeId, error: routeIdError } = await supabase.rpc('generate_route_id');
      if (routeIdError) throw routeIdError;

      const { error } = await supabase
        .from('route_assignments')
        .insert({
          route_id: routeId,
          route_code: selectedRoute,
          agent_id: selectedAgent,
          assigned_by: profile?.user_id,
          admin_notes: adminNotes || null,
          status: 'assigned'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Route assigned successfully",
      });

      setShowAssignDialog(false);
      setSelectedRoute("");
      setSelectedAgent("");
      setAdminNotes("");
      fetchData();
    } catch (error) {
      console.error('Error assigning route:', error);
      toast({
        title: "Error",
        description: "Failed to assign route",
        variant: "destructive",
      });
    }
  };

  const cancelAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('route_assignments')
        .update({ status: 'cancelled' })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Route assignment cancelled",
      });

      fetchData();
    } catch (error) {
      console.error('Error cancelling assignment:', error);
      toast({
        title: "Error",
        description: "Failed to cancel assignment",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Badge className="bg-blue-500 text-white">Assigned</Badge>;
      case 'accepted':
        return <Badge className="bg-yellow-500 text-white">Accepted</Badge>;
      case 'started':
        return <Badge className="bg-green-500 text-white">On Route</Badge>;
      case 'finished':
        return <Badge className="bg-gray-500 text-white">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Clock className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'started':
        return <Play className="w-4 h-4" />;
      case 'finished':
        return <StopCircle className="w-4 h-4" />;
      case 'cancelled':
        return <X className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
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

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = 
      assignment.route_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.routes?.route_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.agent?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.agent?.agent_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || assignment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading route assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Route Assignment Management</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Assign routes to agents, track delivery status, and monitor performance</p>
        </div>
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 w-full sm:w-auto"
              disabled={routes.length === 0 || agents.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Assign Route</span>
              <span className="sm:hidden">Assign</span>
              {routes.length === 0 && <span className="ml-2 text-xs">(No Routes)</span>}
              {agents.length === 0 && <span className="ml-2 text-xs">(No Agents)</span>}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Route to Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="route">Route</Label>
                <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                  <SelectTrigger>
                    <SelectValue placeholder={routes.length > 0 ? "Select a route" : "No routes available"} />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.length > 0 ? (
                      routes.map((route) => (
                        <SelectItem key={route.id} value={route.route_code}>
                          {route.route_name} ({route.route_code})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No routes available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {routes.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    Please create routes in Route Management first
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="agent">Agent</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder={agents.length > 0 ? "Select an agent" : "No agents available"} />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.length > 0 ? (
                      agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.agent_id}>
                          {agent.full_name} ({agent.agent_id})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No agents available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {agents.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    Please create agent accounts first
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="notes">Admin Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="Any special instructions..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={assignRoute} 
                  className="flex-1"
                  disabled={routes.length === 0 || agents.length === 0}
                >
                  Assign Route
                </Button>
                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{assignments.length}</p>
            <p className="text-xs text-muted-foreground">Total Assignments</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-blue-500">{assignments.filter(a => a.status === 'assigned').length}</p>
            <p className="text-xs text-muted-foreground">Assigned</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-yellow-500">{assignments.filter(a => a.status === 'accepted').length}</p>
            <p className="text-xs text-muted-foreground">Accepted</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-green-500">{assignments.filter(a => a.status === 'started').length}</p>
            <p className="text-xs text-muted-foreground">On Route</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-500">{assignments.filter(a => a.status === 'finished').length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6 bg-gradient-card shadow-card border-border/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by route ID, route name, or agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="started">On Route</SelectItem>
                <SelectItem value="finished">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Assignments List */}
      <Card className="bg-gradient-card shadow-card border-border/50">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Route Assignments</h3>
          <div className="space-y-4">
            {filteredAssignments.map((assignment) => (
              <div key={assignment.id} className="p-4 rounded-lg bg-background/50 border border-border/30 hover:bg-background/70 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      {getStatusIcon(assignment.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-base font-semibold text-foreground">{assignment.route_id}</h4>
                        {getStatusBadge(assignment.status)}
                        <Badge variant="outline" className="text-xs">
                          {assignment.routes?.route_name} ({assignment.routes?.route_code})
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Agent</p>
                          <p className="text-foreground font-medium truncate">{assignment.agent?.full_name}</p>
                          <p className="text-foreground text-muted-foreground">{assignment.agent?.agent_id}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Assigned</p>
                          <p className="text-foreground">{formatDateTime(assignment.assigned_time)}</p>
                          {assignment.accepted_time && (
                            <p className="text-foreground">Accepted: {formatDateTime(assignment.accepted_time)}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Performance</p>
                          <p className="text-foreground">Visited: {assignment.customers_visited}</p>
                          <p className="text-foreground">Orders: {assignment.total_orders}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Collections</p>
                          <p className="text-foreground">Cash: {formatCurrency(assignment.cash_collected)}</p>
                          <p className="text-foreground">UPI: {formatCurrency(assignment.upi_collected)}</p>
                        </div>
                      </div>
                      
                      {assignment.admin_notes && (
                        <div className="mt-2">
                          <p className="text-muted-foreground text-xs">Admin Notes:</p>
                          <p className="text-foreground text-xs">{assignment.admin_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    {assignment.status === 'assigned' && (
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => cancelAssignment(assignment.id)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs">
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredAssignments.length === 0 && (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No route assignments found</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
} 