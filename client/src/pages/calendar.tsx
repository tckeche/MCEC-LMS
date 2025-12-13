import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  BookOpen,
  Video,
  Lock,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { differenceInMinutes, addMinutes, isBefore, isAfter } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  parseISO,
} from "date-fns";
import type { TutoringSession, User as UserType, Course } from "@shared/schema";

interface SessionWithDetails extends TutoringSession {
  student?: UserType | null;
  tutor?: UserType | null;
  course?: Course | null;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getStatusBadge(status: string) {
  switch (status) {
    case "scheduled":
      return <Badge variant="secondary">Scheduled</Badge>;
    case "in_progress":
      return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400">In Progress</Badge>;
    case "completed":
      return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">Completed</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    case "missed":
      return <Badge variant="destructive">Missed</Badge>;
    case "postponed":
      return <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400">Postponed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function CalendarLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    </div>
  );
}

interface JoinButtonState {
  canJoin: boolean;
  isLocked: boolean;
  reason: string | null;
  label: string;
}

function getJoinButtonState(
  session: SessionWithDetails,
  userIsActive: boolean
): JoinButtonState {
  const now = new Date();
  const startTime = new Date(session.scheduledStartTime);
  const endTime = new Date(session.scheduledEndTime);
  const minutesUntilStart = differenceInMinutes(startTime, now);
  const joinWindowStart = addMinutes(startTime, -15);
  
  if (!userIsActive) {
    return {
      canJoin: false,
      isLocked: true,
      reason: "Your account is deactivated",
      label: "Account Inactive",
    };
  }

  if (session.status === "completed") {
    return {
      canJoin: false,
      isLocked: true,
      reason: "This session has ended",
      label: "Session Ended",
    };
  }

  if (session.status === "cancelled" || session.status === "missed") {
    return {
      canJoin: false,
      isLocked: true,
      reason: "This session was cancelled or missed",
      label: "Unavailable",
    };
  }

  if (session.status === "postponed") {
    return {
      canJoin: false,
      isLocked: true,
      reason: "This session was postponed",
      label: "Postponed",
    };
  }

  if (isAfter(now, endTime)) {
    return {
      canJoin: false,
      isLocked: true,
      reason: "Session time has passed",
      label: "Session Expired",
    };
  }

  if (isBefore(now, joinWindowStart)) {
    return {
      canJoin: false,
      isLocked: false,
      reason: `Available ${minutesUntilStart > 60 ? Math.floor(minutesUntilStart / 60) + "h " : ""}${minutesUntilStart % 60}min before start`,
      label: "Not Yet",
    };
  }

  if (session.status === "in_progress") {
    return {
      canJoin: true,
      isLocked: false,
      reason: null,
      label: "Rejoin Session",
    };
  }

  return {
    canJoin: true,
    isLocked: false,
    reason: null,
    label: "Join Session",
  };
}

function JoinSessionButton({
  session,
  userIsActive,
  onJoin,
  isJoining,
}: {
  session: SessionWithDetails;
  userIsActive: boolean;
  onJoin: (sessionId: string) => void;
  isJoining: boolean;
}) {
  const state = getJoinButtonState(session, userIsActive);

  if (state.isLocked) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button variant="outline" size="sm" disabled data-testid={`button-join-locked-${session.id}`}>
          <Lock className="mr-1 h-3 w-3" />
          {state.label}
        </Button>
        {state.reason && (
          <span className="text-xs text-muted-foreground">{state.reason}</span>
        )}
      </div>
    );
  }

  if (!state.canJoin) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button variant="outline" size="sm" disabled data-testid={`button-join-waiting-${session.id}`}>
          <Clock className="mr-1 h-3 w-3" />
          {state.label}
        </Button>
        {state.reason && (
          <span className="text-xs text-muted-foreground">{state.reason}</span>
        )}
      </div>
    );
  }

  return (
    <Button
      size="sm"
      onClick={() => onJoin(session.id)}
      disabled={isJoining}
      data-testid={`button-join-session-${session.id}`}
    >
      <Video className="mr-1 h-3 w-3" />
      {isJoining ? "Joining..." : state.label}
    </Button>
  );
}

function SessionCard({
  session,
  userIsActive,
  onJoin,
  isJoining,
}: {
  session: SessionWithDetails;
  userIsActive: boolean;
  onJoin: (sessionId: string) => void;
  isJoining: boolean;
}) {
  const startTime = new Date(session.scheduledStartTime);
  const endTime = new Date(session.scheduledEndTime);

  return (
    <Card className="hover-elevate" data-testid={`session-card-${session.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{session.course?.title || "Course"}</span>
            </div>
            {getStatusBadge(session.status)}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>{format(startTime, "EEEE, MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
              </span>
            </div>
            {session.student && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>
                  Student: {session.student.firstName} {session.student.lastName}
                </span>
              </div>
            )}
            {session.tutor && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>
                  Tutor: {session.tutor.firstName} {session.tutor.lastName}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            {session.isGroupSession && (
              <Badge variant="outline" className="w-fit">
                Group Session
              </Badge>
            )}
            {!session.isGroupSession && <div />}
            {session.status === "scheduled" || session.status === "in_progress" ? (
              <JoinSessionButton
                session={session}
                userIsActive={userIsActive}
                onJoin={onJoin}
                isJoining={isJoining}
              />
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CalendarPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: sessions, isLoading } = useQuery<SessionWithDetails[]>({
    queryKey: ["/api/tutoring-sessions"],
  });

  const joinMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("POST", `/api/tutoring-sessions/${sessionId}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutoring-sessions"] });
      toast({
        title: "Joined session",
        description: "You have joined the tutoring session.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join session.",
        variant: "destructive",
      });
    },
  });

  const handleJoinSession = (sessionId: string) => {
    joinMutation.mutate(sessionId);
  };

  const userIsActive = user?.isActive ?? true;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const getSessionsForDay = (day: Date) => {
    if (!sessions) return [];
    return sessions.filter((session) => {
      const sessionDate = new Date(session.scheduledStartTime);
      return isSameDay(sessionDate, day);
    });
  };

  const selectedDateSessions = selectedDate ? getSessionsForDay(selectedDate) : [];

  const upcomingSessions = (sessions || [])
    .filter((s) => s.status === "scheduled" && new Date(s.scheduledStartTime) >= new Date())
    .sort((a, b) => new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime())
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
          Session Calendar
        </h1>
        <p className="mt-1 text-muted-foreground">
          View and manage your scheduled tutoring sessions.
        </p>
      </div>

      {isLoading ? (
        <CalendarLoadingSkeleton />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg">
                    {format(currentMonth, "MMMM yyyy")}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goToPreviousMonth}
                      data-testid="button-prev-month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToToday}
                      data-testid="button-today"
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goToNextMonth}
                      data-testid="button-next-month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day}
                      className="py-2 text-center text-sm font-medium text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                  {days.map((day, index) => {
                    const daySessions = getSessionsForDay(day);
                    const hasScheduled = daySessions.some((s) => s.status === "scheduled");
                    const hasCompleted = daySessions.some((s) => s.status === "completed");
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const dayIsToday = isToday(day);

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedDate(day)}
                        className={`
                          relative flex aspect-square flex-col items-center justify-start rounded-md p-1 text-sm transition-colors
                          ${isCurrentMonth ? "" : "text-muted-foreground/50"}
                          ${isSelected ? "bg-primary text-primary-foreground" : "hover-elevate"}
                          ${dayIsToday && !isSelected ? "ring-2 ring-primary ring-offset-2" : ""}
                        `}
                        data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                      >
                        <span className={dayIsToday && !isSelected ? "font-bold" : ""}>
                          {format(day, "d")}
                        </span>
                        {daySessions.length > 0 && (
                          <div className="mt-1 flex gap-0.5">
                            {hasScheduled && (
                              <div
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isSelected ? "bg-primary-foreground" : "bg-blue-500"
                                }`}
                              />
                            )}
                            {hasCompleted && (
                              <div
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isSelected ? "bg-primary-foreground" : "bg-green-500"
                                }`}
                              />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Scheduled</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Completed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {selectedDate && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {format(selectedDate, "EEEE, MMMM d")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDateSessions.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDateSessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-start gap-3 rounded-md border p-3"
                          data-testid={`selected-day-session-${session.id}`}
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">
                                {session.course?.title}
                              </p>
                              {getStatusBadge(session.status)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(session.scheduledStartTime), "h:mm a")} -{" "}
                              {format(new Date(session.scheduledEndTime), "h:mm a")}
                            </p>
                            {session.student && (
                              <p className="text-xs text-muted-foreground">
                                {session.student.firstName} {session.student.lastName}
                              </p>
                            )}
                            {session.tutor && (
                              <p className="text-xs text-muted-foreground">
                                with {session.tutor.firstName} {session.tutor.lastName}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground">
                      No sessions on this day
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Video className="h-5 w-5" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingSessions.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-start gap-3 rounded-md border p-3 hover-elevate"
                        data-testid={`upcoming-session-${session.id}`}
                      >
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">
                            {session.course?.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(session.scheduledStartTime), "EEE, MMM d")} at{" "}
                            {format(new Date(session.scheduledStartTime), "h:mm a")}
                          </p>
                        </div>
                        {getStatusBadge(session.status)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<CalendarIcon className="h-8 w-8" />}
                    title="No upcoming sessions"
                    description="Your scheduled sessions will appear here."
                    testId="empty-upcoming"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
