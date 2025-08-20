export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_stock: {
        Row: {
          agent_id: string
          delivered_quantity: number
          id: string
          loaded_quantity: number
          product_id: string
          remaining_quantity: number | null
          stock_date: string
        }
        Insert: {
          agent_id: string
          delivered_quantity?: number
          id?: string
          loaded_quantity?: number
          product_id: string
          remaining_quantity?: number | null
          stock_date?: string
        }
        Update: {
          agent_id?: string
          delivered_quantity?: number
          id?: string
          loaded_quantity?: number
          product_id?: string
          remaining_quantity?: number | null
          stock_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_stock_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          bank_name: string | null
          business_address: string | null
          company_name: string
          created_at: string
          currency: string
          default_tax_rate: number
          email: string | null
          gst_enabled: boolean
          gst_number: string | null
          id: string
          ifsc_code: string | null
          invoice_prefix: string
          is_active: boolean
          logo_url: string | null
          next_invoice_number: number
          next_order_number: number
          order_prefix: string
          payment_terms_days: number
          phone: string | null
          signature_url: string | null
          updated_at: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          business_address?: string | null
          company_name?: string
          created_at?: string
          currency?: string
          default_tax_rate?: number
          email?: string | null
          gst_enabled?: boolean
          gst_number?: string | null
          id?: string
          ifsc_code?: string | null
          invoice_prefix?: string
          is_active?: boolean
          logo_url?: string | null
          next_invoice_number?: number
          next_order_number?: number
          order_prefix?: string
          payment_terms_days?: number
          phone?: string | null
          signature_url?: string | null
          updated_at?: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          business_address?: string | null
          company_name?: string
          created_at?: string
          currency?: string
          default_tax_rate?: number
          email?: string | null
          gst_enabled?: boolean
          gst_number?: string | null
          id?: string
          ifsc_code?: string | null
          invoice_prefix?: string
          is_active?: boolean
          logo_url?: string | null
          next_invoice_number?: number
          next_order_number?: number
          order_prefix?: string
          payment_terms_days?: number
          phone?: string | null
          signature_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string
          balance: number
          created_at: string
          customer_id: string
          id: string
          is_active: boolean
          name: string
          outstanding: number
          phone: string
          pincode: string
          profile_pic_url: string | null
          route_id: string | null
          shop_name: string
          shop_pic_url: string | null
          total_orders: number
          updated_at: string
        }
        Insert: {
          address: string
          balance?: number
          created_at?: string
          customer_id: string
          id?: string
          is_active?: boolean
          name: string
          outstanding?: number
          phone: string
          pincode: string
          profile_pic_url?: string | null
          route_id?: string | null
          shop_name: string
          shop_pic_url?: string | null
          total_orders?: number
          updated_at?: string
        }
        Update: {
          address?: string
          balance?: number
          created_at?: string
          customer_id?: string
          id?: string
          is_active?: boolean
          name?: string
          outstanding?: number
          phone?: string
          pincode?: string
          profile_pic_url?: string | null
          route_id?: string | null
          shop_name?: string
          shop_pic_url?: string | null
          total_orders?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_invoices: {
        Row: {
          agent_id: string
          customer_id: string
          deleted_at: string
          deleted_by: string | null
          id: string
          invoice_date: string
          invoice_number: string
          original_data: Json
          original_invoice_id: string
          reason: string | null
          total_amount: number
        }
        Insert: {
          agent_id: string
          customer_id: string
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          original_data: Json
          original_invoice_id: string
          reason?: string | null
          total_amount?: number
        }
        Update: {
          agent_id?: string
          customer_id?: string
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          original_data?: Json
          original_invoice_id?: string
          reason?: string | null
          total_amount?: number
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          invoice_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          id?: string
          invoice_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          agent_id: string
          balance_amount: number
          cash_amount: number
          created_at: string
          customer_id: string
          discount: number
          id: string
          invoice_date: string
          invoice_number: string
          order_id: string | null
          payment_amount: number
          payment_mode: string | null
          payment_status: string
          source: string | null
          status: string | null
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
          upi_amount: number
        }
        Insert: {
          agent_id: string
          balance_amount?: number
          cash_amount?: number
          created_at?: string
          customer_id: string
          discount?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          order_id?: string | null
          payment_amount?: number
          payment_mode?: string | null
          payment_status?: string
          source?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          upi_amount?: number
        }
        Update: {
          agent_id?: string
          balance_amount?: number
          cash_amount?: number
          created_at?: string
          customer_id?: string
          discount?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          order_id?: string | null
          payment_amount?: number
          payment_mode?: string | null
          payment_status?: string
          source?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          upi_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_route_assignments: {
        Row: {
          assigned_date: string
          id: string
          order_id: string
          route_assignment_id: string
        }
        Insert: {
          assigned_date?: string
          id?: string
          order_id: string
          route_assignment_id: string
        }
        Update: {
          assigned_date?: string
          id?: string
          order_id?: string
          route_assignment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_route_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_route_assignments_route_assignment_id_fkey"
            columns: ["route_assignment_id"]
            isOneToOne: false
            referencedRelation: "route_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          agent_id: string | null
          assigned_date: string | null
          created_at: string
          customer_id: string
          customer_notes: string | null
          delivery_date: string | null
          id: string
          invoice_status: string | null
          is_priority: boolean
          items: Json
          order_date: string
          order_number: string
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          agent_id?: string | null
          assigned_date?: string | null
          created_at?: string
          customer_id: string
          customer_notes?: string | null
          delivery_date?: string | null
          id?: string
          invoice_status?: string | null
          is_priority?: boolean
          items: Json
          order_date?: string
          order_number: string
          status?: string
          subtotal: number
          tax_amount: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          agent_id?: string | null
          assigned_date?: string | null
          created_at?: string
          customer_id?: string
          customer_notes?: string | null
          delivery_date?: string | null
          id?: string
          invoice_status?: string | null
          is_priority?: boolean
          items?: Json
          order_date?: string
          order_number?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          price: number
          product_code: string
          unit: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price: number
          product_code: string
          unit?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          product_code?: string
          unit?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agent_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      route_assignments: {
        Row: {
          accepted_time: string | null
          admin_notes: string | null
          agent_id: string
          agent_notes: string | null
          assigned_by: string | null
          assigned_date: string
          assigned_time: string
          balance_used: number | null
          cash_collected: number | null
          closing_stock: Json | null
          created_at: string
          customers_visited: number | null
          customers_with_orders: number | null
          finished_time: string | null
          id: string
          opening_stock: Json | null
          pending_amount: number | null
          route_code: string
          route_id: string
          started_time: string | null
          status: string
          total_collected: number | null
          total_orders: number | null
          updated_at: string
          upi_collected: number | null
        }
        Insert: {
          accepted_time?: string | null
          admin_notes?: string | null
          agent_id: string
          agent_notes?: string | null
          assigned_by?: string | null
          assigned_date?: string
          assigned_time?: string
          balance_used?: number | null
          cash_collected?: number | null
          closing_stock?: Json | null
          created_at?: string
          customers_visited?: number | null
          customers_with_orders?: number | null
          finished_time?: string | null
          id?: string
          opening_stock?: Json | null
          pending_amount?: number | null
          route_code: string
          route_id: string
          started_time?: string | null
          status?: string
          total_collected?: number | null
          total_orders?: number | null
          updated_at?: string
          upi_collected?: number | null
        }
        Update: {
          accepted_time?: string | null
          admin_notes?: string | null
          agent_id?: string
          agent_notes?: string | null
          assigned_by?: string | null
          assigned_date?: string
          assigned_time?: string
          balance_used?: number | null
          cash_collected?: number | null
          closing_stock?: Json | null
          created_at?: string
          customers_visited?: number | null
          customers_with_orders?: number | null
          finished_time?: string | null
          id?: string
          opening_stock?: Json | null
          pending_amount?: number | null
          route_code?: string
          route_id?: string
          started_time?: string | null
          status?: string
          total_collected?: number | null
          total_orders?: number | null
          updated_at?: string
          upi_collected?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "route_assignments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "route_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "route_assignments_route_code_fkey"
            columns: ["route_code"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["route_code"]
          },
        ]
      }
      route_orders: {
        Row: {
          balance_used: number | null
          cash_amount: number | null
          created_at: string
          customer_id: string
          delivered_time: string | null
          id: string
          items: Json
          notes: string | null
          order_date: string
          order_number: string
          order_time: string
          outstanding_amount: number | null
          payment_method: string | null
          route_assignment_id: string
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
          upi_amount: number | null
        }
        Insert: {
          balance_used?: number | null
          cash_amount?: number | null
          created_at?: string
          customer_id: string
          delivered_time?: string | null
          id?: string
          items: Json
          notes?: string | null
          order_date?: string
          order_number: string
          order_time?: string
          outstanding_amount?: number | null
          payment_method?: string | null
          route_assignment_id: string
          status?: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at?: string
          upi_amount?: number | null
        }
        Update: {
          balance_used?: number | null
          cash_amount?: number | null
          created_at?: string
          customer_id?: string
          delivered_time?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_date?: string
          order_number?: string
          order_time?: string
          outstanding_amount?: number | null
          payment_method?: string | null
          route_assignment_id?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          upi_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "route_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_orders_route_assignment_id_fkey"
            columns: ["route_assignment_id"]
            isOneToOne: false
            referencedRelation: "route_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          pincodes: string[]
          route_code: string
          route_name: string
          route_symbol: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          pincodes?: string[]
          route_code: string
          route_name: string
          route_symbol?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          pincodes?: string[]
          route_code?: string
          route_name?: string
          route_symbol?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_customer_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_route_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_next_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_next_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
