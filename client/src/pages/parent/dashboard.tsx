import { useQuery } from "@tanstack/react-query";
import { BookOpen, ClipboardList, Trophy, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { CourseCard } from "@/components/dashboard/course-card";
import { AssignmentCard } from "@/components/dashboard/assignment-card";
import { EmptyState } from "@/components/empty-state";
import {
  StatCardSkeleton,
  CourseCardSkeleton,
  AssignmentCardSkeleton,
} from "@/components/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import type {
  User,
  CourseWithTutor,
  AssignmentWithCourse,
} from "@shared/schema";

interface ChildData {
  child: User;
  stats: {
    enrolledCourses: number;
    pendingAssignments: number;
    completedAssignments: number;
    averageGrade: number | null;
  };
  courses: CourseWithTutor[];
  upcomingAssignments: AssignmentWithCourse[];
}

interface ParentDashboardData {
  children: ChildData[];
}

export default function ParentDashboard() {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ParentDashboardData>({
    queryKey: ["/api/parent/dashboard"],
  });

  const selectedChild =
    data?.children.find((c) => c.child.id === selectedChildId) ||
    data?.children[0];

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "C";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
            Parent Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Monitor your children's academic progress and stay informed.
          </p>
        </div>

        {data && data.children.length > 1 && (
          <Select
            value={selectedChildId || data.children[0]?.child.id}
            onValueChange={setSelectedChildId}
          >
            <SelectTrigger className="w-[200px]" data-testid="select-child">
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {data.children.map((childData) => (
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
                        {getInitials(
                          childData.child.firstName,
                          childData.child.lastName
                        )}
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

      {isLoading ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        </>
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
                {getInitials(
                  selectedChild.child.firstName,
                  selectedChild.child.lastName
                )}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-heading text-lg font-semibold" data-testid="text-child-name">
                {selectedChild.child.firstName} {selectedChild.child.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedChild.child.email}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Enrolled Courses"
              value={selectedChild.stats.enrolledCourses}
              icon={<BookOpen className="h-6 w-6" />}
              testId="stat-enrolled-courses"
            />
            <StatCard
              title="Pending Assignments"
              value={selectedChild.stats.pendingAssignments}
              icon={<ClipboardList className="h-6 w-6" />}
              testId="stat-pending-assignments"
            />
            <StatCard
              title="Completed"
              value={selectedChild.stats.completedAssignments}
              icon={<ClipboardList className="h-6 w-6" />}
              testId="stat-completed-assignments"
            />
            <StatCard
              title="Average Grade"
              value={
                selectedChild.stats.averageGrade !== null
                  ? `${selectedChild.stats.averageGrade}%`
                  : "--"
              }
              icon={<Trophy className="h-6 w-6" />}
              testId="stat-average-grade"
            />
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-xl">
                  Upcoming Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedChild.upcomingAssignments.length > 0 ? (
                  <div className="grid gap-4">
                    {selectedChild.upcomingAssignments
                      .slice(0, 3)
                      .map((assignment) => (
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
                    description="All caught up! No pending assignments at this time."
                    testId="empty-assignments"
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-xl">
                  Enrolled Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedChild.courses.length > 0 ? (
                  <div className="grid gap-4">
                    {selectedChild.courses.slice(0, 3).map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        testId={`course-card-${course.id}`}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<BookOpen className="h-8 w-8" />}
                    title="No courses"
                    description="Your child hasn't enrolled in any courses yet."
                    testId="empty-courses"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
