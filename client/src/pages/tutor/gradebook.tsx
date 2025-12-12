import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Search, Filter } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import type { Course, SubmissionWithDetails } from "@shared/schema";

interface GradebookData {
  courses: Course[];
  submissions: SubmissionWithDetails[];
}

export default function TutorGradebook() {
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery<GradebookData>({
    queryKey: ["/api/tutor/gradebook"],
  });

  const filteredSubmissions = data?.submissions.filter((submission) => {
    const matchesCourse = courseFilter === "all" || submission.assignment.courseId === courseFilter;
    const matchesStatus = statusFilter === "all" || submission.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      submission.student.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.student.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.assignment.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCourse && matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      submitted: "secondary",
      graded: "default",
      late: "destructive",
    };
    return (
      <Badge variant={variants[status] || "outline"} size="sm">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
          Grade Book
        </h1>
        <p className="mt-1 text-muted-foreground">
          Review and grade student submissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="font-heading text-xl">Submissions</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 pl-9"
                  data-testid="input-search"
                />
              </div>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-40" data-testid="select-course">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {data?.courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredSubmissions && filteredSubmissions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id} data-testid={`submission-row-${submission.id}`}>
                      <TableCell className="font-medium">
                        {submission.student.firstName} {submission.student.lastName}
                      </TableCell>
                      <TableCell>{submission.assignment.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {data?.courses.find((c) => c.id === submission.assignment.courseId)?.title}
                      </TableCell>
                      <TableCell>{getStatusBadge(submission.status)}</TableCell>
                      <TableCell>
                        {submission.grade ? (
                          <span className="font-medium">
                            {submission.grade.points}/{submission.assignment.pointsPossible}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/tutor/submissions/${submission.id}`}
                            data-testid={`button-grade-${submission.id}`}
                          >
                            {submission.status === "graded" ? "View" : "Grade"}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={<ClipboardList className="h-8 w-8" />}
              title="No submissions found"
              description={
                searchQuery || courseFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No student submissions to grade yet."
              }
              testId="empty-submissions"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
