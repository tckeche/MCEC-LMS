import { useQuery } from "@tanstack/react-query";
import { BookOpen, ClipboardList, Trophy, Clock } from "lucide-react";
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
import type {
  CourseWithTutor,
  AssignmentWithCourse,
  AnnouncementWithAuthor,
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

export default function StudentDashboard() {
  const { data, isLoading } = useQuery<StudentDashboardData>({
    queryKey: ["/api/student/dashboard"],
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
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="font-heading text-xl">Upcoming Assignments</CardTitle>
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
                  title="No upcoming assignments"
                  description="You're all caught up! Check back later for new assignments."
                  testId="empty-assignments"
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div>
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
