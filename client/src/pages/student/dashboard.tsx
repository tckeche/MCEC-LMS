import { useQuery } from "@tanstack/react-query";
import { BookOpen, ClipboardList, Trophy, Clock, Calendar, Video, ChevronLeft, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { format, isAfter, parseISO, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from "date-fns";
import { useState } from "react";
import { Link } from "wouter";
import { StatCard } from "@/components/dashboard/stat-card";
import { CourseCard } from "@/components/dashboard/course-card";
import { AssignmentCard } from "@/components/dashboard/assignment-card";
import { AnnouncementCard } from "@/components/dashboard/announcement-card";
import { EmptyState } from "@/components/empty-state";
import {
  StatCardSkeleton,
  CourseCardSkeleton,
  AssignmentCardSkeleton,
  AnnouncementCardSkeleton,
} from "@/components/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  CourseWithTutor,
  AssignmentWithCourse,
  AnnouncementWithAuthor,
  HourWallet,
  TutoringSessionWithDetails,
} from "@shared/schema";

interface StudentDashboardData {
  stats: {
    enrolledCourses: number;
    pendingAssignments: number;
    completedAssignments: number;
    averageGrade: number | null;
  };
  courses: CourseWithTutor[];
  upcomingAssignments: AssignmentWithCourse[];
  announcements: AnnouncementWithAuthor[];
}

function formatHours(minutes: number): string {
  const hours = minutes / 60;
  if (hours === 0) return "0";
  if (hours < 1) return hours.toFixed(1);
  if (Number.isInteger(hours)) return hours.toString();
  return hours.toFixed(1);
}

function HoursDonutChart({ usedMinutes, remainingMinutes, courseId }: { usedMinutes: number; remainingMinutes: number; courseId: string }) {
  const totalMinutes = usedMinutes + remainingMinutes;
  
  if (totalMinutes === 0) {
    return (
      <div className="flex items-center gap-2" data-testid={`hours-empty-${courseId}`}>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <Clock className="h-3 w-3 text-muted-foreground" />
        </div>
        <span className="text-xs text-muted-foreground">No hours</span>
      </div>
    );
  }

  const data = [
    { name: "Used", value: usedMinutes },
    { name: "Remaining", value: remainingMinutes },
  ];
  
  const COLORS = ["hsl(var(--primary))", "hsl(var(--muted))"];
  const usedHours = formatHours(usedMinutes);
  const totalHours = formatHours(totalMinutes);
  const remainingHours = formatHours(remainingMinutes);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 cursor-help" data-testid={`hours-chart-${courseId}`}>
          <div className="h-8 w-8">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={10}
                  outerRadius={14}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs" data-testid={`hours-text-${courseId}`}>
            <span className="font-medium">{usedHours}h</span>
            <span className="text-muted-foreground"> / {totalHours}h</span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <p>Used: {usedHours} hours</p>
          <p>Remaining: {remainingHours} hours</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function WeekCalendar({ sessions }: { sessions: TutoringSessionWithDetails[] }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const getSessionsForDay = (day: Date) => {
    return sessions.filter(session => {
      const sessionDate = typeof session.scheduledStartTime === 'string' 
        ? parseISO(session.scheduledStartTime) 
        : session.scheduledStartTime;
      return isSameDay(sessionDate, day);
    });
  };

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-500",
    in_progress: "bg-green-500",
    completed: "bg-muted-foreground",
    missed: "bg-destructive",
    postponed: "bg-yellow-500",
    cancelled: "bg-muted-foreground",
  };

  return (
    <div data-testid="week-calendar">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">
          {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </span>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            data-testid="btn-prev-week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
            data-testid="btn-today"
          >
            Today
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            data-testid="btn-next-week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const daySessions = getSessionsForDay(day);
          const isToday = isSameDay(day, today);
          return (
            <div 
              key={index} 
              className={`flex flex-col items-center rounded-md p-2 min-h-[80px] ${isToday ? 'bg-primary/10 ring-1 ring-primary' : 'bg-muted/30'}`}
              data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
            >
              <span className="text-xs text-muted-foreground">{format(day, "EEE")}</span>
              <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>{format(day, "d")}</span>
              <div className="flex flex-col gap-1 mt-1 w-full">
                {daySessions.slice(0, 2).map(session => {
                  const sessionDate = typeof session.scheduledStartTime === 'string' 
                    ? parseISO(session.scheduledStartTime) 
                    : session.scheduledStartTime;
                  return (
                    <Tooltip key={session.id}>
                      <TooltipTrigger asChild>
                        <div 
                          className={`w-full h-1.5 rounded-full ${statusColors[session.status] || 'bg-muted'}`}
                          data-testid={`calendar-session-${session.id}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <p className="font-medium">{session.course?.title}</p>
                          <p>{format(sessionDate, "h:mm a")}</p>
                          <p className="text-muted-foreground capitalize">{session.status.replace("_", " ")}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {daySessions.length > 2 && (
                  <span className="text-[10px] text-muted-foreground text-center">+{daySessions.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-center">
        <Link href="/calendar">
          <Button variant="ghost" size="sm" data-testid="link-full-calendar">
            View Full Calendar
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { data, isLoading } = useQuery<StudentDashboardData>({
    queryKey: ["/api/student/dashboard"],
  });

  const { data: hourWallets, isLoading: walletsLoading } = useQuery<HourWallet[]>({
    queryKey: ["/api/hour-wallets/student"],
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<TutoringSessionWithDetails[]>({
    queryKey: ["/api/tutoring-sessions"],
  });

  const activeSessions = sessions?.filter(s => 
    s.status !== "cancelled" && s.status !== "missed"
  ) || [];

  const upcomingSessions = sessions?.filter(s => {
    if (s.status === "cancelled" || s.status === "completed" || s.status === "missed") return false;
    const startTime = typeof s.scheduledStartTime === 'string' 
      ? parseISO(s.scheduledStartTime) 
      : s.scheduledStartTime;
    return isAfter(startTime, new Date());
  }).slice(0, 3) || [];

  const walletsByCourseMap = new Map<string, { usedMinutes: number; remainingMinutes: number }>();
  hourWallets?.forEach(wallet => {
    const existing = walletsByCourseMap.get(wallet.courseId) || { usedMinutes: 0, remainingMinutes: 0 };
    existing.usedMinutes += wallet.consumedMinutes || 0;
    existing.remainingMinutes += Math.max(0, (wallet.purchasedMinutes || 0) - (wallet.consumedMinutes || 0));
    walletsByCourseMap.set(wallet.courseId, existing);
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back! Here's an overview of your learning progress.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Enrolled Courses"
              value={data?.stats.enrolledCourses || 0}
              icon={<BookOpen className="h-6 w-6" />}
              testId="stat-enrolled-courses"
            />
            <StatCard
              title="Pending Assignments"
              value={data?.stats.pendingAssignments || 0}
              icon={<Clock className="h-6 w-6" />}
              testId="stat-pending-assignments"
            />
            <StatCard
              title="Completed"
              value={data?.stats.completedAssignments || 0}
              icon={<ClipboardList className="h-6 w-6" />}
              testId="stat-completed-assignments"
            />
            <StatCard
              title="Average Grade"
              value={
                data?.stats.averageGrade !== null
                  ? `${data?.stats.averageGrade}%`
                  : "--"
              }
              icon={<Trophy className="h-6 w-6" />}
              testId="stat-average-grade"
            />
          </>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="font-heading text-xl">
                <Calendar className="mr-2 inline-block h-5 w-5" />
                Session Calendar
              </CardTitle>
              {upcomingSessions.length > 0 && (
                <Badge variant="secondary">{upcomingSessions.length} upcoming</Badge>
              )}
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                </div>
              ) : (
                <WeekCalendar sessions={activeSessions} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="font-heading text-xl">Tasks Due</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid gap-4">
                  <AssignmentCardSkeleton />
                  <AssignmentCardSkeleton />
                </div>
              ) : data?.upcomingAssignments && data.upcomingAssignments.length > 0 ? (
                <div className="grid gap-4">
                  {data.upcomingAssignments.slice(0, 3).map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      testId={`assignment-card-${assignment.id}`}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<ClipboardList className="h-8 w-8" />}
                  title="No tasks due"
                  description="You're all caught up! Check back later for new assignments."
                  testId="empty-assignments"
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">
                <Clock className="mr-2 inline-block h-5 w-5" />
                Hours by Course
              </CardTitle>
            </CardHeader>
            <CardContent>
              {walletsLoading || isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : data?.courses && data.courses.length > 0 ? (
                <div className="space-y-4" data-testid="hours-by-course">
                  {data.courses.map((course) => {
                    const hours = walletsByCourseMap.get(course.id) || { usedMinutes: 0, remainingMinutes: 0 };
                    return (
                      <div 
                        key={course.id} 
                        className="flex items-center justify-between gap-4 rounded-md border p-3"
                        data-testid={`course-hours-${course.id}`}
                      >
                        <span className="text-sm font-medium truncate flex-1">{course.title}</span>
                        <HoursDonutChart 
                          usedMinutes={hours.usedMinutes} 
                          remainingMinutes={hours.remainingMinutes} 
                          courseId={course.id}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<BookOpen className="h-8 w-8" />}
                  title="No courses"
                  description="Enroll in courses to see your hours."
                  testId="empty-hours"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <AnnouncementCardSkeleton />
                  <AnnouncementCardSkeleton />
                </div>
              ) : data?.announcements && data.announcements.length > 0 ? (
                <div className="space-y-4">
                  {data.announcements.slice(0, 3).map((announcement) => (
                    <AnnouncementCard
                      key={announcement.id}
                      announcement={announcement}
                      testId={`announcement-card-${announcement.id}`}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<BookOpen className="h-8 w-8" />}
                  title="No announcements"
                  description="There are no announcements at this time."
                  testId="empty-announcements"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 font-heading text-xl font-semibold">My Courses</h2>
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <CourseCardSkeleton />
            <CourseCardSkeleton />
            <CourseCardSkeleton />
          </div>
        ) : data?.courses && data.courses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                testId={`course-card-${course.id}`}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8">
              <EmptyState
                icon={<BookOpen className="h-8 w-8" />}
                title="No courses yet"
                description="You haven't enrolled in any courses yet. Browse available courses to get started."
                action={{
                  label: "Browse Courses",
                  href: "/courses",
                }}
                testId="empty-courses"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
