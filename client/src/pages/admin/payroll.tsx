import { useQuery, useMutation } from "@tanstack/react-query";
import { Wallet, Search, Download, Eye, Check, Clock, AlertTriangle, MoreHorizontal, Users } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PayoutWithDetails } from "@shared/schema";

type PayoutStatus = "draft" | "approved" | "paid" | "on_hold";

function formatCurrency(amount: string | number, currency: string = "ZAR"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
  }).format(num);
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function getStatusBadgeVariant(status: PayoutStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "paid":
      return "default";
    case "approved":
      return "secondary";
    case "on_hold":
      return "destructive";
    default:
      return "outline";
  }
}

function getFlagTypeBadge(flagType: string): "default" | "secondary" | "destructive" {
  if (flagType.includes("unpaid") || flagType.includes("missing")) {
    return "destructive";
  }
  if (flagType.includes("partial") || flagType.includes("warning")) {
    return "secondary";
  }
  return "default";
}

function PayoutDetailDialog({
  payout,
  open,
  onOpenChange,
}: {
  payout: PayoutWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const approveMutation = useMutation({
    mutationFn: async (newStatus: PayoutStatus) => {
      if (!payout?.id) throw new Error("No payout selected");
      return apiRequest("PATCH", `/api/payouts/${payout.id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payouts", payout?.id] });
      toast({
        title: "Payout updated",
        description: "The payout status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update payout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resolveFlagMutation = useMutation({
    mutationFn: async ({ flagId }: { flagId: string }) => {
      if (!payout?.id) throw new Error("No payout selected");
      return apiRequest("PATCH", `/api/payouts/${payout.id}/flags/${flagId}`, {
        isResolved: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payouts", payout?.id] });
      toast({
        title: "Flag resolved",
        description: "The flag has been marked as resolved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resolve flag. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!payout) return null;

  const unresolvedFlags = payout.flags?.filter((f) => !f.isResolved) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <DialogTitle className="font-heading text-xl">
                Payout for {payout.tutor?.firstName} {payout.tutor?.lastName}
              </DialogTitle>
              <DialogDescription>
                {format(new Date(payout.periodStart), "MMM d")} -{" "}
                {format(new Date(payout.periodEnd), "MMM d, yyyy")}
              </DialogDescription>
            </div>
            <Badge variant={getStatusBadgeVariant(payout.status as PayoutStatus)}>
              {payout.status.replace("_", " ")}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList>
            <TabsTrigger value="details" data-testid="tab-payout-details">Details</TabsTrigger>
            <TabsTrigger value="flags" data-testid="tab-payout-flags">
              Flags
              {unresolvedFlags.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unresolvedFlags.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Tutor</Label>
                <p className="font-medium">
                  {payout.tutor?.firstName} {payout.tutor?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{payout.tutor?.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Total Time</Label>
                <p className="font-medium">{formatMinutes(payout.totalMinutes)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <p className="font-medium">
                  {payout.createdAt ? format(new Date(payout.createdAt), "MMM d, yyyy") : "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Currency</Label>
                <p className="font-medium">{payout.currency}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-heading font-semibold mb-3">Sessions</h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payout.lines?.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <p className="font-medium">
                            {line.student?.firstName} {line.student?.lastName}
                          </p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {line.course?.title || "-"}
                        </TableCell>
                        <TableCell className="text-right">{formatMinutes(line.minutes)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(line.hourlyRate, payout.currency)}/hr
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(line.amount, payout.currency)}
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
                  <span className="text-muted-foreground">Gross Amount</span>
                  <span>{formatCurrency(payout.grossAmount, payout.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deductions</span>
                  <span>{formatCurrency(payout.deductions, payout.currency)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Net Amount</span>
                  <span>{formatCurrency(payout.netAmount, payout.currency)}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="flags" className="mt-4">
            {payout.flags && payout.flags.length > 0 ? (
              <div className="space-y-4">
                {payout.flags.map((flag) => (
                  <div
                    key={flag.id}
                    className={`rounded-md border p-4 ${flag.isResolved ? "opacity-60" : ""}`}
                    data-testid={`flag-${flag.id}`}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getFlagTypeBadge(flag.flagType)}>
                            {flag.flagType.replace(/_/g, " ")}
                          </Badge>
                          {flag.isResolved && (
                            <Badge variant="outline">Resolved</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{flag.description}</p>
                      </div>
                      {!flag.isResolved && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            resolveFlagMutation.mutate({
                              flagId: flag.id,
                            })
                          }
                          disabled={resolveFlagMutation.isPending}
                          data-testid={`button-resolve-flag-${flag.id}`}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<AlertTriangle className="h-8 w-8" />}
                title="No flags"
                description="No issues have been flagged for this payout."
                testId="empty-flags"
              />
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-payout-detail">
            Close
          </Button>
          {payout.status === "draft" && (
            <Button
              onClick={() => approveMutation.mutate("approved")}
              disabled={approveMutation.isPending}
              data-testid="button-approve-payout"
            >
              <Check className="mr-2 h-4 w-4" />
              Approve Payout
            </Button>
          )}
          <Button asChild data-testid="button-download-payslip">
            <a href={`/api/payouts/${payout.id}/pdf`} download>
              <Download className="mr-2 h-4 w-4" />
              Download Payslip
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPayroll() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayout, setSelectedPayout] = useState<PayoutWithDetails | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: payouts, isLoading } = useQuery<PayoutWithDetails[]>({
    queryKey: ["/api/payouts"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PayoutStatus }) => {
      return apiRequest("PATCH", `/api/payouts/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payouts"] });
      toast({
        title: "Payout updated",
        description: "The payout status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update payout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredPayouts = payouts?.filter((payout) => {
    const matchesStatus = statusFilter === "all" || payout.status === statusFilter;
    const tutorName = `${payout.tutor?.firstName || ""} ${payout.tutor?.lastName || ""}`.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      tutorName.includes(searchQuery.toLowerCase()) ||
      payout.tutor?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = payouts
    ? {
        total: payouts.length,
        draft: payouts.filter((p) => p.status === "draft").length,
        approved: payouts.filter((p) => p.status === "approved").length,
        withFlags: payouts.filter((p) => p.flags?.some((f) => !f.isResolved)).length,
      }
    : { total: 0, draft: 0, approved: 0, withFlags: 0 };

  const openPayoutDetail = (payout: PayoutWithDetails) => {
    setSelectedPayout(payout);
    setDetailDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
          Payroll Management
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage tutor payouts and approve payslips
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Payouts</p>
                <p className="text-2xl font-bold" data-testid="stat-total-payouts">{stats.total}</p>
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
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold" data-testid="stat-draft-payouts">{stats.draft}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-500/10">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold" data-testid="stat-approved-payouts">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">With Flags</p>
                <p className="text-2xl font-bold" data-testid="stat-flagged-payouts">{stats.withFlags}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="font-heading text-xl">All Payouts</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tutors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 pl-9"
                  data-testid="input-search-payouts"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44" data-testid="select-payout-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
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
          ) : filteredPayouts && filteredPayouts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tutor</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.map((payout) => {
                    const hasUnresolvedFlags = payout.flags?.some((f) => !f.isResolved);
                    return (
                      <TableRow key={payout.id} data-testid={`payout-row-${payout.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium">
                                {payout.tutor?.firstName} {payout.tutor?.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {payout.tutor?.email}
                              </p>
                            </div>
                            {hasUnresolvedFlags && (
                              <Badge variant="destructive">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Flagged
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(payout.periodStart), "MMM d")} -{" "}
                          {format(new Date(payout.periodEnd), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMinutes(payout.totalMinutes)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payout.netAmount, payout.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(payout.status as PayoutStatus)}>
                            {payout.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-payout-actions-${payout.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  openPayoutDetail(payout);
                                }}
                                data-testid={`button-view-payout-${payout.id}`}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a
                                  href={`/api/payouts/${payout.id}/pdf`}
                                  download
                                  data-testid={`button-download-payslip-${payout.id}`}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Download Payslip
                                </a>
                              </DropdownMenuItem>
                              {payout.status === "draft" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      approveMutation.mutate({ id: payout.id, status: "approved" });
                                    }}
                                    data-testid={`button-quick-approve-${payout.id}`}
                                  >
                                    <Check className="mr-2 h-4 w-4" />
                                    Approve Payout
                                  </DropdownMenuItem>
                                </>
                              )}
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
              icon={<Wallet className="h-8 w-8" />}
              title="No payouts found"
              description={
                searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filter"
                  : "No payouts in the system yet."
              }
              testId="empty-payouts"
            />
          )}
        </CardContent>
      </Card>

      <PayoutDetailDialog
        payout={selectedPayout}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
}
