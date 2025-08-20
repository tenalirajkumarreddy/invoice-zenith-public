import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { getCustomerTransactions } from "@/lib/transaction-utils";

interface TransactionHistoryProps {
  customerId: string;
  customerName: string;
}

export default function TransactionHistory({ customerId, customerName }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getCustomerTransactions(customerId)
      .then((res) => {
        if (res.error) setError(res.error);
        setTransactions(res.data);
      })
      .catch((err) => setError("Failed to fetch transaction history"))
      .finally(() => setLoading(false));
  }, [customerId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN');
  };

  return (
    <Card className="p-6 bg-gradient-card shadow-card border-border/50">
      <h3 className="text-xl font-semibold text-foreground mb-4">Transaction History for {customerName}</h3>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading transactions...</span>
        </div>
      ) : error ? (
        <div className="text-destructive text-center py-8">{error}</div>
      ) : transactions.length === 0 ? (
        <div className="text-muted-foreground text-center py-8">No transactions found for this customer.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left">Date</th>
                <th className="px-2 py-2 text-left">Type</th>
                <th className="px-2 py-2 text-left">Amount</th>
                <th className="px-2 py-2 text-left">Balance</th>
                <th className="px-2 py-2 text-left">Outstanding</th>
                <th className="px-2 py-2 text-left">Description</th>
                <th className="px-2 py-2 text-left">Reference</th>
                <th className="px-2 py-2 text-left">Agent</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border/30 hover:bg-background/50 transition-colors">
                  <td className="px-2 py-2 whitespace-nowrap">{formatDate(tx.created_at)}</td>
                  <td className="px-2 py-2">
                    <Badge variant={
                      tx.transaction_type === 'refund' ? 'default' :
                      tx.transaction_type === 'balance_payment' ? 'secondary' :
                      tx.transaction_type === 'invoice_payment' ? 'destructive' :
                      'outline'
                    }>
                      {tx.transaction_type.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 font-semibold">
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="px-2 py-2">
                    {formatCurrency(tx.balance_after)}
                  </td>
                  <td className="px-2 py-2">
                    {formatCurrency(tx.outstanding_after)}
                  </td>
                  <td className="px-2 py-2 max-w-xs truncate" title={tx.description}>{tx.description}</td>
                  <td className="px-2 py-2">
                    {tx.reference_number || tx.invoice_id || tx.order_id || '-'}
                  </td>
                  <td className="px-2 py-2">
                    {tx.profiles?.full_name || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
} 