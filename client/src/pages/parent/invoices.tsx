import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Eye, Search, Receipt, Clock, CheckCircle, AlertCircle } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import type { InvoiceWithDetails, InvoiceStatus } from "@shared/schema";

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
    case "verified":
      return "default";
    case "awaiting_payment":
      return "secondary";
    case "overdue":
    case "disputed":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusIcon(status: InvoiceStatus) {
  switch (status) {
    case "paid":
    case "verified":
      return <CheckCircle className="h-4 w-4" />;
    case "overdue":
    case "disputed":
      return <AlertCircle className="h-4 w-4" />;
    case "awaiting_payment":
      return <Clock className="h-4 w-4" />;
    default:
      return <Receipt className="h-4 w-4" />;
  }
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
  if (!invoice) return null;

  return (
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
              {getStatusIcon(invoice.status as InvoiceStatus)}
              <span className="ml-1">{invoice.status.replace("_", " ")}</span>
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList>
            <TabsTrigger value="details" data-testid="tab-invoice-details">Details</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-invoice-payments">
              Payments
              {invoice.payments?.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {invoice.payments.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Student</Label>
                <p className="font-medium">
                  {invoice.student?.firstName} {invoice.student?.lastName}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Due Date</Label>
                <p className="font-medium">
                  {invoice.dueDate
                    ? format(new Date(invoice.dueDate), "MMM d, yyyy")
                    : "Not set"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Currency</Label>
                <p className="font-medium">{invoice.currency}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <p className="font-medium">
                  {invoice.createdAt
                    ? format(new Date(invoice.createdAt), "MMM d, yyyy")
                    : "N/A"}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-heading font-semibold mb-3">Line Items</h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.lineItems?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.course?.title || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.description}
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
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="text-green-600">
                    {formatCurrency(invoice.amountPaid, invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Outstanding</span>
                  <span className={parseFloat(invoice.amountOutstanding) > 0 ? "text-destructive" : ""}>
                    {formatCurrency(invoice.amountOutstanding, invoice.currency)}
                  </span>
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
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {payment.receivedAt
                            ? format(new Date(payment.receivedAt), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell className="capitalize">
                          {payment.paymentMethod?.replace("_", " ") || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.paymentReference || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.verificationStatus === "verified"
                                ? "default"
                                : payment.verificationStatus === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {payment.verificationStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount, invoice.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={<Receipt className="h-8 w-8" />}
                title="No payments"
                description="No payments have been recorded for this invoice yet."
                testId="empty-payments"
              />
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-invoice-detail">
            Close
          </Button>
          <Button asChild data-testid="button-download-invoice">
            <a href={`/api/invoices/${invoice.id}/pdf`} download>
              <Download className="mr-2 h-4 w-4" />
              Download Invoice
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ParentInvoices() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data: invoices, isLoading } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"],
  });

  const filteredInvoices = invoices?.filter((invoice) => {
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    const studentName = `${invoice.student?.firstName || ""} ${invoice.student?.lastName || ""}`.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      studentName.includes(searchQuery.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = invoices
    ? {
        total: invoices.length,
        outstanding: invoices
          .filter((i) => parseFloat(i.amountOutstanding) > 0)
          .reduce((sum, i) => sum + parseFloat(i.amountOutstanding), 0),
        paid: invoices.filter((i) => i.status === "paid").length,
        overdue: invoices.filter((i) => i.status === "overdue").length,
      }
    : { total: 0, outstanding: 0, paid: 0, overdue: 0 };

  const openInvoiceDetail = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setDetailDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
          Invoices
        </h1>
        <p className="mt-1 text-muted-foreground">
          View and download invoices for your children's tutoring sessions
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
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold" data-testid="stat-outstanding">
                  {formatCurrency(stats.outstanding)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold" data-testid="stat-paid-invoices">{stats.paid}</p>
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
                  data-testid="input-search-invoices"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44" data-testid="select-invoice-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
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
                    <TableHead>Student</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        {invoice.student?.firstName} {invoice.student?.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(invoice.billingPeriodStart), "MMM d")} -{" "}
                        {format(new Date(invoice.billingPeriodEnd), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.totalAmount, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            parseFloat(invoice.amountOutstanding) > 0
                              ? "text-destructive font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {formatCurrency(invoice.amountOutstanding, invoice.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(invoice.status as InvoiceStatus)}>
                          {invoice.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openInvoiceDetail(invoice)}
                            data-testid={`button-view-invoice-${invoice.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <a
                              href={`/api/invoices/${invoice.id}/pdf`}
                              download
                              data-testid={`button-download-invoice-${invoice.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
                  : "No invoices have been created yet."
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
