# Transaction History Setup

This document explains how to set up the transaction history feature for the Invoice Zenith Billing Hub.

## Overview

The transaction history feature allows you to:
- Track all customer financial transactions (payments, refunds, adjustments)
- Automatically refund customer balance when invoices are cancelled or deleted
- View detailed transaction history for each customer
- Maintain accurate customer balance and outstanding amounts

## Current Status

The transaction history feature has been implemented in the code and now logs ALL financial actions. Currently:

✅ **Working Features:**
- Customer balance updates when invoices are created/cancelled/deleted
- Automatic refund logic when invoices with balance payments are cancelled/deleted
- Transaction logging for ALL financial actions (see list below)
- UI components for viewing transaction history
- Database logging when table exists, console logging as fallback

❌ **Pending Setup:**
- Database table for storing transaction history (required for viewing transaction history in UI)

## Complete List of Logged Actions

The system now logs **every single financial action** that affects customer balances:

### 1. Customer Creation Actions
- **Opening Balance Setup**: When a new customer is created with an opening balance
  - Transaction Type: `opening_balance`
  - Logs: Initial balance amount (positive = you owe customer, negative = customer owes you)

### 2. Invoice Actions
- **Invoice Creation with Balance Payment**: When customer uses their balance to pay for an invoice
  - Transaction Type: `balance_payment`
  - Logs: Amount deducted from customer balance

- **Invoice Creation with Outstanding**: When invoice is created with unpaid amount
  - Transaction Type: `invoice_payment`
  - Logs: Outstanding amount added to customer's debt

- **Invoice Cancellation with Refund**: When invoice using balance is cancelled
  - Transaction Type: `refund`
  - Logs: Balance amount refunded to customer

- **Invoice Deletion with Refund**: When invoice using balance is deleted
  - Transaction Type: `refund`
  - Logs: Balance amount refunded to customer

### 3. Route Order Actions (Delivery Agent)
- **Route Order with Balance Payment**: When delivery agent creates order using customer balance
  - Transaction Type: `balance_payment`
  - Logs: Amount deducted from customer balance

- **Route Order with Outstanding**: When route order is created with unpaid amount
  - Transaction Type: `invoice_payment`
  - Logs: Outstanding amount added to customer's debt

### 4. Manual Adjustments (Future Feature)
- **Manual Balance Adjustment**: When balance is manually adjusted by admin
  - Transaction Type: `manual_adjustment`
  - Logs: Adjustment amount (positive or negative)

## Setup Instructions

### Step 1: Create the Transaction History Table

**IMPORTANT**: You must create the transaction history table to view transaction history in the UI.

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase/migrations/create_customer_transactions.sql` into the editor
4. Click "Run" to execute the script

This will create:
- `customer_transactions` table with proper foreign key relationships
- Required indexes for performance
- Row Level Security policies
- Helper functions for transaction management

**Note**: The core refund and balance update functionality works without this table, but the transaction history UI requires it.

### Step 2: Verify the Setup

After running the migration, verify that:
1. The `customer_transactions` table exists
2. Foreign key relationships to `customers`, `invoices`, `orders`, and `profiles` tables are established
3. RLS policies are active

### Step 3: Test the Feature

1. Create an invoice with balance payment
2. Cancel or delete the invoice
3. Check that the customer balance is automatically refunded
4. View the transaction history in the customer profile

## How It Works

### Transaction Types

- **invoice_payment**: When customer owes money (increases outstanding)
- **balance_payment**: When customer uses their balance to pay (reduces balance)
- **refund**: When money is refunded to customer (increases balance, reduces outstanding)
- **opening_balance**: Initial balance setup for new customers
- **manual_adjustment**: Manual balance adjustments

### Refund Logic

When an invoice is cancelled or deleted:
1. System checks if the invoice used customer balance (`balance_amount` field)
2. If balance was used, automatically refunds only the balance amount (not the total invoice amount)
3. Updates customer balance by adding back the refunded amount
4. Outstanding amount remains unchanged (it was already created when the invoice was made)
5. Logs the refund transaction

**Important**: Refunds only affect the customer's balance, not their outstanding amount. For example:
- Invoice: ₹1000 total, ₹300 paid from balance, ₹700 outstanding
- When cancelled: Only ₹300 is refunded to balance, ₹700 outstanding remains

### Balance Management

- **Balance**: Positive = owner owes customer, Negative = customer owes owner
- **Outstanding**: Amount customer owes to the business
- All transactions maintain both balance and outstanding accuracy

## Database Schema

The `customer_transactions` table includes:

```sql
CREATE TABLE customer_transactions (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  invoice_id UUID REFERENCES invoices(id),
  order_id UUID REFERENCES orders(id),
  transaction_type TEXT CHECK (...),
  amount DECIMAL(10,2),
  balance_before DECIMAL(10,2),
  balance_after DECIMAL(10,2),
  outstanding_before DECIMAL(10,2),
  outstanding_after DECIMAL(10,2),
  payment_method TEXT,
  description TEXT,
  reference_number TEXT,
  agent_id UUID REFERENCES profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);
```

## Troubleshooting

### Transaction History Not Showing

If the transaction history tab shows "Feature Not Available":
1. Ensure the `customer_transactions` table exists in your database
2. Run the migration script: `supabase/migrations/create_customer_transactions.sql`
3. Check that the RLS policies are properly configured
4. Verify that your user has the correct role (admin or agent)

### Foreign Key Relationship Errors

If you get errors about missing relationships:
1. Verify that `customers`, `invoices`, `orders`, and `profiles` tables exist
2. Check that these tables have the expected primary key columns (`id` for most, `user_id` for profiles)
3. Re-run the migration script after confirming the prerequisite tables exist

### Refund Not Working

If refunds are not being processed:
1. Check the browser console for error messages
2. Verify that the invoice has a `balance_amount` greater than 0
3. Ensure the customer exists and has a valid balance

### Database Connection Issues

If you can't run the migration:
1. Check your Supabase project status
2. Verify your database connection settings
3. Try running the SQL script manually in the Supabase SQL Editor

## Files Modified

- `src/lib/transaction-utils.ts` - Core transaction logic with database logging
- `src/pages/Invoices.tsx` - Invoice cancellation/deletion with refund
- `src/pages/InvoiceReview.tsx` - Invoice creation with transaction logging
- `src/components/AddCustomerDialog.tsx` - Customer creation with opening balance logging
- `src/components/delivery/CustomerProfile.tsx` - Route order payments with transaction logging
- `src/components/TransactionHistory.tsx` - UI for viewing transactions
- `src/components/delivery/CustomerProfile.tsx` - Added transaction history tab
- `supabase/migrations/create_customer_transactions.sql` - Database migration
- `TRANSACTION_HISTORY_SETUP.md` - Setup documentation

## Future Enhancements

- Transaction export functionality
- Transaction search and filtering
- Transaction reconciliation reports
- Email notifications for large transactions
- Transaction approval workflows
- Manual balance adjustment interface for admins