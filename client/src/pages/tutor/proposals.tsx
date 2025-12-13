import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Clock, Check, X, User, BookOpen, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { format } from "date-fns";
import { useState } from "react";
import type { SessionProposalWithDetails } from "@shared/schema";

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "approved":
      return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function ProposalCard({
  proposal,
  onApprove,
  onReject,
  isPending,
}: {
  proposal: SessionProposalWithDetails;
  onApprove: (id: string) => void;
  onReject: (id: string, response: string) => void;
  isPending: boolean;
}) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectResponse, setRejectResponse] = useState("");

  const handleReject = () => {
    onReject(proposal.id, rejectResponse);
    setRejectDialogOpen(false);
    setRejectResponse("");
  };

  return (
    <>
      <Card className="hover-elevate" data-testid={`proposal-card-${proposal.id}`}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {proposal.student?.firstName} {proposal.student?.lastName}
                </span>
                {proposal.status === "pending" && getStatusBadge(proposal.status)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span>{proposal.course?.title || "Course"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(proposal.proposedStartTime), "EEEE, MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {format(new Date(proposal.proposedStartTime), "h:mm a")} -{" "}
                  {format(new Date(proposal.proposedEndTime), "h:mm a")}
                </span>
              </div>
              {proposal.studentMessage && (
                <div className="flex items-start gap-2 rounded-md bg-muted p-2 text-sm">
                  <MessageSquare className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span>"{proposal.studentMessage}"</span>
                </div>
              )}
            </div>

            {proposal.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={isPending}
                  data-testid={`button-reject-${proposal.id}`}
                >
                  <X className="mr-1 h-4 w-4" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => onApprove(proposal.id)}
                  disabled={isPending}
                  data-testid={`button-approve-${proposal.id}`}
                >
                  <Check className="mr-1 h-4 w-4" />
                  Approve
                </Button>
              </div>
            )}

            {proposal.status !== "pending" && (
              <div>{getStatusBadge(proposal.status)}</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Proposal</DialogTitle>
            <DialogDescription>
              Provide a reason for declining this session request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="response">Response (optional)</Label>
              <Textarea
                id="response"
                placeholder="Let the student know why you're declining..."
                value={rejectResponse}
                onChange={(e) => setRejectResponse(e.target.value)}
                data-testid="input-reject-response"
              />
            </div>
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
              onClick={handleReject}
              disabled={isPending}
              data-testid="button-confirm-reject"
            >
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function TutorProposalsPage() {
  const { toast } = useToast();

  const { data: proposals, isLoading } = useQuery<SessionProposalWithDetails[]>({
    queryKey: ["/api/session-proposals/tutor"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/session-proposals/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/session-proposals/tutor"] });
      toast({
        title: "Proposal approved",
        description: "The session has been scheduled.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve proposal.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => {
      return apiRequest("PATCH", `/api/session-proposals/${id}/reject`, { tutorResponse: response });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/session-proposals/tutor"] });
      toast({
        title: "Proposal declined",
        description: "The student has been notified.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to decline proposal.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = (id: string, response: string) => {
    rejectMutation.mutate({ id, response });
  };

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  const pendingProposals = (proposals || []).filter((p) => p.status === "pending");
  const approvedProposals = (proposals || []).filter((p) => p.status === "approved");
  const rejectedProposals = (proposals || []).filter((p) => p.status === "rejected");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
          Session Proposals
        </h1>
        <p className="mt-1 text-muted-foreground">
          Review and respond to student session requests.
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending
            {pendingProposals.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingProposals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            Declined
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingProposals.length > 0 ? (
            <div className="grid gap-4">
              {pendingProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isPending={isPending}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <EmptyState
                  icon={<Calendar className="h-8 w-8" />}
                  title="No pending proposals"
                  description="New session requests from students will appear here."
                  testId="empty-pending"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedProposals.length > 0 ? (
            <div className="grid gap-4">
              {approvedProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isPending={isPending}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <EmptyState
                  icon={<Check className="h-8 w-8" />}
                  title="No approved proposals"
                  description="Approved session proposals will appear here."
                  testId="empty-approved"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedProposals.length > 0 ? (
            <div className="grid gap-4">
              {rejectedProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isPending={isPending}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <EmptyState
                  icon={<X className="h-8 w-8" />}
                  title="No declined proposals"
                  description="Declined session proposals will appear here."
                  testId="empty-rejected"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
