import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Filter } from "lucide-react";
import { useState } from "react";
import { AssignmentCard } from "@/components/dashboard/assignment-card";
import { EmptyState } from "@/components/empty-state";
import { AssignmentCardSkeleton } from "@/components/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AssignmentWithCourse } from "@shared/schema";

interface StudentAssignmentsData {
  pending: AssignmentWithCourse[];
  submitted: AssignmentWithCourse[];
  graded: AssignmentWithCourse[];
}

export default function StudentAssignments() {
  const [courseFilter, setCourseFilter] = useState<string>("all");

  const { data, isLoading } = useQuery<StudentAssignmentsData>({
    queryKey: ["/api/student/assignments"],
  });

  const courses = data
    ? [...new Set([...data.pending, ...data.submitted, ...data.graded].map((a) => a.course))]
    : [];

  const filterByCourse = (assignments: AssignmentWithCourse[]) => {
    if (courseFilter === "all") return assignments;
    return assignments.filter((a) => a.courseId === courseFilter);
  };

  const renderAssignmentList = (
    assignments: AssignmentWithCourse[],
    emptyMessage: string,
    testIdPrefix: string
  ) => {
    const filtered = filterByCourse(assignments);
    if (isLoading) {
      return (
        <div className="space-y-4">
          <AssignmentCardSkeleton />
          <AssignmentCardSkeleton />
          <AssignmentCardSkeleton />
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="No assignments"
          description={emptyMessage}
          testId={`empty-${testIdPrefix}`}
        />
      );
    }
    return (
      <div className="space-y-4">
        {filtered.map((assignment) => (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            testId={`${testIdPrefix}-card-${assignment.id}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
            Assignments
          </h1>
          <p className="mt-1 text-muted-foreground">
            Track your assignments and submissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-48" data-testid="select-course-filter">
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-3 md:w-auto md:inline-grid">
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({data?.pending.length || 0})
          </TabsTrigger>
          <TabsTrigger value="submitted" data-testid="tab-submitted">
            Submitted ({data?.submitted.length || 0})
          </TabsTrigger>
          <TabsTrigger value="graded" data-testid="tab-graded">
            Graded ({data?.graded.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Pending Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {renderAssignmentList(
                data?.pending || [],
                "You're all caught up! No pending assignments.",
                "pending"
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submitted">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Submitted Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {renderAssignmentList(
                data?.submitted || [],
                "No submitted assignments awaiting grading.",
                "submitted"
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graded">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Graded Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {renderAssignmentList(
                data?.graded || [],
                "No graded assignments yet.",
                "graded"
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
