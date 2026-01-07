import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type DisputeStatus = "open" | "under_review" | "resolved" | "rejected";
type DisputeTargetType = "session" | "invoice" | "report";

type Dispute = {
  id: string;
  targetType: DisputeTargetType;
  targetId: string;
  status: DisputeStatus;
  reason: string;
  resolutionNotes?: string | null;
  createdById: string;
  createdAt: string;
};

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  status: string;
};

type ReportSummary = {
  id: string;
  title: string;
  type: string;
};

type TutorSession = {
  id: string;
  studentId: string;
  studentName: string;
  scheduledStartTime: string;
  status: string;
};

type ParentChild = {
  childId: string;
  child: { id: string; firstName?: string | null; lastName?: string | null; email?: string | null };
};

type SessionWithDetails = {
  id: string;
  scheduledStartTime: string;
  status: string;
  studentId?: string | null;
  student?: { firstName?: string | null; lastName?: string | null; email?: string | null };
  tutor?: { firstName?: string | null; lastName?: string | null; email?: string | null };
};

const statusClasses: Record<DisputeStatus, string> = {
  open: "bg-amber-100 text-amber-700",
  under_review: "bg-blue-100 text-blue-700",
  resolved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

export default function DisputesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [targetType, setTargetType] = useState<DisputeTargetType>("session");
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  const { data: disputes = [], isLoading } = useQuery<Dispute[]>({
    queryKey: ["/api/disputes"],
  });

  const { data: invoices = [] } = useQuery<InvoiceSummary[]>({
    queryKey: ["/api/invoices"],
    enabled: targetType === "invoice",
  });

  const { data: reports = [] } = useQuery<ReportSummary[]>({
    queryKey: ["/api/reports"],
    enabled: targetType === "report",
  });

  const { data: tutorSessions = [] } = useQuery<TutorSession[]>({
    queryKey: ["/api/tutor/sessions"],
    enabled: user?.role === "tutor" && targetType === "session",
  });

  const { data: studentSessions = [] } = useQuery<SessionWithDetails[]>({
    queryKey: ["/api/tutoring-sessions"],
    enabled: user?.role === "student" && targetType === "session",
  });

  const { data: parentChildren = [] } = useQuery<ParentChild[]>({
    queryKey: ["/api/parent/children"],
    enabled: user?.role === "parent",
  });

  const [selectedChildId, setSelectedChildId] = useState<string>("");

  const { data: parentSessions = [] } = useQuery<SessionWithDetails[]>({
    queryKey: ["/api/parent/children", selectedChildId, "sessions"],
    enabled: user?.role === "parent" && targetType === "session" && Boolean(selectedChildId),
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/parent/children/${selectedChildId}/sessions`);
      return res.json();
    },
  });

  const sessionOptions = useMemo(() => {
    if (user?.role === "tutor") return tutorSessions;
    if (user?.role === "student") return studentSessions;
    if (user?.role === "parent") return parentSessions;
    return [];
  }, [parentSessions, studentSessions, tutorSessions, user?.role]);

  const shouldShowTargetInput = useMemo(() => {
    if (targetType === "session") return sessionOptions.length === 0;
    if (targetType === "invoice") return invoices.length === 0;
    if (targetType === "report") return reports.length === 0;
    return false;
  }, [invoices.length, reports.length, sessionOptions.length, targetType]);

  const getSessionLabel = (session: TutorSession | SessionWithDetails) => {
    if ("studentName" in session && session.studentName) {
      return session.studentName;
    }
    const student = session.student;
    if (student) {
      return [student.firstName, student.lastName].filter(Boolean).join(" ") || student.email || "Student";
    }
    return "Session";
  };

  const createDisputeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/disputes", { targetType, targetId, reason });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Dispute opened", description: "We have recorded your dispute." });
      setTargetId("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/disputes"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create dispute", description: error.message, variant: "destructive" });
    },
  });

  const reviewDisputeMutation = useMutation({
    mutationFn: async (disputeId: string) => {
      const res = await apiRequest("POST", `/api/disputes/${disputeId}/review`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Dispute updated", description: "Marked as under review." });
      queryClient.invalidateQueries({ queryKey: ["/api/disputes"] });
    },
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: async (disputeId: string) => {
      const res = await apiRequest("POST", `/api/disputes/${disputeId}/resolve`, {
        resolutionNotes: resolutionNotes[disputeId],
      });
      return res.json();
    },
    onSuccess: (_data, disputeId) => {
      toast({ title: "Dispute resolved", description: "Resolution recorded." });
      setResolutionNotes((prev) => {
        const { [disputeId]: _removed, ...rest } = prev;
        return rest;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/disputes"] });
    },
  });

  const rejectDisputeMutation = useMutation({
    mutationFn: async (disputeId: string) => {
      const res = await apiRequest("POST", `/api/disputes/${disputeId}/reject`, {
        resolutionNotes: resolutionNotes[disputeId],
      });
      return res.json();
    },
    onSuccess: (_data, disputeId) => {
      toast({ title: "Dispute rejected", description: "Rejection recorded." });
      setResolutionNotes((prev) => {
        const { [disputeId]: _removed, ...rest } = prev;
        return rest;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/disputes"] });
    },
  });

  return (
    <div className="min-h-full bg-background p-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Disputes</h1>
          <p className="text-sm text-muted-foreground">
            Open a dispute linked to a session, invoice, or report. Admins and managers can review and resolve them.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Open a dispute</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Target type</Label>
                <Select value={targetType} onValueChange={(value) => {
                  setTargetType(value as DisputeTargetType);
                  setTargetId("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="session">Session</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {targetType === "session" && user?.role === "parent" && (
                <div className="space-y-2">
                  <Label>Child</Label>
                  <Select value={selectedChildId} onValueChange={(value) => {
                    setSelectedChildId(value);
                    setTargetId("");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select child" />
                    </SelectTrigger>
                    <SelectContent>
                      {parentChildren.length === 0 && (
                        <SelectItem value="none" disabled>
                          No children linked
                        </SelectItem>
                      )}
                      {parentChildren.map((child) => (
                        <SelectItem key={child.childId} value={child.childId}>
                          {child.child?.firstName || child.child?.email || "Child"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {targetType === "session" && (
              <div className="space-y-2">
                <Label>Session</Label>
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionOptions.length === 0 && (
                      <SelectItem value="none" disabled>
                        No sessions available
                      </SelectItem>
                    )}
                    {sessionOptions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {getSessionLabel(session)} • {new Date(session.scheduledStartTime).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {targetType === "invoice" && (
              <div className="space-y-2">
                <Label>Invoice</Label>
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.length === 0 && (
                      <SelectItem value="none" disabled>
                        No invoices available
                      </SelectItem>
                    )}
                    {invoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} • {invoice.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {targetType === "report" && (
              <div className="space-y-2">
                <Label>Report</Label>
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report" />
                  </SelectTrigger>
                  <SelectContent>
                    {reports.length === 0 && (
                      <SelectItem value="none" disabled>
                        No reports available
                      </SelectItem>
                    )}
                    {reports.map((report) => (
                      <SelectItem key={report.id} value={report.id}>
                        {report.title} • {report.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {shouldShowTargetInput && (
              <div className="space-y-2">
                <Label htmlFor="target-id">Target ID</Label>
                <Input
                  id="target-id"
                  value={targetId}
                  onChange={(event) => setTargetId(event.target.value)}
                  placeholder="Paste the target ID if not listed"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Describe the issue..."
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => createDisputeMutation.mutate()}
                disabled={createDisputeMutation.isPending || !targetId.trim() || reason.trim().length < 10}
              >
                Open dispute
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dispute inbox</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : disputes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No disputes found.</p>
            ) : (
              disputes.map((dispute) => {
                const canManage = ["admin", "manager"].includes(user?.role ?? "");
                const notesValue = resolutionNotes[dispute.id] ?? "";
                return (
                  <div key={dispute.id} className="rounded-lg border border-border/60 p-4 space-y-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {dispute.targetType} dispute • {dispute.targetId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Opened {new Date(dispute.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClasses[dispute.status]}`}>
                        {dispute.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{dispute.reason}</p>
                    {dispute.resolutionNotes && (
                      <p className="text-xs text-muted-foreground">Resolution: {dispute.resolutionNotes}</p>
                    )}
                    {canManage && (dispute.status === "open" || dispute.status === "under_review") && (
                      <div className="space-y-2">
                        <Label htmlFor={`resolution-${dispute.id}`}>Resolution notes</Label>
                        <Textarea
                          id={`resolution-${dispute.id}`}
                          rows={3}
                          value={notesValue}
                          onChange={(event) =>
                            setResolutionNotes((prev) => ({ ...prev, [dispute.id]: event.target.value }))
                          }
                        />
                        <div className="flex flex-wrap gap-2">
                          {dispute.status === "open" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reviewDisputeMutation.mutate(dispute.id)}
                            >
                              Mark under review
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => resolveDisputeMutation.mutate(dispute.id)}
                            disabled={notesValue.trim().length < 3}
                          >
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectDisputeMutation.mutate(dispute.id)}
                            disabled={notesValue.trim().length < 3}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
