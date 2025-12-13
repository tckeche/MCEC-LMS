import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CreditCard, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface AccountStanding {
  hasOverdueInvoices: boolean;
  overdueCount: number;
  totalOverdueAmount: string;
  oldestOverdueDate: string | null;
}

export function PaymentReminderBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  const { data: standing, isLoading } = useQuery<AccountStanding>({
    queryKey: ["/api/account/standing"],
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !standing?.hasOverdueInvoices || isDismissed) {
    return null;
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(parseFloat(amount));
  };

  return (
    <div 
      className="bg-destructive/10 border border-destructive/20 rounded-md p-4 mb-4"
      data-testid="banner-payment-reminder"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-destructive" data-testid="text-payment-reminder-title">
            Payment Required
          </h4>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-payment-reminder-message">
            You have {standing.overdueCount} overdue invoice{standing.overdueCount > 1 ? "s" : ""} totaling{" "}
            <span className="font-medium text-foreground">{formatCurrency(standing.totalOverdueAmount)}</span>.
            Please make payment to continue using all features.
          </p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Link href="/invoices">
              <Button size="sm" variant="destructive" data-testid="button-view-invoices">
                <CreditCard className="h-4 w-4 mr-1.5" />
                View Invoices
              </Button>
            </Link>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="flex-shrink-0 h-8 w-8"
          onClick={() => setIsDismissed(true)}
          data-testid="button-dismiss-reminder"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </div>
  );
}
