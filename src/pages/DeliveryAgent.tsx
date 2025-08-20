import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Plus, 
  MapPin, 
  Truck, 
  Package, 
  CreditCard, 
  Navigation,
  User,
  Store,
  Phone,
  Receipt,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  Play,
  StopCircle,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AgentDashboard from "@/components/delivery/AgentDashboard";
import RouteOverview from "@/components/delivery/RouteOverview";
import CustomersList from "@/components/delivery/CustomersList";
import StockManagement from "@/components/delivery/StockManagement";
import QuickBilling from "@/components/delivery/QuickBilling";
import OrdersToDeliver from "@/components/delivery/OrdersToDeliver";

export default function DeliveryAgent() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [agentInfo, setAgentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [routeAssignment, setRouteAssignment] = useState<any>(null);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [openingStock, setOpeningStock] = useState<{[key: string]: number}>({});
  const [closingStock, setClosingStock] = useState<{[key: string]: number}>({});
  const [agentNotes, setAgentNotes] = useState("");
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchAgentInfo = async () => {
      if (!profile) return;

      try {
        // Extract route code from agent_id (e.g., "AGT-97555" -> "97555")
        const routeCodeFromAgent = profile.agent_id?.split('-')[1] || '';
        
        // Get the agent's route information
        const { data: routeData, error: routeError } = await supabase
          .from('routes')
          .select('*')
          .eq('route_code', routeCodeFromAgent)
          .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no route is found

        if (routeError) {
          console.error('Error fetching route:', routeError);
        }

        // Check for active route assignments
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('route_assignments')
          .select(`
            *,
            routes (route_name, route_code)
          `)
          .eq('agent_id', profile.agent_id)
          .in('status', ['assigned', 'accepted', 'started'])
          .order('assigned_date', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle() to handle no results gracefully

        if (assignmentError) {
          console.error('Error fetching route assignment:', assignmentError);
        }

        setRouteAssignment(assignmentData);

        setAgentInfo({
          name: profile.full_name || 'Unknown Agent',
          id: profile.agent_id || 'AGT-000',
          uuid: profile.id, // Add the UUID for database queries
          route: routeData?.route_code || 'Unknown Route',
          routeName: routeData?.route_name || 'Unknown Route',
          phone: profile.phone || '+91 00000 00000',
          routeData: routeData
        });
      } catch (error) {
        console.error('Error fetching agent info:', error);
        toast({
          title: "Error",
          description: "Failed to load agent information",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAgentInfo();
  }, [profile, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading agent information...</p>
        </div>
      </div>
    );
  }

  const acceptRoute = async () => {
    if (!routeAssignment) return;

    try {
      const { error } = await supabase
        .from('route_assignments')
        .update({ 
          status: 'accepted',
          accepted_time: new Date().toISOString()
        })
        .eq('id', routeAssignment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Route accepted successfully",
      });

      setRouteAssignment({ ...routeAssignment, status: 'accepted', accepted_time: new Date().toISOString() });
      setShowAcceptDialog(false);
    } catch (error) {
      console.error('Error accepting route:', error);
      toast({
        title: "Error",
        description: "Failed to accept route",
        variant: "destructive",
      });
    }
  };

  const startRoute = async () => {
    if (!routeAssignment) return;

    try {
      const { error } = await supabase
        .from('route_assignments')
        .update({ 
          status: 'started',
          started_time: new Date().toISOString(),
          opening_stock: openingStock
        })
        .eq('id', routeAssignment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Route started successfully",
      });

      setRouteAssignment({ 
        ...routeAssignment, 
        status: 'started', 
        started_time: new Date().toISOString(),
        opening_stock: openingStock
      });
      setShowStartDialog(false);
    } catch (error) {
      console.error('Error starting route:', error);
      toast({
        title: "Error",
        description: "Failed to start route",
        variant: "destructive",
      });
    }
  };

  const finishRoute = async () => {
    if (!routeAssignment) return;

    try {
      const { error } = await supabase
        .from('route_assignments')
        .update({ 
          status: 'finished',
          finished_time: new Date().toISOString(),
          closing_stock: closingStock,
          agent_notes: agentNotes || null
        })
        .eq('id', routeAssignment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Route finished successfully",
      });

      setRouteAssignment({ 
        ...routeAssignment, 
        status: 'finished', 
        finished_time: new Date().toISOString(),
        closing_stock: closingStock,
        agent_notes: agentNotes
      });
      setShowFinishDialog(false);
    } catch (error) {
      console.error('Error finishing route:', error);
      toast({
        title: "Error",
        description: "Failed to finish route",
        variant: "destructive",
      });
    }
  };

  if (!agentInfo) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Unable to load agent information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-3xl font-bold text-foreground">Delivery Agent Portal</h2>
          <p className="text-sm sm:text-base text-muted-foreground truncate">Welcome, {agentInfo.name} - {agentInfo.route}</p>
          {routeAssignment && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                Route ID: {routeAssignment.route_id}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {routeAssignment.routes?.route_name}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {!routeAssignment ? (
            <Badge className="bg-gray-500 text-white justify-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              No Route Assigned
            </Badge>
          ) : routeAssignment.status === 'assigned' ? (
            <Button 
              onClick={() => setShowAcceptDialog(true)}
              className="bg-yellow-500 text-white hover:bg-yellow-600 justify-center"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Accept Route
            </Button>
          ) : routeAssignment.status === 'accepted' ? (
            <Button 
              onClick={() => setShowStartDialog(true)}
              className="bg-green-500 text-white hover:bg-green-600 justify-center"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Route
            </Button>
          ) : routeAssignment.status === 'started' ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Badge className="bg-green-500 text-white justify-center">
                <Play className="w-4 h-4 mr-1" />
                On Route
              </Badge>
              <Button 
                onClick={() => setShowFinishDialog(true)}
                className="bg-red-500 text-white hover:bg-red-600 justify-center"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Finish Route
              </Button>
            </div>
          ) : (
            <Badge className="bg-gray-500 text-white justify-center">
              <StopCircle className="w-4 h-4 mr-1" />
              Route Completed
            </Badge>
          )}
          
          {routeAssignment && routeAssignment.status === 'started' && (
            <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 justify-center">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Quick Bill</span>
              <span className="sm:hidden">Bill</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid grid-cols-6 w-full bg-card border border-border">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm px-1 sm:px-3">
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Home</span>
          </TabsTrigger>
          <TabsTrigger value="route" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm px-1 sm:px-3">
            Route
          </TabsTrigger>
          <TabsTrigger value="customers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm px-1 sm:px-3">
            <span className="hidden sm:inline">Customers</span>
            <span className="sm:hidden">Cust.</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm px-1 sm:px-3">
            <span className="hidden sm:inline">Route Orders</span>
            <span className="sm:hidden">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="stock" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm px-1 sm:px-3">
            Stock
          </TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm px-1 sm:px-3">
            <span className="hidden sm:inline">Quick Bill</span>
            <span className="sm:hidden">Bill</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          {routeAssignment && routeAssignment.status !== 'assigned' ? (
            <AgentDashboard agentInfo={agentInfo} />
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Active Route</h3>
              <p className="text-muted-foreground">
                {routeAssignment ? 
                  "Please accept the assigned route to view dashboard data." : 
                  "No route has been assigned to you yet."
                }
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="route">
          {routeAssignment && routeAssignment.status !== 'assigned' ? (
            <RouteOverview agentInfo={agentInfo} />
          ) : (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Route Not Available</h3>
              <p className="text-muted-foreground">
                {routeAssignment ? 
                  "Please accept the assigned route to view route details." : 
                  "No route has been assigned to you yet."
                }
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="customers">
          {routeAssignment && routeAssignment.status !== 'assigned' ? (
            <CustomersList route={agentInfo.route} />
          ) : (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Customers Not Available</h3>
              <p className="text-muted-foreground">
                {routeAssignment ? 
                  "Please accept the assigned route to view customer list." : 
                  "No route has been assigned to you yet."
                }
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders">
          {routeAssignment && routeAssignment.status !== 'assigned' ? (
            <OrdersToDeliver route={agentInfo.route} routeAssignment={routeAssignment} agentInfo={agentInfo} />
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Orders Not Available</h3>
              <p className="text-muted-foreground">
                {routeAssignment ? 
                  "Please accept the assigned route to view orders." : 
                  "No route has been assigned to you yet."
                }
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stock">
          {routeAssignment && routeAssignment.status !== 'assigned' ? (
            <StockManagement agentId={agentInfo.id} routeAssignment={routeAssignment} />
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Stock Not Available</h3>
              <p className="text-muted-foreground">
                {routeAssignment ? 
                  "Please accept the assigned route to view stock management." : 
                  "No route has been assigned to you yet."
                }
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="billing">
          {routeAssignment && routeAssignment.status === 'started' ? (
            <QuickBilling agentInfo={agentInfo} routeAssignment={routeAssignment} />
          ) : (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Billing Not Available</h3>
              <p className="text-muted-foreground">
                {routeAssignment && routeAssignment.status === 'accepted' ? 
                  "Please start the route to access billing features." : 
                  routeAssignment ? 
                    "Please accept the assigned route to access billing." : 
                    "No route has been assigned to you yet."
                }
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Accept Route Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent className="w-[95vw] max-w-md mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Accept Route Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-foreground text-sm sm:text-base">
                You have been assigned route <strong>{routeAssignment?.routes?.route_name}</strong> 
                (ID: {routeAssignment?.route_id})
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Please review the route details and accept to proceed.
              </p>
            </div>
            {routeAssignment?.admin_notes && (
              <div>
                <Label>Admin Notes</Label>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {routeAssignment.admin_notes}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={acceptRoute} className="flex-1">
                Accept Route
              </Button>
              <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Start Route Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Start Route - Opening Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <Play className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-foreground">
                Please enter the opening stock for route <strong>{routeAssignment?.routes?.route_name}</strong>
              </p>
            </div>
            
            <div className="space-y-3">
              <Label>Opening Stock (Quantity)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="led-bulb" className="text-xs">LED Bulb 9W</Label>
                  <Input
                    id="led-bulb"
                    type="number"
                    min="0"
                    value={openingStock['PROD-001'] || ''}
                    onChange={(e) => setOpeningStock({
                      ...openingStock,
                      'PROD-001': parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="switch-board" className="text-xs">Switch Board</Label>
                  <Input
                    id="switch-board"
                    type="number"
                    min="0"
                    value={openingStock['PROD-002'] || ''}
                    onChange={(e) => setOpeningStock({
                      ...openingStock,
                      'PROD-002': parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="wire" className="text-xs">Wire 1.5mm</Label>
                  <Input
                    id="wire"
                    type="number"
                    min="0"
                    value={openingStock['PROD-003'] || ''}
                    onChange={(e) => setOpeningStock({
                      ...openingStock,
                      'PROD-003': parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="mcb" className="text-xs">MCB 16A</Label>
                  <Input
                    id="mcb"
                    type="number"
                    min="0"
                    value={openingStock['PROD-004'] || ''}
                    onChange={(e) => setOpeningStock({
                      ...openingStock,
                      'PROD-004': parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="socket" className="text-xs">Socket 5A</Label>
                  <Input
                    id="socket"
                    type="number"
                    min="0"
                    value={openingStock['PROD-005'] || ''}
                    onChange={(e) => setOpeningStock({
                      ...openingStock,
                      'PROD-005': parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={startRoute} className="flex-1">
                Start Route
              </Button>
              <Button variant="outline" onClick={() => setShowStartDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Finish Route Dialog */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Finish Route - Closing Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <StopCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-foreground">
                Please enter the closing stock for route <strong>{routeAssignment?.routes?.route_name}</strong>
              </p>
            </div>
            
            <div className="space-y-3">
              <Label>Closing Stock (Quantity)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="led-bulb-close" className="text-xs">LED Bulb 9W</Label>
                  <Input
                    id="led-bulb-close"
                    type="number"
                    min="0"
                    value={closingStock['PROD-001'] || ''}
                    onChange={(e) => setClosingStock({
                      ...closingStock,
                      'PROD-001': parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="switch-board-close" className="text-xs">Switch Board</Label>
                  <Input
                    id="switch-board-close"
                    type="number"
                    min="0"
                    value={closingStock['PROD-002'] || ''}
                    onChange={(e) => setClosingStock({
                      ...closingStock,
                      'PROD-002': parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="wire-close" className="text-xs">Wire 1.5mm</Label>
                  <Input
                    id="wire-close"
                    type="number"
                    min="0"
                    value={closingStock['PROD-003'] || ''}
                    onChange={(e) => setClosingStock({
                      ...closingStock,
                      'PROD-003': parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="mcb-close" className="text-xs">MCB 16A</Label>
                  <Input
                    id="mcb-close"
                    type="number"
                    min="0"
                    value={closingStock['PROD-004'] || ''}
                    onChange={(e) => setClosingStock({
                      ...closingStock,
                      'PROD-004': parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="socket-close" className="text-xs">Socket 5A</Label>
                  <Input
                    id="socket-close"
                    type="number"
                    min="0"
                    value={closingStock['PROD-005'] || ''}
                    onChange={(e) => setClosingStock({
                      ...closingStock,
                      'PROD-005': parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="agent-notes">Route Notes (Optional)</Label>
              <Textarea
                id="agent-notes"
                placeholder="Any notes about the route..."
                value={agentNotes}
                onChange={(e) => setAgentNotes(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={finishRoute} className="flex-1">
                Finish Route
              </Button>
              <Button variant="outline" onClick={() => setShowFinishDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}