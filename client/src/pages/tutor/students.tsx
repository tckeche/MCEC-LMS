import { useQuery } from "@tanstack/react-query";
import { Users, Search, Mail } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import type { Course, User, Enrollment } from "@shared/schema";

interface StudentWithProgress {
  student: User;
  enrollment: Enrollment;
  courseName: string;
  assignmentsCompleted: number;
  totalAssignments: number;
  averageGrade: number | null;
}

interface TutorStudentsData {
  courses: Course[];
  students: StudentWithProgress[];
}

export default function TutorStudents() {
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery<TutorStudentsData>({
    queryKey: ["/api/tutor/students"],
  });

  const filteredStudents = data?.students.filter((item) => {
    const matchesCourse = courseFilter === "all" || item.enrollment.courseId === courseFilter;
    const matchesSearch =
      searchQuery === "" ||
      item.student.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.student.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.student.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCourse && matchesSearch;
  });

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() || "?";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
          Students
        </h1>
        <p className="mt-1 text-muted-foreground">
          View and manage students across your courses
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="font-heading text-xl">Student Roster</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 pl-9"
                  data-testid="input-search"
                />
              </div>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-48" data-testid="select-course">
                  <SelectValue placeholder="Filter by course" />
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
          ) : filteredStudents && filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Average</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((item) => (
                    <TableRow key={`${item.student.id}-${item.enrollment.id}`} data-testid={`student-row-${item.student.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={item.student.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {getInitials(item.student.firstName, item.student.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {item.student.firstName} {item.student.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{item.student.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.courseName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={
                              item.totalAssignments > 0
                                ? (item.assignmentsCompleted / item.totalAssignments) * 100
                                : 0
                            }
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">
                            {item.assignmentsCompleted}/{item.totalAssignments}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.averageGrade !== null ? (
                          <span className="font-medium">{item.averageGrade.toFixed(1)}%</span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.enrollment.status === "active" ? "default" : "secondary"}
                        >
                          {item.enrollment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.student.email && (
                          <Button variant="ghost" size="icon" asChild>
                            <a
                              href={`mailto:${item.student.email}`}
                              data-testid={`button-email-${item.student.id}`}
                            >
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No students found"
              description={
                searchQuery || courseFilter !== "all"
                  ? "Try adjusting your search or filter"
                  : "No students enrolled in your courses yet."
              }
              testId="empty-students"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
