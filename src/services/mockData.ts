// Mock data service to replace Supabase
export const mockData = {
  // Sample customers data
  customers: [
    {
      id: '1',
      customer_id: 'CUST-001',
      name: 'John Doe',
      shop_name: 'John\'s Electronics Store',
      phone: '+91 98765 43210',
      email: 'john@electronics.com',
      address: '123 Main Street, Downtown',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      route_id: 'route-1',
      balance: 1500.00,
      outstanding: 2500.00,
      total_orders: 25,
      is_active: true,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-12-01T10:00:00Z'
    },
    {
      id: '2',
      customer_id: 'CUST-002',
      name: 'Sarah Smith',
      shop_name: 'Smith Hardware Store',
      phone: '+91 87654 32109',
      email: 'sarah@hardware.com',
      address: '456 Business District',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      route_id: 'route-2',
      balance: 750.00,
      outstanding: 1200.00,
      total_orders: 18,
      is_active: true,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-12-01T10:00:00Z'
    },
    {
      id: '3',
      customer_id: 'CUST-003',
      name: 'Mike Johnson',
      shop_name: 'Johnson\'s General Store',
      phone: '+91 76543 21098',
      email: 'mike@general.com',
      address: '789 Market Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      route_id: 'route-1',
      balance: 0.00,
      outstanding: 800.00,
      total_orders: 12,
      is_active: true,
      created_at: '2024-02-01T10:00:00Z',
      updated_at: '2024-12-01T10:00:00Z'
    }
  ],

  // Sample products data
  products: [
    {
      id: '1',
      product_code: 'PROD-001',
      name: 'Electrical Switch',
      description: 'High quality electrical switch',
      category: 'Electrical',
      unit_price: 25.00,
      cost_price: 18.00,
      tax_rate: 18.00,
      stock_quantity: 100,
      is_active: true,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-12-01T10:00:00Z'
    },
    {
      id: '2',
      product_code: 'PROD-002',
      name: 'LED Bulb 9W',
      description: 'Energy efficient LED bulb',
      category: 'Lighting',
      unit_price: 120.00,
      cost_price: 85.00,
      tax_rate: 18.00,
      stock_quantity: 75,
      is_active: true,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-12-01T10:00:00Z'
    },
    {
      id: '3',
      product_code: 'PROD-003',
      name: 'Copper Wire 2.5mm',
      description: 'Pure copper electrical wire',
      category: 'Electrical',
      unit_price: 180.00,
      cost_price: 140.00,
      tax_rate: 18.00,
      stock_quantity: 50,
      is_active: true,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-12-01T10:00:00Z'
    },
    {
      id: '4',
      product_code: 'PROD-004',
      name: 'MCB 16A',
      description: 'Miniature Circuit Breaker',
      category: 'Electrical',
      unit_price: 85.00,
      cost_price: 55.00,
      tax_rate: 18.00,
      stock_quantity: 30,
      is_active: true,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-12-01T10:00:00Z'
    }
  ],

  // Sample routes data
  routes: [
    {
      id: '1',
      route_code: 'R001',
      route_name: 'Downtown Area',
      description: 'Central business district and shopping areas',
      is_active: true,
      created_at: '2024-01-01T10:00:00Z'
    },
    {
      id: '2',
      route_code: 'R002',
      route_name: 'Industrial Zone',
      description: 'Manufacturing and industrial area',
      is_active: true,
      created_at: '2024-01-01T10:00:00Z'
    },
    {
      id: '3',
      route_code: 'R003',
      route_name: 'Residential Area',
      description: 'Housing societies and apartment complexes',
      is_active: true,
      created_at: '2024-01-01T10:00:00Z'
    }
  ],

  // Sample invoices data
  invoices: [
    {
      id: '1',
      invoice_number: 'INV-2024-001',
      customer_id: '1',
      total_amount: 1250.00,
      payment_amount: 1250.00,
      cash_amount: 750.00,
      upi_amount: 500.00,
      balance_amount: 0.00,
      payment_status: 'paid',
      payment_mode: 'mixed',
      invoice_date: '2024-12-01',
      created_at: '2024-12-01T10:00:00Z',
      customers: {
        name: 'John Doe',
        shop_name: 'John\'s Electronics Store'
      }
    },
    {
      id: '2',
      invoice_number: 'INV-2024-002',
      customer_id: '2',
      total_amount: 850.00,
      payment_amount: 400.00,
      cash_amount: 400.00,
      upi_amount: 0.00,
      balance_amount: 0.00,
      payment_status: 'partial',
      payment_mode: 'cash',
      invoice_date: '2024-12-01',
      created_at: '2024-12-01T11:00:00Z',
      customers: {
        name: 'Sarah Smith',
        shop_name: 'Smith Hardware Store'
      }
    },
    {
      id: '3',
      invoice_number: 'INV-2024-003',
      customer_id: '3',
      total_amount: 600.00,
      payment_amount: 0.00,
      cash_amount: 0.00,
      upi_amount: 0.00,
      balance_amount: 0.00,
      payment_status: 'pending',
      payment_mode: null,
      invoice_date: '2024-12-02',
      created_at: '2024-12-02T09:00:00Z',
      customers: {
        name: 'Mike Johnson',
        shop_name: 'Johnson\'s General Store'
      }
    }
  ],

  // Sample orders data
  orders: [
    {
      id: '1',
      order_number: 'ORD-2024-001',
      customer_id: '1',
      total_amount: 1250.00,
      status: 'delivered',
      order_date: '2024-12-01',
      created_at: '2024-12-01T10:00:00Z',
      customers: {
        shop_name: 'John\'s Electronics Store'
      }
    },
    {
      id: '2',
      order_number: 'ORD-2024-002',
      customer_id: '2',
      total_amount: 850.00,
      status: 'processing',
      order_date: '2024-12-01',
      created_at: '2024-12-01T11:00:00Z',
      customers: {
        shop_name: 'Smith Hardware Store'
      }
    }
  ],

  // Company settings
  company_settings: [
    {
      id: '1',
      company_name: 'Invoice Zenith Billing Hub',
      gst_number: '27AAAPL1234C1Z5',
      business_address: '123, Business Complex, Mumbai - 400001',
      phone: '+91 98765 43210',
      email: 'billing@invoicezenith.com',
      invoice_prefix: 'INV-2024-',
      next_invoice_number: 4,
      default_tax_rate: 18.00,
      payment_terms_days: 30,
      currency: 'INR',
      bank_name: 'State Bank of India',
      account_number: '1234567890123456',
      ifsc_code: 'SBIN0001234',
      account_holder_name: 'Invoice Zenith Billing Hub',
      is_active: true,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-12-01T10:00:00Z'
    }
  ]
};

// Mock API functions to simulate Supabase operations
export const mockSupabase = {
  from: (table: string) => ({
    select: (columns: string = '*') => ({
      eq: (column: string, value: any) => ({
        data: mockData[table as keyof typeof mockData]?.filter((item: any) => item[column] === value) || [],
        error: null
      }),
      order: (column: string, options?: { ascending: boolean }) => ({
        data: [...(mockData[table as keyof typeof mockData] || [])].sort((a: any, b: any) => {
          const aVal = a[column];
          const bVal = b[column];
          if (options?.ascending === false) {
            return bVal > aVal ? 1 : -1;
          }
          return aVal > bVal ? 1 : -1;
        }),
        error: null
      }),
      limit: (count: number) => ({
        data: (mockData[table as keyof typeof mockData] || []).slice(0, count),
        error: null
      }),
      data: mockData[table as keyof typeof mockData] || [],
      error: null
    }),
    insert: (data: any) => ({
      data: [{ ...data, id: Date.now().toString() }],
      error: null
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        data: [data],
        error: null
      })
    }),
    delete: () => ({
      eq: (column: string, value: any) => ({
        data: null,
        error: null
      })
    })
  })
};
