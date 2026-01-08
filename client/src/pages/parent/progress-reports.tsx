import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Eye, Calendar, BookOpen, Users, Clock, Target, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import type { User, Course } from "@shared/schema";

type ReportStatus = "draft" | "submitted" | "approved" | "rejected";

type ReportDetails = {
  id: string;
  type: "session" | "monthly";
  scope?: "individual" | "class";
  status: ReportStatus;
  title: string;
  content: string;
  month?: string | null;
  metricsJson?: {
    expectedMinutes?: number;
    doneMinutes?: number;
    expectedTutorials?: number;
    doneTutorials?: number;
    avgAssignmentPercent?: number;
    rolloverMinutes?: number;
    assignments?: {
      name: string;
      submittedAt: string | null;
      percentMark: number;
      letterGrade: string;
    }[];
  } | null;
  studentId?: string | null;
  courseId?: string | null;
  createdAt: string;
  student?: User | null;
  course?: Course | null;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
};

interface ChildData {
  child: User;
}

interface ParentChildrenData {
  children: ChildData[];
}

const statusClasses: Record<ReportStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
};

export default function ParentProgressReports() {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportDetails | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const { data: childrenData, isLoading: childrenLoading } = useQuery<ParentChildrenData>({
    queryKey: ["/api/parent/dashboard"],
  });

  const children = childrenData?.children || [];
  const activeChildId = selectedChildId || children[0]?.child.id;

  const { data: reports = [], isLoading: reportsLoading } = useQuery<ReportDetails[]>({
    queryKey: ["/api/reports"],
    enabled: !!activeChildId,
  });

  const childReports = reports.filter(
    (r) => r.studentId === activeChildId && r.type === "monthly" && r.status === "approved"
  );

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "C";
  };

  const formatMonth = (month?: string | null) => {
    if (!month) return "N/A";
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  };

  const handleViewReport = (report: ReportDetails) => {
    setSelectedReport(report);
    setViewDialogOpen(true);
  };

  const handleDownloadPdf = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/pdf`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to download PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  const selectedChild = children.find((c) => c.child.id === activeChildId)?.child;

  if (childrenLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <Skeleton className="mb-8 h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <h1 className="mb-8 font-heading text-3xl font-bold" data-testid="text-page-title">
          Progress Reports
        </h1>
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No children linked"
              description="No children are linked to your account yet. Please contact an administrator to set this up."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
            Progress Reports
          </h1>
          <p className="mt-1 text-muted-foreground">
            View your children's monthly progress reports and performance metrics.
          </p>
        </div>

        {children.length > 1 && (
          <Select
            value={activeChildId || ""}
            onValueChange={setSelectedChildId}
          >
            <SelectTrigger className="w-[200px]" data-testid="select-child">
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {children.map((childData) => (
                <SelectItem
                  key={childData.child.id}
                  value={childData.child.id}
                  data-testid={`select-child-${childData.child.id}`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={childData.child.profileImageUrl || undefined}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-xs">
                        {getInitials(childData.child.firstName, childData.child.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    {childData.child.firstName} {childData.child.lastName}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedChild && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedChild.profileImageUrl || undefined} />
                <AvatarFallback>
                  {getInitials(selectedChild.firstName, selectedChild.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>
                  {selectedChild.firstName} {selectedChild.lastName}
                </CardTitle>
                <CardDescription>{selectedChild.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {reportsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : childReports.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No approved reports yet"
              description="Progress reports will appear here once they are approved by a manager."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {childReports.map((report) => (
            <Card key={report.id} data-testid={`card-report-${report.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="line-clamp-1 text-base">{report.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatMonth(report.month)}
                    </CardDescription>
                  </div>
                  <Badge className={statusClasses[report.status]}>{report.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {report.course && (
                  <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    {report.course.title}
                  </div>
                )}

                {report.metricsJson && (
                  <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{report.metricsJson.doneMinutes || 0}m done</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-muted-foreground" />
                      <span>{report.metricsJson.doneTutorials || 0} tutorials</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <BarChart3 className="h-3 w-3 text-muted-foreground" />
                      <span>Avg: {report.metricsJson.avgAssignmentPercent || 0}%</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewReport(report)}
                    data-testid={`button-view-${report.id}`}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPdf(report.id)}
                    data-testid={`button-download-${report.id}`}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReport?.title}</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatMonth(selectedReport.month)}
                </span>
                {selectedReport.course && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {selectedReport.course.title}
                  </span>
                )}
              </div>

              {selectedReport.metricsJson && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-muted-foreground">Expected Minutes</p>
                      <p className="text-lg font-medium">{selectedReport.metricsJson.expectedMinutes || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Done Minutes</p>
                      <p className="text-lg font-medium">{selectedReport.metricsJson.doneMinutes || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tutorials</p>
                      <p className="text-lg font-medium">
                        {selectedReport.metricsJson.doneTutorials || 0} / {selectedReport.metricsJson.expectedTutorials || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Assignment</p>
                      <p className="text-lg font-medium">{selectedReport.metricsJson.avgAssignmentPercent || 0}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rollover Minutes</p>
                      <p className="text-lg font-medium">{selectedReport.metricsJson.rolloverMinutes || 0}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedReport.metricsJson?.assignments && selectedReport.metricsJson.assignments.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Assignments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedReport.metricsJson.assignments.map((assignment, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-md border p-2 text-sm">
                          <span className="font-medium">{assignment.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{assignment.percentMark}%</Badge>
                            <Badge>{assignment.letterGrade}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Narrative</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{selectedReport.content}</p>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleDownloadPdf(selectedReport.id)}
                  data-testid="button-download-pdf"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
