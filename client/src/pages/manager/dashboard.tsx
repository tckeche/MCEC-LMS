import { useQuery } from "@tanstack/react-query";
import { BookOpen, Users, GraduationCap, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  StatCardSkeleton,
} from "@/components/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import type { User, Course } from "@shared/schema";

interface TutorPerformance {
  tutor: User;
  coursesCount: number;
  studentsCount: number;
  averageGrade: number | null;
}

interface ManagerDashboardData {
  stats: {
    totalTutors: number;
    totalStudents: number;
    totalCourses: number;
    averageGrade: number | null;
  };
  tutorPerformance: TutorPerformance[];
  recentCourses: Course[];
}

export default function ManagerDashboard() {
  const { data, isLoading } = useQuery<ManagerDashboardData>({
    queryKey: ["/api/manager/dashboard"],
  });

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "T";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
          Manager Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Monitor tutors, courses, and student performance across the platform.
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
              title="Total Tutors"
              value={data?.stats.totalTutors || 0}
              icon={<GraduationCap className="h-6 w-6" />}
              testId="stat-total-tutors"
            />
            <StatCard
              title="Total Students"
              value={data?.stats.totalStudents || 0}
              icon={<Users className="h-6 w-6" />}
              testId="stat-total-students"
            />
            <StatCard
              title="Active Courses"
              value={data?.stats.totalCourses || 0}
              icon={<BookOpen className="h-6 w-6" />}
              testId="stat-total-courses"
            />
            <StatCard
              title="Platform Avg Grade"
              value={
                typeof data?.stats.averageGrade === "number"
                  ? `${data.stats.averageGrade}%`
                  : "--"
              }
              icon={<TrendingUp className="h-6 w-6" />}
              testId="stat-average-grade"
            />
          </>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="font-heading text-xl">Tutor Performance</CardTitle>
            <Button variant="outline" size="sm" asChild data-testid="link-view-all-tutors">
              <Link href="/manager/tutors">View All</Link>
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
            ) : data?.tutorPerformance && data.tutorPerformance.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tutor</TableHead>
                      <TableHead className="text-center">Courses</TableHead>
                      <TableHead className="text-center">Students</TableHead>
                      <TableHead className="text-center">Avg Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tutorPerformance.slice(0, 5).map((tp) => (
                      <TableRow key={tp.tutor.id} data-testid={`tutor-row-${tp.tutor.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={tp.tutor.profileImageUrl || undefined}
                                className="object-cover"
                              />
                              <AvatarFallback className="text-xs">
                                {getInitials(tp.tutor.firstName, tp.tutor.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {tp.tutor.firstName} {tp.tutor.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{tp.coursesCount}</TableCell>
                        <TableCell className="text-center">{tp.studentsCount}</TableCell>
                        <TableCell className="text-center">
                          {tp.averageGrade !== null ? (
                            <Badge variant="secondary">{tp.averageGrade}%</Badge>
                          ) : (
                            "--"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={<GraduationCap className="h-8 w-8" />}
                title="No tutors yet"
                description="There are no tutors registered on the platform."
                testId="empty-tutors"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="font-heading text-xl">Recent Courses</CardTitle>
            <Button variant="outline" size="sm" asChild data-testid="link-view-all-courses">
              <Link href="/manager/courses">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded bg-muted" />
                    <div className="flex-1">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="mt-1 h-3 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : data?.recentCourses && data.recentCourses.length > 0 ? (
              <div className="space-y-4">
                {data.recentCourses.slice(0, 5).map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center gap-3"
                    data-testid={`course-item-${course.id}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">{course.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {course.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                    <Badge variant={course.isActive ? "default" : "secondary"}>
                      {course.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<BookOpen className="h-8 w-8" />}
                title="No courses yet"
                description="There are no courses on the platform."
                testId="empty-courses"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
