import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, GraduationCap, Users } from "lucide-react";
import { Link, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CourseWithTutor, EnrollmentWithDetails } from "@shared/schema";

export default function ManagerCourseDetail() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithTutor>({
    queryKey: ["/api/courses", courseId],
    enabled: Boolean(courseId),
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<EnrollmentWithDetails[]>({
    queryKey: ["/api/courses", courseId, "enrollments"],
    enabled: Boolean(courseId),
  });

  const enrollmentCount = enrollments?.length || 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild data-testid="button-back-courses">
          <Link href="/manager/courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl" data-testid="text-course-title">
            {courseLoading ? <Skeleton className="h-8 w-48" /> : course?.title || "Course"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Course details and enrollment snapshot.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {courseLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={course?.isActive ? "default" : "secondary"}>
                  {course?.isActive ? "Active" : "Inactive"}
                </Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>Max enrollment: {course?.maxEnrollment ?? "-"}</span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    <span>Tutor</span>
                  </div>
                  <p className="mt-2 text-base font-medium">
                    {course?.tutor
                      ? `${course.tutor.firstName} ${course.tutor.lastName}`
                      : "Unassigned"}
                  </p>
                  <p className="text-sm text-muted-foreground">{course?.tutor?.email || ""}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Enrolled students</span>
                  </div>
                  <p className="mt-2 text-base font-medium" data-testid="text-enrollment-count">
                    {enrollmentsLoading ? "Loading..." : enrollmentCount}
                  </p>
                </div>
              </div>

              {course?.description && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="mt-2 text-sm leading-relaxed">{course.description}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
