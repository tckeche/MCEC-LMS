import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { GradeTable } from "@/components/dashboard/grade-table";
import { EmptyState } from "@/components/empty-state";
import { StatCardSkeleton } from "@/components/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import type { GradeWithDetails, Course } from "@shared/schema";

interface StudentGradesData {
  stats: {
    overallGPA: number | null;
    totalGraded: number;
    averageScore: number | null;
    trend: "up" | "down" | "stable" | null;
  };
  grades: GradeWithDetails[];
  courseAverages: {
    course: Course;
    average: number;
    totalAssignments: number;
    gradedAssignments: number;
  }[];
}

export default function StudentGrades() {
  const { data, isLoading } = useQuery<StudentGradesData>({
    queryKey: ["/api/student/grades"],
  });

  const getTrendIcon = () => {
    if (!data?.stats.trend) return <Minus className="h-6 w-6" />;
    if (data.stats.trend === "up") return <TrendingUp className="h-6 w-6" />;
    if (data.stats.trend === "down") return <TrendingDown className="h-6 w-6" />;
    return <Minus className="h-6 w-6" />;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
          Grades
        </h1>
        <p className="mt-1 text-muted-foreground">
          View your grades and academic performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Overall Average"
              value={
                data?.stats.averageScore !== null
                  ? `${data?.stats.averageScore.toFixed(1)}%`
                  : "--"
              }
              icon={<Trophy className="h-6 w-6" />}
              testId="stat-overall-average"
            />
            <StatCard
              title="Graded Assignments"
              value={data?.stats.totalGraded || 0}
              icon={<Trophy className="h-6 w-6" />}
              testId="stat-graded-assignments"
            />
            <StatCard
              title="Performance Trend"
              value={data?.stats.trend === "up" ? "Improving" : data?.stats.trend === "down" ? "Declining" : "Stable"}
              icon={getTrendIcon()}
              testId="stat-trend"
            />
          </>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Recent Grades</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : data?.grades && data.grades.length > 0 ? (
                <GradeTable grades={data.grades} testId="grades-table" />
              ) : (
                <EmptyState
                  icon={<Trophy className="h-8 w-8" />}
                  title="No grades yet"
                  description="Your grades will appear here once your assignments are graded."
                  testId="empty-grades"
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Course Averages</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : data?.courseAverages && data.courseAverages.length > 0 ? (
                <div className="space-y-4">
                  {data.courseAverages.map((item) => (
                    <div
                      key={item.course.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                      data-testid={`course-average-${item.course.id}`}
                    >
                      <div>
                        <p className="font-medium">{item.course.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.gradedAssignments} of {item.totalAssignments} graded
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{item.average.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Trophy className="h-8 w-8" />}
                  title="No course averages"
                  description="Course averages will appear once you have graded assignments."
                  testId="empty-course-averages"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
