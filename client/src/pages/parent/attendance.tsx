import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Users } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User, TutoringSessionWithDetails, TutoringSessionStatus } from "@shared/schema";

interface ChildData {
  child: User;
}

interface ParentDashboardData {
  children: ChildData[];
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function getStatusBadgeVariant(status: TutoringSessionStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "completed":
      return "default";
    case "in_progress":
    case "scheduled":
      return "secondary";
    case "missed":
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusIcon(status: TutoringSessionStatus) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-3 w-3" />;
    case "missed":
    case "cancelled":
      return <XCircle className="h-3 w-3" />;
    case "in_progress":
      return <Clock className="h-3 w-3" />;
    default:
      return <Calendar className="h-3 w-3" />;
  }
}

export default function ParentAttendance() {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: dashboardData, isLoading: isLoadingChildren } = useQuery<ParentDashboardData>({
    queryKey: ["/api/parent/dashboard"],
  });

  const selectedChild =
    dashboardData?.children.find((c) => c.child.id === selectedChildId) ||
    dashboardData?.children[0];

  const { data: sessions, isLoading: isLoadingSessions } = useQuery<TutoringSessionWithDetails[]>({
    queryKey: ["/api/parent/children", selectedChild?.child.id, "sessions"],
    enabled: !!selectedChild?.child.id,
    queryFn: async () => {
      const res = await fetch(`/api/parent/children/${selectedChild?.child.id}/sessions`);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
  });

  const filteredSessions = sessions?.filter((session) => {
    return statusFilter === "all" || session.status === statusFilter;
  });

  const stats = sessions
    ? {
        total: sessions.length,
        completed: sessions.filter((s) => s.status === "completed").length,
        scheduled: sessions.filter((s) => s.status === "scheduled").length,
        missed: sessions.filter((s) => s.status === "missed").length,
        totalMinutes: sessions
          .filter((s) => s.status === "completed")
          .reduce((sum, s) => sum + (s.scheduledMinutes || 0), 0),
      }
    : { total: 0, completed: 0, scheduled: 0, missed: 0, totalMinutes: 0 };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "C";
  };

  const isLoading = isLoadingChildren || isLoadingSessions;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
            Session Attendance
          </h1>
          <p className="mt-1 text-muted-foreground">
            Track your children's tutoring session attendance
          </p>
        </div>

        {dashboardData && dashboardData.children.length > 1 && (
          <Select
            value={selectedChildId || dashboardData.children[0]?.child.id}
            onValueChange={setSelectedChildId}
          >
            <SelectTrigger className="w-[200px]" data-testid="select-child">
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {dashboardData.children.map((childData) => (
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

      {isLoadingChildren ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : !selectedChild ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No children linked"
              description="No children are linked to your account yet. Please contact an administrator to set this up."
              testId="empty-children"
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={selectedChild.child.profileImageUrl || undefined}
                className="object-cover"
              />
              <AvatarFallback>
                {getInitials(selectedChild.child.firstName, selectedChild.child.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-heading text-lg font-semibold" data-testid="text-child-name">
                {selectedChild.child.firstName} {selectedChild.child.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">{selectedChild.child.email}</p>
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sessions</p>
                    <p className="text-2xl font-bold" data-testid="stat-total-sessions">{stats.total}</p>
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
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold" data-testid="stat-completed-sessions">{stats.completed}</p>
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
                    <p className="text-sm text-muted-foreground">Scheduled</p>
                    <p className="text-2xl font-bold" data-testid="stat-scheduled-sessions">{stats.scheduled}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/10">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Time</p>
                    <p className="text-2xl font-bold" data-testid="stat-total-time">
                      {formatMinutes(stats.totalMinutes)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle className="font-heading text-xl">Session History</CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44" data-testid="select-session-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                    <SelectItem value="postponed">Postponed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSessions ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : filteredSessions && filteredSessions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Tutor</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSessions.map((session) => (
                        <TableRow key={session.id} data-testid={`session-row-${session.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {format(new Date(session.scheduledStartTime), "MMM d, yyyy")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(session.scheduledStartTime), "h:mm a")} -{" "}
                                {format(new Date(session.scheduledEndTime), "h:mm a")}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{session.course?.title || "-"}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={session.tutor?.profileImageUrl || undefined}
                                  className="object-cover"
                                />
                                <AvatarFallback className="text-xs">
                                  {getInitials(session.tutor?.firstName, session.tutor?.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                {session.tutor?.firstName} {session.tutor?.lastName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatMinutes(session.scheduledMinutes || 0)}
                          </TableCell>
                          <TableCell>
                            {session.status === "completed" ? (
                              <span className="font-medium">
                                {formatMinutes(session.scheduledMinutes || 0)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(session.status as TutoringSessionStatus)}>
                              {getStatusIcon(session.status as TutoringSessionStatus)}
                              <span className="ml-1">{session.status}</span>
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  icon={<Calendar className="h-8 w-8" />}
                  title="No sessions found"
                  description={
                    statusFilter !== "all"
                      ? "Try adjusting your filter"
                      : "No tutoring sessions have been scheduled yet."
                  }
                  testId="empty-sessions"
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
