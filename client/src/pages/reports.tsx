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

type ReportStatus = "draft" | "submitted" | "approved" | "rejected";
type ReportType = "session" | "monthly";

type ReportAuthor = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type ReportDetails = {
  id: string;
  type: ReportType;
  status: ReportStatus;
  title: string;
  content: string;
  month?: string | null;
  sessionId?: string | null;
  studentId?: string | null;
  courseId?: string | null;
  createdById: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: ReportAuthor;
  course?: { id: string; title: string } | null;
};

type TutorSession = {
  id: string;
  studentId: string;
  studentName: string;
  scheduledStartTime: string;
  status: string;
};

type TutorStudentCourse = {
  student: ReportAuthor;
  courseName: string;
  enrollment: {
    courseId: string;
    studentId: string;
  };
};

const statusClasses: Record<ReportStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

const formatUserName = (user?: ReportAuthor | null) => {
  if (!user) return "Unknown";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return fullName || user.email || "Unknown";
};

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reportType, setReportType] = useState<ReportType>("session");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [month, setMonth] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [studentCourseKey, setStudentCourseKey] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectingReportId, setRejectingReportId] = useState<string | null>(null);

  const { data: reports = [], isLoading } = useQuery<ReportDetails[]>({
    queryKey: ["/api/reports"],
  });

  const { data: tutorSessions = [] } = useQuery<TutorSession[]>({
    queryKey: ["/api/tutor/sessions"],
    enabled: user?.role === "tutor",
  });

  const { data: tutorStudents } = useQuery<{ students: TutorStudentCourse[] }>({
    queryKey: ["/api/tutor/students"],
    enabled: user?.role === "tutor",
  });

  const sessionOptions = useMemo(
    () => tutorSessions.filter((session) => session.status !== "cancelled"),
    [tutorSessions],
  );

  const studentCourseOptions = useMemo(() => tutorStudents?.students ?? [], [tutorStudents]);

  const createReportMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = { type: reportType, title, content };
      if (reportType === "monthly") {
        payload.month = month;
        if (studentCourseKey) {
          const [studentId, courseId] = studentCourseKey.split(":");
          payload.studentId = studentId;
          payload.courseId = courseId;
        }
      }
      if (reportType === "session") {
        payload.sessionId = sessionId;
      }
      const res = await apiRequest("POST", "/api/reports", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Report created", description: "Your report draft is ready." });
      setTitle("");
      setContent("");
      setMonth("");
      setSessionId("");
      setStudentCourseKey("");
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create report", description: error.message, variant: "destructive" });
    },
  });

  const submitReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const res = await apiRequest("POST", `/api/reports/${reportId}/submit`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Report submitted", description: "Your report is now awaiting approval." });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
    onError: (error: Error) => {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    },
  });

  const approveReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const res = await apiRequest("POST", `/api/reports/${reportId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Report approved", description: "The report has been approved." });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
    onError: (error: Error) => {
      toast({ title: "Approval failed", description: error.message, variant: "destructive" });
    },
  });

  const rejectReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const res = await apiRequest("POST", `/api/reports/${reportId}/reject`, {
        rejectionReason,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Report rejected", description: "The report has been rejected." });
      setRejectionReason("");
      setRejectingReportId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
    onError: (error: Error) => {
      toast({ title: "Rejection failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-full bg-background p-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Progress reports</h1>
          <p className="text-sm text-muted-foreground">
            Progress reports summarize student learning for each course and are visible only to authorized roles. Monthly
            reports require approval.
          </p>
        </div>

        {user?.role === "tutor" && (
          <Card>
            <CardHeader>
              <CardTitle>Create a progress report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Report type</Label>
                  <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="session">Session progress report</SelectItem>
                      <SelectItem value="monthly">Monthly progress report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {reportType === "monthly" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="month">Month</Label>
                      <Input
                        id="month"
                        type="month"
                        value={month}
                        onChange={(event) => setMonth(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Student & course</Label>
                      <Select value={studentCourseKey} onValueChange={setStudentCourseKey}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a student and course" />
                        </SelectTrigger>
                        <SelectContent>
                          {studentCourseOptions.length === 0 && (
                            <SelectItem value="none" disabled>
                              No students available
                            </SelectItem>
                          )}
                          {studentCourseOptions.map((entry) => {
                            const key = `${entry.enrollment.studentId}:${entry.enrollment.courseId}`;
                            return (
                              <SelectItem key={key} value={key}>
                                {formatUserName(entry.student)} • {entry.courseName}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label>Session</Label>
                    <Select value={sessionId} onValueChange={setSessionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a session" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessionOptions.length === 0 && (
                          <SelectItem value="none" disabled>
                            No sessions available
                          </SelectItem>
                        )}
                        {sessionOptions.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            {session.studentName} • {new Date(session.scheduledStartTime).toLocaleDateString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Progress report title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Progress notes</Label>
                <Textarea
                  id="content"
                  rows={5}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Write the progress report..."
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => createReportMutation.mutate()}
                  disabled={
                    createReportMutation.isPending ||
                    !title.trim() ||
                    !content.trim() ||
                    (reportType === "monthly" && (!month || !studentCourseKey)) ||
                    (reportType === "session" && !sessionId)
                  }
                >
                  Save Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Progress report inbox</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports available yet.</p>
            ) : (
              reports.map((report) => {
                const isTutorOwner = report.createdById === user?.id;
                const canSubmit = isTutorOwner && (report.status === "draft" || report.status === "rejected");
                const canApprove = ["admin", "manager"].includes(user?.role ?? "") && report.status === "submitted";
                return (
                  <div key={report.id} className="rounded-lg border border-border/60 p-4 space-y-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{report.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {report.type === "monthly"
                            ? `Month: ${report.month ?? "Unknown"}`
                            : "Session progress report"}{" "}
                          {report.course?.title ? `• ${report.course.title}` : ""} • Author: {formatUserName(report.createdBy)}
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClasses[report.status]}`}>
                        {report.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{report.content}</p>
                    {report.rejectionReason && (
                      <p className="text-xs text-rose-600">Rejection reason: {report.rejectionReason}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {canSubmit && (
                        <Button
                          size="sm"
                          onClick={() => submitReportMutation.mutate(report.id)}
                          disabled={submitReportMutation.isPending}
                        >
                          Submit for approval
                        </Button>
                      )}
                      {canApprove && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => approveReportMutation.mutate(report.id)}
                            disabled={approveReportMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectingReportId(report.id)}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                    {rejectingReportId === report.id && (
                      <div className="space-y-2">
                        <Label htmlFor={`reject-${report.id}`}>Rejection reason</Label>
                        <Textarea
                          id={`reject-${report.id}`}
                          rows={3}
                          value={rejectionReason}
                          onChange={(event) => setRejectionReason(event.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectReportMutation.mutate(report.id)}
                            disabled={!rejectionReason.trim() || rejectReportMutation.isPending}
                          >
                            Confirm reject
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRejectingReportId(null);
                              setRejectionReason("");
                            }}
                          >
                            Cancel
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
