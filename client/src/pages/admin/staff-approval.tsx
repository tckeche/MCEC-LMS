import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { UserCheck, Clock, Check, X, AlertCircle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { StaffRoleRequestWithDetails } from "@shared/schema";
import { format } from "date-fns";

export default function StaffApproval() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StaffRoleRequestWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: requests, isLoading, error } = useQuery<StaffRoleRequestWithDetails[]>({
    queryKey: ["/api/staff/proposals"],
    enabled: !!user && user.role === "admin" && (user.adminLevel ?? 0) >= 3,
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest("POST", `/api/staff/proposals/${requestId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff/proposals"] });
      toast({
        title: "Request Approved",
        description: "The staff role request has been approved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to approve request",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const response = await apiRequest("POST", `/api/staff/proposals/${requestId}/reject`, {
        rejectionReason: reason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff/proposals"] });
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason("");
      toast({
        title: "Request Rejected",
        description: "The staff role request has been rejected.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reject request",
      });
    },
  });

  const handleApprove = (request: StaffRoleRequestWithDetails) => {
    approveMutation.mutate(request.id);
  };

  const handleRejectClick = (request: StaffRoleRequestWithDetails) => {
    setSelectedRequest(request);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedRequest) {
      rejectMutation.mutate({
        requestId: selectedRequest.id,
        reason: rejectionReason,
      });
    }
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() || "?";
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      admin: "default",
      manager: "default",
      tutor: "secondary",
    };
    return variants[role] || "outline";
  };

  if (!user || user.role !== "admin" || (user.adminLevel ?? 0) < 3) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<AlertCircle className="h-8 w-8" />}
              title="Access Denied"
              description="You need Admin Level 3 or higher to access this page."
              testId="empty-access-denied"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
          Staff Role Approvals
        </h1>
        <p className="mt-1 text-muted-foreground">
          Review and approve staff role requests from new users
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="font-heading text-xl flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Pending Requests
              </CardTitle>
              <CardDescription>
                {pendingRequests.length} request{pendingRequests.length !== 1 ? "s" : ""} awaiting approval
              </CardDescription>
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
          ) : error ? (
            <EmptyState
              icon={<AlertCircle className="h-8 w-8" />}
              title="Error loading requests"
              description="Failed to load staff role requests. Please try again."
              testId="empty-error"
            />
          ) : pendingRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Requested Role</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id} data-testid={`request-row-${request.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={request.user.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {getInitials(request.user.firstName, request.user.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {request.user.firstName} {request.user.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {request.user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(request.proposedRole)}>
                          {request.proposedRole}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {request.notes ? (
                          <span className="text-sm text-muted-foreground line-clamp-2">
                            {request.notes}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground/50">No notes</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {request.createdAt
                          ? format(new Date(request.createdAt), "MMM d, yyyy")
                          : "Unknown"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request)}
                            disabled={approveMutation.isPending}
                            data-testid={`button-approve-${request.id}`}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectClick(request)}
                            disabled={rejectMutation.isPending}
                            data-testid={`button-reject-${request.id}`}
                          >
                            <X className="mr-1 h-4 w-4" />
                            Reject
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
              icon={<Clock className="h-8 w-8" />}
              title="No pending requests"
              description="There are no staff role requests awaiting approval."
              testId="empty-requests"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Reject Request</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  Reject {selectedRequest.user.firstName} {selectedRequest.user.lastName}'s request for the{" "}
                  <span className="font-medium">{selectedRequest.proposedRole}</span> role.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Reason for Rejection (Optional)</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Provide a reason for rejecting this request..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-rejection-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
