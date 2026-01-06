import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search, Users, GraduationCap } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import type { Course, User } from "@shared/schema";
import { Link } from "wouter";

interface CourseWithTutor extends Course {
  tutor?: User | null;
  enrollmentCount?: number;
}

export default function ManagerCourses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: courses, isLoading } = useQuery<CourseWithTutor[]>({
    queryKey: ["/api/courses"],
  });

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "T";
  };

  const filteredCourses = courses?.filter((course) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && course.isActive) ||
      (statusFilter === "inactive" && !course.isActive);
    const matchesSearch =
      searchQuery === "" ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = courses
    ? {
        total: courses.length,
        active: courses.filter((c) => c.isActive).length,
        inactive: courses.filter((c) => !c.isActive).length,
      }
    : { total: 0, active: 0, inactive: 0 };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
          Courses
        </h1>
        <p className="mt-1 text-muted-foreground">
          View all courses across the platform.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a course to review its tutor, status, and enrollment details.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {isLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Courses</p>
                    <p className="text-2xl font-bold" data-testid="stat-total-courses">
                      {stats.total}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-500/10">
                    <BookOpen className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold" data-testid="stat-active-courses">
                      {stats.active}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-yellow-500/10">
                    <BookOpen className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Inactive</p>
                    <p className="text-2xl font-bold" data-testid="stat-inactive-courses">
                      {stats.inactive}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="font-heading text-xl">All Courses</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 pl-9"
                  data-testid="input-search-courses"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36" data-testid="select-course-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filteredCourses && filteredCourses.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Tutor</TableHead>
                    <TableHead className="text-center">Enrolled</TableHead>
                    <TableHead className="text-center">Max</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course) => (
                    <TableRow key={course.id} data-testid={`course-row-${course.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{course.title}</p>
                            {course.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {course.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {course.tutor ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage
                                src={course.tutor.profileImageUrl || undefined}
                                className="object-cover"
                              />
                              <AvatarFallback className="text-xs">
                                {getInitials(course.tutor.firstName, course.tutor.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {course.tutor.firstName} {course.tutor.lastName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{course.enrollmentCount || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {course.maxEnrollment || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={course.isActive ? "default" : "secondary"}>
                          {course.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild data-testid={`button-view-${course.id}`}>
                          <Link href={`/manager/courses/${course.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen className="h-8 w-8" />}
              title="No courses found"
              description={
                searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filter"
                  : "There are no courses on the platform."
              }
              testId="empty-courses"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
