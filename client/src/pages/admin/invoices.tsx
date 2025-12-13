import { useQuery, useMutation } from "@tanstack/react-query";
import { FileText, Search, Download, Eye, Check, X, Clock, AlertCircle, DollarSign, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InvoiceWithDetails, InvoicePayment } from "@shared/schema";

type InvoiceStatus = "draft" | "awaiting_payment" | "partial" | "paid" | "overdue" | "disputed" | "cancelled";
type PaymentVerificationStatus = "pending" | "verified" | "rejected";

function formatCurrency(amount: string | number, currency: string = "ZAR"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
  }).format(num);
}

function getStatusBadgeVariant(status: InvoiceStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "paid":
      return "default";
    case "awaiting_payment":
    case "partial":
      return "secondary";
    case "overdue":
    case "disputed":
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function getPaymentStatusBadgeVariant(status: PaymentVerificationStatus): "default" | "secondary" | "destructive" {
  switch (status) {
    case "verified":
      return "default";
    case "pending":
      return "secondary";
    case "rejected":
      return "destructive";
    default:
      return "secondary";
  }
}

function PaymentVerificationDialog({
  payment,
  open,
  onOpenChange,
  invoiceId,
}: {
  payment: InvoicePayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
}) {
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();

  const verifyMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: "verified" | "rejected"; reason?: string }) => {
      if (!payment?.id) {
        throw new Error("No payment selected");
      }
      return apiRequest("PATCH", `/api/invoice-payments/${payment.id}/verify`, {
        verificationStatus: status,
        rejectionReason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      onOpenChange(false);
      setRejectionReason("");
      toast({
        title: "Payment updated",
        description: "The payment verification status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Verify Payment</DialogTitle>
          <DialogDescription>
            Review the payment proof and verify or reject this payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Amount</Label>
              <p className="font-medium">{formatCurrency(payment.amount, payment.currency)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Method</Label>
              <p className="font-medium">{payment.paymentMethod || "Not specified"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Reference</Label>
              <p className="font-medium">{payment.paymentReference || "None"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Date</Label>
              <p className="font-medium">
                {payment.receivedAt ? format(new Date(payment.receivedAt), "MMM d, yyyy") : "N/A"}
              </p>
            </div>
          </div>

          {payment.proofAssetUrl && (
            <div>
              <Label className="text-muted-foreground">Proof of Payment</Label>
              <div className="mt-2 rounded-md border p-2">
                <a
                  href={payment.proofAssetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                  data-testid="link-proof-of-payment"
                >
                  <FileText className="h-4 w-4" />
                  View Proof Document
                </a>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="rejection-reason">Rejection Reason (if rejecting)</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="mt-2"
              data-testid="input-rejection-reason"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-verification"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => verifyMutation.mutate({ status: "rejected", reason: rejectionReason })}
            disabled={verifyMutation.isPending}
            data-testid="button-reject-payment"
          >
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
          <Button
            onClick={() => verifyMutation.mutate({ status: "verified" })}
            disabled={verifyMutation.isPending}
            data-testid="button-approve-payment"
          >
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDetailDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: InvoiceWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedPayment, setSelectedPayment] = useState<InvoicePayment | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);

  if (!invoice) return null;

  const pendingPayments = invoice.payments?.filter((p) => p.verificationStatus === "pending") || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <DialogTitle className="font-heading text-xl">
                  Invoice {invoice.invoiceNumber}
                </DialogTitle>
                <DialogDescription>
                  {format(new Date(invoice.billingPeriodStart), "MMM d")} -{" "}
                  {format(new Date(invoice.billingPeriodEnd), "MMM d, yyyy")}
                </DialogDescription>
              </div>
              <Badge variant={getStatusBadgeVariant(invoice.status as InvoiceStatus)}>
                {invoice.status.replace("_", " ")}
              </Badge>
            </div>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-4">
            <TabsList>
              <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
              <TabsTrigger value="payments" data-testid="tab-payments">
                Payments
                {pendingPayments.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {pendingPayments.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Parent</Label>
                  <p className="font-medium">
                    {invoice.parent.firstName} {invoice.parent.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{invoice.parent.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Student</Label>
                  <p className="font-medium">
                    {invoice.student.firstName} {invoice.student.lastName}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Due Date</Label>
                  <p className="font-medium">
                    {invoice.dueDate ? format(new Date(invoice.dueDate), "MMM d, yyyy") : "Not set"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Currency</Label>
                  <p className="font-medium">{invoice.currency}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-heading font-semibold mb-3">Line Items</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.lineItems?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.description}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.course?.title}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.hours}h</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.hourlyRate, invoice.currency)}/hr
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.amount, invoice.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="text-green-600">{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-orange-600">
                    <span>Outstanding</span>
                    <span>{formatCurrency(invoice.amountOutstanding, invoice.currency)}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              {invoice.payments && invoice.payments.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.payments.map((payment) => (
                        <TableRow key={payment.id} data-testid={`payment-row-${payment.id}`}>
                          <TableCell>
                            {payment.receivedAt
                              ? format(new Date(payment.receivedAt), "MMM d, yyyy")
                              : "N/A"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(payment.amount, payment.currency)}
                          </TableCell>
                          <TableCell>{payment.paymentMethod || "-"}</TableCell>
                          <TableCell>{payment.paymentReference || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={getPaymentStatusBadgeVariant(payment.verificationStatus as PaymentVerificationStatus)}
                            >
                              {payment.verificationStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {payment.verificationStatus === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setVerifyDialogOpen(true);
                                }}
                                data-testid={`button-verify-${payment.id}`}
                              >
                                Verify
                              </Button>
                            )}
                            {payment.proofAssetUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="ml-2"
                              >
                                <a
                                  href={payment.proofAssetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  data-testid={`link-proof-${payment.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  icon={<DollarSign className="h-8 w-8" />}
                  title="No payments yet"
                  description="No payments have been recorded for this invoice."
                  testId="empty-payments"
                />
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-detail">
              Close
            </Button>
            <Button asChild data-testid="button-download-pdf">
              <a href={`/api/invoices/${invoice.id}/pdf`} download>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentVerificationDialog
        payment={selectedPayment}
        open={verifyDialogOpen}
        onOpenChange={setVerifyDialogOpen}
        invoiceId={invoice.id}
      />
    </>
  );
}

export default function AdminInvoices() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: invoices, isLoading } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"],
  });

  const filteredInvoices = invoices?.filter((invoice) => {
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.parent.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.parent.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.student.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.student.lastName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = invoices
    ? {
        total: invoices.length,
        pending: invoices.filter((i) => i.status === "awaiting_payment").length,
        overdue: invoices.filter((i) => i.status === "overdue").length,
        pendingVerification: invoices.reduce(
          (acc, i) => acc + (i.payments?.filter((p) => p.verificationStatus === "pending").length || 0),
          0
        ),
      }
    : { total: 0, pending: 0, overdue: 0, pendingVerification: 0 };

  const openInvoiceDetail = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setDetailDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
          Invoice Management
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage invoices and verify payments
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold" data-testid="stat-total-invoices">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Payment</p>
                <p className="text-2xl font-bold" data-testid="stat-pending-invoices">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold" data-testid="stat-overdue-invoices">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-500/10">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Verification</p>
                <p className="text-2xl font-bold" data-testid="stat-pending-verification">{stats.pendingVerification}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="font-heading text-xl">All Invoices</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 pl-9"
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filteredInvoices && filteredInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Parent / Student</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const hasPendingPayments = invoice.payments?.some(
                      (p) => p.verificationStatus === "pending"
                    );
                    return (
                      <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{invoice.invoiceNumber}</span>
                            {hasPendingPayments && (
                              <Badge variant="secondary">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {invoice.parent.firstName} {invoice.parent.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {invoice.student.firstName} {invoice.student.lastName}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(invoice.billingPeriodStart), "MMM d")} -{" "}
                          {format(new Date(invoice.billingPeriodEnd), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {formatCurrency(invoice.totalAmount, invoice.currency)}
                            </p>
                            {parseFloat(invoice.amountOutstanding) > 0 && (
                              <p className="text-sm text-orange-600">
                                Due: {formatCurrency(invoice.amountOutstanding, invoice.currency)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(invoice.status as InvoiceStatus)}
                          >
                            {invoice.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-actions-${invoice.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  openInvoiceDetail(invoice);
                                }}
                                data-testid={`button-view-${invoice.id}`}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a
                                  href={`/api/invoices/${invoice.id}/pdf`}
                                  download
                                  data-testid={`button-download-${invoice.id}`}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Download PDF
                                </a>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No invoices found"
              description={
                searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filter"
                  : "No invoices in the system yet."
              }
              testId="empty-invoices"
            />
          )}
        </CardContent>
      </Card>

      <InvoiceDetailDialog
        invoice={selectedInvoice}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
}
