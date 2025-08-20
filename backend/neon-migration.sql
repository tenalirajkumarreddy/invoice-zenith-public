-- BillMate Database Schema for Neon
-- Migration from Supabase to Neon PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (users/agents)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'agent', 'customer')) DEFAULT 'agent',
    agent_id TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create routes table
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_code TEXT UNIQUE NOT NULL,
    route_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    shop_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    route_id UUID REFERENCES routes(id),
    credit NUMERIC(10,2) DEFAULT 0.00,
    outstanding NUMERIC(10,2) DEFAULT 0.00,
    total_orders INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    price NUMERIC(10,2) NOT NULL,
    cost NUMERIC(10,2),
    stock_quantity INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    agent_id UUID,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    agent_id UUID,
    order_id UUID REFERENCES orders(id),
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    payment_amount NUMERIC(10,2) DEFAULT 0.00,
    cash_amount NUMERIC(10,2) DEFAULT 0.00,
    upi_amount NUMERIC(10,2) DEFAULT 0.00,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
    payment_mode TEXT,
    invoice_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) NOT NULL,
    order_id UUID REFERENCES orders(id),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'credit', 'debit', 'refund')),
    amount NUMERIC(10,2) NOT NULL,
    payment_method TEXT,
    description TEXT,
    reference_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create route_assignments table
CREATE TABLE IF NOT EXISTS route_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES routes(id) NOT NULL,
    route_code TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    assigned_by UUID,
    assigned_date DATE DEFAULT CURRENT_DATE,
    assigned_time TIME DEFAULT CURRENT_TIME,
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'started', 'finished', 'cancelled')),
    cash_collected NUMERIC(10,2) DEFAULT 0.00,
    upi_collected NUMERIC(10,2) DEFAULT 0.00,
    customers_visited INTEGER DEFAULT 0,
    orders_completed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create agent_stock table
CREATE TABLE IF NOT EXISTS agent_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(agent_id, product_id)
);

-- Create company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL DEFAULT 'BillMate Billing Hub',
    address TEXT,
    phone TEXT,
    email TEXT,
    gst_number TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create customer_transactions table
CREATE TABLE IF NOT EXISTS customer_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) NOT NULL,
    invoice_id UUID REFERENCES invoices(id),
    order_id UUID REFERENCES orders(id),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'payment', 'credit', 'debit', 'return')),
    amount NUMERIC(10,2) NOT NULL,
    balance_after NUMERIC(10,2),
    payment_method TEXT,
    description TEXT,
    reference_number TEXT,
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create migration_log table
CREATE TABLE IF NOT EXISTS migration_log (
    id BIGSERIAL PRIMARY KEY,
    migration_name TEXT UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT now(),
    description TEXT,
    performance_impact TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_route_id ON customers(route_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_agent_id ON invoices(agent_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_route_assignments_agent_id ON route_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_route_assignments_route_id ON route_assignments(route_id);
CREATE INDEX IF NOT EXISTS idx_agent_stock_agent_id ON agent_stock(agent_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer_id ON customer_transactions(customer_id);

-- Insert default company settings
INSERT INTO company_settings (company_name, address, phone, email) 
VALUES (
    'BillMate Billing Hub',
    '123 Business Street, City, State 12345',
    '+1-234-567-8900',
    'admin@billmate.com'
) ON CONFLICT DO NOTHING;

-- Insert sample data for demo (optional)
-- Insert demo routes
INSERT INTO routes (route_code, route_name, description) VALUES
    ('RT001', 'Downtown Route', 'Central business district delivery route'),
    ('RT002', 'Residential Route', 'Suburban residential area'),
    ('RT003', 'Industrial Route', 'Industrial and warehouse district')
ON CONFLICT (route_code) DO NOTHING;

-- Insert demo products
INSERT INTO products (product_code, name, category, price, cost, stock_quantity, unit) VALUES
    ('PRD001', 'Premium Coffee Beans', 'Beverages', 25.99, 15.00, 100, 'kg'),
    ('PRD002', 'Organic Tea Leaves', 'Beverages', 18.50, 12.00, 50, 'kg'),
    ('PRD003', 'Whole Wheat Bread', 'Bakery', 4.99, 3.00, 200, 'loaf'),
    ('PRD004', 'Fresh Milk', 'Dairy', 3.49, 2.50, 150, 'liter'),
    ('PRD005', 'Cheese Slices', 'Dairy', 8.99, 6.00, 75, 'pack')
ON CONFLICT (product_code) DO NOTHING;

-- Insert demo customers
INSERT INTO customers (customer_id, name, shop_name, phone, address, city, route_id) VALUES
    ('CUST001', 'John Smith', 'Smith General Store', '+1-555-0101', '456 Main St', 'Downtown', (SELECT id FROM routes WHERE route_code = 'RT001' LIMIT 1)),
    ('CUST002', 'Sarah Johnson', 'Johnson Mart', '+1-555-0102', '789 Oak Ave', 'Residential Area', (SELECT id FROM routes WHERE route_code = 'RT002' LIMIT 1)),
    ('CUST003', 'Mike Wilson', 'Wilson Supplies', '+1-555-0103', '321 Industrial Blvd', 'Industrial Zone', (SELECT id FROM routes WHERE route_code = 'RT003' LIMIT 1))
ON CONFLICT (customer_id) DO NOTHING;

-- Log migration completion
INSERT INTO migration_log (migration_name, description) 
VALUES (
    'neon_initial_migration', 
    'Initial BillMate schema migration from Supabase to Neon PostgreSQL'
) ON CONFLICT (migration_name) DO NOTHING;

-- Success message
SELECT 'BillMate database schema created successfully in Neon!' as status;
