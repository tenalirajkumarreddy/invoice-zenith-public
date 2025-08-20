import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, Phone, Store, Receipt } from "lucide-react";
import CustomerProfile from "./CustomerProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";

interface QuickBillingProps {
  agentInfo: {
    name: string;
    id: string;
    route: string;
    phone: string;
  };
  routeAssignment?: any;
}

export default function QuickBilling({ agentInfo, routeAssignment }: QuickBillingProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, [agentInfo.route]);

  const fetchCustomers = async () => {
    if (!agentInfo?.route) return;

    try {
      setLoading(true);
      
      // Fetch customers for this agent's route
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select(`
          *,
          routes (route_name, route_code)
        `)
        .eq('routes.route_code', agentInfo.route)
        .eq('is_active', true)
        .order('shop_name');

      if (customersError) throw customersError;

      setCustomers(customersData || []);
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

  const performSearch = (term: string) => {
    if (term.length >= 2) {
      setIsSearching(true);
      const results = customers.filter(customer => {
        const searchLower = term.toLowerCase();
        return (
          customer.name.toLowerCase().includes(searchLower) ||
          customer.shop_name.toLowerCase().includes(searchLower) ||
          customer.phone.includes(term) ||
          customer.customer_id.toLowerCase().includes(searchLower)
        );
      });
      setSearchResults(results);
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  const debouncedSearch = useDebounce(performSearch, 300);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    debouncedSearch(term);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (selectedCustomer) {
    return (
      <CustomerProfile 
        customer={selectedCustomer} 
        onBack={() => setSelectedCustomer(null)}
        routeAssignment={routeAssignment}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground">Quick Billing</h3>
          <p className="text-muted-foreground">Search and create bills for any customer</p>
        </div>
      </div>

      {/* Search */}
      <Card className="p-6 bg-gradient-card shadow-card border-border/50">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search by customer name, shop name, phone number, or customer ID..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-12 text-lg py-3"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => handleSearch("")}>
              <User className="w-3 h-3 mr-1" />
              Show All
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSearch("98765")}>
              <Phone className="w-3 h-3 mr-1" />
              Search by Phone
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSearch("C")}>
              <Receipt className="w-3 h-3 mr-1" />
              Search by ID
            </Button>
          </div>
        </div>
      </Card>

      {/* Search Results */}
      {isSearching && (
        <Card className="p-6 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-muted-foreground">Searching customers...</p>
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="p-6 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-muted-foreground">Loading customers...</p>
          </div>
        </Card>
      ) : searchResults.length > 0 ? (
        <Card className="bg-gradient-card shadow-card border-border/50">
          <div className="p-6">
            <h4 className="text-lg font-semibold text-foreground mb-4">
              Search Results ({searchResults.length} found)
            </h4>
            <div className="space-y-3">
              {searchResults.map((customer) => (
                <div 
                  key={customer.id} 
                  className="p-4 rounded-lg bg-background/50 border border-border/30 hover:bg-background/70 transition-colors cursor-pointer"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="font-semibold text-foreground text-lg">{customer.name}</h5>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {customer.customer_id}
                          </span>
                          {(customer.outstanding || 0) > 0 && (
                            <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded">
                              Payment Due
                            </span>
                          )}
                        </div>
                        
                        <p className="text-muted-foreground mb-1">{customer.shop_name}</p>
                        <p className="text-sm text-muted-foreground mb-2">{customer.phone}</p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-success">Credit: {formatCurrency(customer.credit || 0)}</span>
                          <span className="text-warning">Outstanding: {formatCurrency(customer.outstanding || 0)}</span>
                          <span className="text-muted-foreground">Orders: {customer.total_orders || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : searchTerm.length >= 2 ? (
        <Card className="p-6 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-muted-foreground">No customers found matching "{searchTerm}"</p>
          </div>
        </Card>
      ) : customers.length > 0 ? (
        <Card className="bg-gradient-card shadow-card border-border/50">
          <div className="p-6">
            <h4 className="text-lg font-semibold text-foreground mb-4">
              All Customers ({customers.length})
            </h4>
            <div className="space-y-3">
              {customers.map((customer) => (
                <div 
                  key={customer.id} 
                  className="p-4 rounded-lg bg-background/50 border border-border/30 hover:bg-background/70 transition-colors cursor-pointer"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="font-semibold text-foreground text-lg">{customer.name}</h5>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {customer.customer_id}
                          </span>
                          {(customer.outstanding || 0) > 0 && (
                            <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded">
                              Payment Due
                            </span>
                          )}
                        </div>
                        
                        <p className="text-muted-foreground mb-1">{customer.shop_name}</p>
                        <p className="text-sm text-muted-foreground mb-2">{customer.phone}</p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-success">Credit: {formatCurrency(customer.credit || 0)}</span>
                          <span className="text-warning">Outstanding: {formatCurrency(customer.outstanding || 0)}</span>
                          <span className="text-muted-foreground">Orders: {customer.total_orders || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6 bg-gradient-card shadow-card border-border/50">
          <div className="text-center">
            <p className="text-muted-foreground">No customers found for this route</p>
          </div>
        </Card>
      )}
    </div>
  );
}