import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Calendar,
  LayoutDashboard,
  FileText,
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  Truck,
  MapPin,
  Users,
  Receipt
} from "lucide-react";
import { useCompanySettingsContext } from "@/contexts/CompanySettingsContext";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Orders", url: "/orders", icon: Receipt },
  { title: "Invoices", url: "/invoices", icon: FileText },
  { title: "Customers", url: "/customers", icon: Search },
  { title: "Products", url: "/products", icon: Plus },
  { title: "Route Management", url: "/route-management", icon: MapPin },
  { title: "Assign Route", url: "/route-assignment", icon: Users },
  { title: "Reports", url: "/reports", icon: Calendar },
  { title: "Settings", url: "/settings", icon: Plus },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const [isMainExpanded, setIsMainExpanded] = useState(true);
  const { settings } = useCompanySettingsContext();

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-sidebar-accent text-sidebar-primary font-medium" 
      : "hover:bg-sidebar-accent/50 text-sidebar-foreground";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <div className="p-4 border-b border-sidebar-border">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-sidebar-foreground">{settings?.company_name || 'BillMate'}</h2>
              <p className="text-xs text-muted-foreground">Billing Hub</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
      </div>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <div className="flex items-center justify-between px-2 py-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground font-medium">
                Main Menu
              </SidebarGroupLabel>
            )}
            {!collapsed && (
              <button
                onClick={() => setIsMainExpanded(!isMainExpanded)}
                className="p-1 hover:bg-sidebar-accent rounded"
              >
                {isMainExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>

          {(collapsed || isMainExpanded) && (
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end={item.url === "/"} 
                        className={getNavCls}
                      >
                        <item.icon className="w-5 h-5 mr-3" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {!collapsed && (
          <div className="mt-auto p-4 border-t border-sidebar-border">
            <div className="text-xs text-muted-foreground">
              <p>Version 1.0.0</p>
              <p>© 2025 {settings?.company_name || 'BillMate'}</p>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}