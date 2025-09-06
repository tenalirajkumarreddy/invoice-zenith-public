import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Truck, User, Settings, LogOut, AlertTriangle, CheckCircle, Play, StopCircle } from "lucide-react";
import { useCompanySettingsContext } from "@/contexts/CompanySettingsContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AgentLayoutProps {
  children: React.ReactNode;
}

export default function AgentLayout({ children }: AgentLayoutProps) {
  const { profile, signOut } = useAuth();
  const { settings } = useCompanySettingsContext();
  const [routeAssignment, setRouteAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchRouteAssignment = async () => {
      if (!profile?.agent_id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('route_assignments')
          .select(`
            *,
            routes (route_name, route_code)
          `)
          .eq('agent_id', profile.agent_id)
          .in('status', ['assigned', 'accepted', 'started'])
          .order('assigned_date', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching route assignment:', error);
        }

        setRouteAssignment(data);
      } catch (error) {
        console.error('Error fetching route assignment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRouteAssignment();
  }, [profile?.agent_id]);

  const getStatusBadge = () => {
    if (loading) {
      return (
        <Badge className="bg-gray-500 text-white">
          <div className="w-4 h-4 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Loading...
        </Badge>
      );
    }

    if (!routeAssignment) {
      return (
        <Badge className="bg-gray-500 text-white">
          <AlertTriangle className="w-4 h-4 mr-1" />
          No Route
        </Badge>
      );
    }

    switch (routeAssignment.status) {
      case 'assigned':
        return (
          <Badge className="bg-blue-500 text-white">
            <CheckCircle className="w-4 h-4 mr-1" />
            Assigned
          </Badge>
        );
      case 'accepted':
        return (
          <Badge className="bg-yellow-500 text-white">
            <CheckCircle className="w-4 h-4 mr-1" />
            Accepted
          </Badge>
        );
      case 'started':
        return (
          <Badge className="bg-green-500 text-white">
            <Play className="w-4 h-4 mr-1" />
            On Route
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500 text-white">
            <StopCircle className="w-4 h-4 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/auth';
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Agent Header */}
      <header className="h-16 border-b border-border bg-card/50 flex items-center px-4 sm:px-6">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-foreground truncate">
              {settings?.company_name || 'InvoiceZenith'} - Agent Portal
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Delivery Management System</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <div className="hidden sm:block">
            {getStatusBadge()}
          </div>
          
          {routeAssignment && (
            <Badge variant="outline" className="text-xs hidden md:inline-flex">
              {routeAssignment.route_id}
            </Badge>
          )}
          
          <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span className="truncate max-w-[150px]">{profile?.full_name} ({profile?.agent_id})</span>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      
      <main className="p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}