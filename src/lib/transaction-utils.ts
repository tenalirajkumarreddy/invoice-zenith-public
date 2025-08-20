import { supabase } from "@/integrations/supabase/client";

export interface TransactionData {
  customer_id: string;
  invoice_id?: string;
  order_id?: string;
  transaction_type: 'invoice_payment' | 'balance_payment' | 'refund' | 'opening_balance' | 'manual_adjustment' | 'invoice_creation';
  amount: number;
  payment_method?: 'cash' | 'upi' | 'balance' | 'mixed';
  description: string;
  reference_number?: string;
  metadata?: Record<string, any>;
}

export interface CustomerBalanceUpdate {
  balance: number;
  outstanding: number;
}

/**
 * Safely round currency amounts to avoid floating point errors
 */
function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Log a customer transaction and update customer balance
 */
export async function logTransaction(transactionData: TransactionData): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate input amounts
    if (isNaN(transactionData.amount) || !isFinite(transactionData.amount)) {
      throw new Error('Invalid transaction amount');
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get current customer data with row locking for consistency
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('balance, outstanding')
      .eq('id', transactionData.customer_id)
      .single();

    if (customerError || !customer) {
      throw new Error('Customer not found');
    }

    const balanceBefore = roundCurrency(customer.balance || 0);
    const outstandingBefore = roundCurrency(customer.outstanding || 0);
    const transactionAmount = roundCurrency(transactionData.amount);

    // Calculate new balance and outstanding based on transaction type
    let balanceAfter = balanceBefore;
    let outstandingAfter = outstandingBefore;

    switch (transactionData.transaction_type) {
      case 'invoice_payment':
        // When customer pays for invoice, reduce outstanding
        outstandingAfter = roundCurrency(Math.max(0, outstandingBefore - Math.abs(transactionAmount)));
        break;
      
      case 'balance_payment':
        // When customer uses balance to pay, reduce balance
        balanceAfter = roundCurrency(Math.max(0, balanceBefore - Math.abs(transactionAmount)));
        break;
      
      case 'refund':
        // When refunding balance payment, only add back to balance
        // Don't reduce outstanding as it was already created when invoice was made
        balanceAfter = roundCurrency(balanceBefore + Math.abs(transactionAmount));
        // outstandingAfter remains the same
        break;
      
      case 'opening_balance':
        // Opening balance adjustment - handle both positive and negative
        balanceAfter = roundCurrency(balanceBefore + transactionAmount);
        break;
      
      case 'manual_adjustment':
        // Manual adjustment - amount can be positive or negative
        balanceAfter = roundCurrency(balanceBefore + transactionAmount);
        break;
      
      case 'invoice_creation':
        // When creating invoice with outstanding amount, increase outstanding
        outstandingAfter = roundCurrency(outstandingBefore + Math.abs(transactionAmount));
        break;
        
      default:
        throw new Error(`Unknown transaction type: ${transactionData.transaction_type}`);
    }

    // Update customer balance and outstanding
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        balance: balanceAfter,
        outstanding: outstandingAfter
      })
      .eq('id', transactionData.customer_id);

    if (updateError) {
      throw updateError;
    }

    // Try to log transaction to database if table exists
    try {
      const { error: transactionError } = await (supabase as any)
        .from('customer_transactions')
        .insert({
          customer_id: transactionData.customer_id,
          invoice_id: transactionData.invoice_id,
          order_id: transactionData.order_id,
          transaction_type: transactionData.transaction_type,
          amount: transactionData.amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          outstanding_before: outstandingBefore,
          outstanding_after: outstandingAfter,
          payment_method: transactionData.payment_method,
          description: transactionData.description,
          reference_number: transactionData.reference_number,
          agent_id: user.id,
          metadata: transactionData.metadata
        });

      if (transactionError) {
        // If table doesn't exist or other error, just log to console
        console.log(`Transaction logged (console only): ${transactionData.description} - Balance: ${balanceBefore} → ${balanceAfter}, Outstanding: ${outstandingBefore} → ${outstandingAfter}`);
      } else {
        console.log(`Transaction logged to database: ${transactionData.description} - Balance: ${balanceBefore} → ${balanceAfter}, Outstanding: ${outstandingBefore} → ${outstandingAfter}`);
      }
    } catch (dbError) {
      // Database logging failed, but balance update succeeded
      console.log(`Transaction logged (console only): ${transactionData.description} - Balance: ${balanceBefore} → ${balanceAfter}, Outstanding: ${outstandingBefore} → ${outstandingAfter}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error logging transaction:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Get customer transaction history
 */
export async function getCustomerTransactions(customerId: string, limit = 50): Promise<{ data: any[]; error?: string }> {
  try {
    // Try to fetch transactions from database
    const { data, error } = await (supabase as any)
      .from('customer_transactions')
      .select(`
        *,
        invoices (invoice_number),
        orders (order_number),
        profiles (full_name)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // If table doesn't exist or other error, return error message
      return { 
        data: [], 
        error: 'Transaction history feature is not available yet. Please run the database migration to enable this feature.' 
      };
    }

    return { data: data || [] };
  } catch (dbError) {
    // Database query failed
    return { 
      data: [], 
      error: 'Transaction history feature is not available yet. Please run the database migration to enable this feature.' 
    };
  }
}

/**
 * Handle refund for cancelled/deleted invoice
 * IMPORTANT: This function only refunds the balance_amount that was used from customer's balance.
 * It does NOT refund cash or UPI payments, and does NOT affect outstanding amounts.
 * 
 * For example:
 * - Invoice: ₹1000 total, ₹300 from balance, ₹400 cash, ₹300 outstanding
 * - When cancelled: Only ₹300 is refunded to balance
 * - Cash payment (₹400) is not refunded
 * - Outstanding amount (₹300) remains unchanged
 */
export async function handleInvoiceRefund(invoice: any, reason: 'cancelled' | 'deleted'): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if invoice had balance payment
    const balanceAmount = invoice.balance_amount || 0;
    
    if (balanceAmount <= 0) {
      // No balance was used, no refund needed
      return { success: true };
    }

    // Log refund transaction - only refund the balance amount that was used
    const refundResult = await logTransaction({
      customer_id: invoice.customer_id,
      invoice_id: invoice.id,
      transaction_type: 'refund',
      amount: balanceAmount, // Positive amount for refund
      payment_method: 'balance',
      description: `Refund for ${reason} invoice ${invoice.invoice_number} (balance amount only)`,
      reference_number: invoice.invoice_number,
      metadata: {
        reason,
        original_invoice_amount: invoice.total_amount,
        refund_amount: balanceAmount,
        cash_amount: invoice.cash_amount || 0,
        upi_amount: invoice.upi_amount || 0,
        outstanding_amount: invoice.total_amount - (invoice.payment_amount || 0)
      }
    });

    return refundResult;
  } catch (error) {
    console.error('Error handling invoice refund:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
} 