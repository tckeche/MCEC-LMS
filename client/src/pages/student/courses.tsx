import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search } from "lucide-react";
import { useState } from "react";
import { CourseCard } from "@/components/dashboard/course-card";
import { EmptyState } from "@/components/empty-state";
import { CourseCardSkeleton } from "@/components/loading-skeleton";
import { Input } from "@/components/ui/input";
import type { CourseWithTutor } from "@shared/schema";

export default function StudentCourses() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: courses, isLoading } = useQuery<CourseWithTutor[]>({
    queryKey: ["/api/student/courses"],
  });

  const filteredCourses = courses?.filter(
    (course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
            My Courses
          </h1>
          <p className="mt-1 text-muted-foreground">
            View and access your enrolled courses
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-courses"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </div>
      ) : filteredCourses && filteredCourses.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              testId={`course-card-${course.id}`}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title={searchQuery ? "No courses found" : "No enrolled courses"}
          description={
            searchQuery
              ? "Try adjusting your search query"
              : "You haven't enrolled in any courses yet. Contact your tutor to get started."
          }
          testId="empty-courses"
        />
      )}
    </div>
  );
}
