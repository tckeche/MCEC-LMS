import { useQuery } from "@tanstack/react-query";
import { BookOpen, Users, ClipboardList, TrendingUp, Plus, Clock, Calendar } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { CourseCard } from "@/components/dashboard/course-card";
import { EmptyState } from "@/components/empty-state";
import {
  StatCardSkeleton,
  CourseCardSkeleton,
} from "@/components/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format } from "date-fns";
import type { CourseWithTutor } from "@shared/schema";

interface UpcomingSession {
  id: string;
  studentName: string;
  scheduledStartTime: string;
  scheduledMinutes: number;
  status: string;
}

interface TutorDashboardData {
  stats: {
    totalCourses: number;
    totalStudents: number;
    pendingSubmissions: number;
    averageCourseGrade: number | null;
    hoursThisMonth: number;
    totalHours: number;
  };
  courses: CourseWithTutor[];
  recentSubmissions: {
    id: string;
    studentName: string;
    assignmentTitle: string;
    submittedAt: string;
  }[];
  upcomingSessions: UpcomingSession[];
}

export default function TutorDashboard() {
  const { data, isLoading } = useQuery<TutorDashboardData>({
    queryKey: ["/api/tutor/dashboard"],
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
            Tutor Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your courses and track student progress.
          </p>
        </div>
        <Button asChild data-testid="button-create-course">
          <Link href="/tutor/courses/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Course
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="My Courses"
              value={data?.stats.totalCourses || 0}
              icon={<BookOpen className="h-6 w-6" />}
              testId="stat-total-courses"
            />
            <StatCard
              title="Total Students"
              value={data?.stats.totalStudents || 0}
              icon={<Users className="h-6 w-6" />}
              testId="stat-total-students"
            />
            <StatCard
              title="Pending Submissions"
              value={data?.stats.pendingSubmissions || 0}
              icon={<ClipboardList className="h-6 w-6" />}
              testId="stat-pending-submissions"
            />
            <StatCard
              title="Average Grade"
              value={
                data?.stats.averageCourseGrade !== null
                  ? `${data?.stats.averageCourseGrade}%`
                  : "--"
              }
              icon={<TrendingUp className="h-6 w-6" />}
              testId="stat-average-grade"
            />
            <StatCard
              title="Hours This Month"
              value={`${data?.stats.hoursThisMonth || 0}h`}
              icon={<Clock className="h-6 w-6" />}
              testId="stat-hours-month"
            />
            <StatCard
              title="Total Hours"
              value={`${data?.stats.totalHours || 0}h`}
              icon={<Clock className="h-6 w-6" />}
              testId="stat-total-hours"
            />
          </>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold">My Courses</h2>
            <Button variant="outline" asChild size="sm" data-testid="link-view-all-courses">
              <Link href="/tutor/courses">View All</Link>
            </Button>
          </div>
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              <CourseCardSkeleton />
              <CourseCardSkeleton />
            </div>
          ) : data?.courses && data.courses.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {data.courses.slice(0, 4).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  showManageButton
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
                  description="Create your first course to start teaching."
                  action={{
                    label: "Create Course",
                    href: "/tutor/courses/new",
                  }}
                  testId="empty-courses"
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="font-heading text-xl">
                Upcoming Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                      <div className="flex-1">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                        <div className="mt-1 h-3 w-1/2 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : data?.upcomingSessions && data.upcomingSessions.length > 0 ? (
                <div className="space-y-4">
                  {data.upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-3"
                      data-testid={`session-${session.id}`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium">
                          {session.studentName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {format(new Date(session.scheduledStartTime), "MMM d, h:mm a")} - {session.scheduledMinutes} min
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {session.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Calendar className="h-8 w-8" />}
                  title="No upcoming sessions"
                  description="Scheduled tutoring sessions will appear here."
                  testId="empty-sessions"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="font-heading text-xl">
                Recent Submissions
              </CardTitle>
              <Button variant="ghost" size="sm" asChild data-testid="link-view-all-submissions">
                <Link href="/tutor/gradebook">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                      <div className="flex-1">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                        <div className="mt-1 h-3 w-1/2 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : data?.recentSubmissions && data.recentSubmissions.length > 0 ? (
                <div className="space-y-4">
                  {data.recentSubmissions.slice(0, 5).map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center gap-3"
                      data-testid={`submission-${submission.id}`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium">
                          {submission.studentName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {submission.assignmentTitle}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<ClipboardList className="h-8 w-8" />}
                  title="No submissions"
                  description="Student submissions will appear here."
                  testId="empty-submissions"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
