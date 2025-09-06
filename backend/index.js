import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple file-based data storage
const dataFile = join(__dirname, 'data.json');

// Initialize data file if it doesn't exist
const initializeData = async () => {
  try {
    await fs.access(dataFile);
  } catch {
    const initialData = {
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
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
          invoice_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        }
      ],
      routes: [
        {
          id: '1',
          route_code: 'R001',
          route_name: 'Downtown Area',
          description: 'Central business district and shopping areas',
          is_active: true,
          created_at: new Date().toISOString()
        }
      ],
      orders: [],
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    };
    
    await fs.writeFile(dataFile, JSON.stringify(initialData, null, 2));
    console.log('📝 Initialized data file with sample data');
  }
};

// Helper function to read data
const readData = async () => {
  try {
    const data = await fs.readFile(dataFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data:', error);
    return {};
  }
};

// Helper function to write data
const writeData = async (data) => {
  try {
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing data:', error);
  }
};

// API Routes

// Get all items from a table
app.get('/api/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const data = await readData();
    const items = data[table] || [];
    
    res.json({
      data: items,
      error: null
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      error: { message: error.message }
    });
  }
});

// Get specific item by ID
app.get('/api/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    const data = await readData();
    const items = data[table] || [];
    const item = items.find(i => i.id === id);
    
    res.json({
      data: item || null,
      error: item ? null : { message: 'Item not found' }
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      error: { message: error.message }
    });
  }
});

// Create new item
app.post('/api/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const newItem = {
      ...req.body,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const data = await readData();
    if (!data[table]) data[table] = [];
    
    data[table].push(newItem);
    await writeData(data);
    
    res.json({
      data: [newItem],
      error: null
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      error: { message: error.message }
    });
  }
});

// Update item
app.put('/api/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    const data = await readData();
    
    if (!data[table]) {
      return res.status(404).json({
        data: null,
        error: { message: 'Table not found' }
      });
    }
    
    const itemIndex = data[table].findIndex(i => i.id === id);
    if (itemIndex === -1) {
      return res.status(404).json({
        data: null,
        error: { message: 'Item not found' }
      });
    }
    
    data[table][itemIndex] = {
      ...data[table][itemIndex],
      ...req.body,
      updated_at: new Date().toISOString()
    };
    
    await writeData(data);
    
    res.json({
      data: [data[table][itemIndex]],
      error: null
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      error: { message: error.message }
    });
  }
});

// Delete item
app.delete('/api/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    const data = await readData();
    
    if (!data[table]) {
      return res.status(404).json({
        data: null,
        error: { message: 'Table not found' }
      });
    }
    
    const itemIndex = data[table].findIndex(i => i.id === id);
    if (itemIndex === -1) {
      return res.status(404).json({
        data: null,
        error: { message: 'Item not found' }
      });
    }
    
    data[table].splice(itemIndex, 1);
    await writeData(data);
    
    res.json({
      data: null,
      error: null
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      error: { message: error.message }
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Invoice Zenith Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Serve static files from frontend build
app.use(express.static(join(__dirname, '../dist')));

// Catch-all handler for frontend routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

// Start server
const startServer = async () => {
  await initializeData();
  
  app.listen(PORT, () => {
    console.log(`🚀 Invoice Zenith Backend Server running on port ${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`📱 Frontend served from: http://localhost:${PORT}`);
  });
};

startServer().catch(console.error);
