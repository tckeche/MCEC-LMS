import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Search, BookOpen, Users, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import type { User } from "@shared/schema";

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
}

export default function ManagerTutors() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery<ManagerDashboardData>({
    queryKey: ["/api/manager/dashboard"],
  });

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "T";
  };

  const filteredTutors = data?.tutorPerformance?.filter((tp) => {
    const fullName = `${tp.tutor.firstName || ""} ${tp.tutor.lastName || ""}`.toLowerCase();
    const email = tp.tutor.email?.toLowerCase() || "";
    return (
      searchQuery === "" ||
      fullName.includes(searchQuery.toLowerCase()) ||
      email.includes(searchQuery.toLowerCase())
    );
  });

  const stats = data?.tutorPerformance
    ? {
        totalTutors: data.tutorPerformance.length,
        totalCourses: data.tutorPerformance.reduce((sum, tp) => sum + tp.coursesCount, 0),
        totalStudents: data.tutorPerformance.reduce((sum, tp) => sum + tp.studentsCount, 0),
        avgGrade: data.stats.averageGrade,
      }
    : { totalTutors: 0, totalCourses: 0, totalStudents: 0, avgGrade: null };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
          Tutors
        </h1>
        <p className="mt-1 text-muted-foreground">
          View and monitor tutor performance across the platform.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24" />
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
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tutors</p>
                    <p className="text-2xl font-bold" data-testid="stat-total-tutors">
                      {stats.totalTutors}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/10">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Courses</p>
                    <p className="text-2xl font-bold" data-testid="stat-total-courses">
                      {stats.totalCourses}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-500/10">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold" data-testid="stat-total-students">
                      {stats.totalStudents}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-yellow-500/10">
                    <TrendingUp className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Platform Avg Grade</p>
                    <p className="text-2xl font-bold" data-testid="stat-avg-grade">
                      {stats.avgGrade !== null ? `${stats.avgGrade}%` : "--"}
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
            <CardTitle className="font-heading text-xl">All Tutors</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tutors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 pl-9"
                data-testid="input-search-tutors"
              />
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
          ) : filteredTutors && filteredTutors.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tutor</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Courses</TableHead>
                    <TableHead className="text-center">Students</TableHead>
                    <TableHead className="text-center">Avg Grade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTutors.map((tp) => (
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
                      <TableCell className="text-muted-foreground">
                        {tp.tutor.email}
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
                      <TableCell>
                        <Badge variant={tp.tutor.isActive ? "default" : "secondary"}>
                          {tp.tutor.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={<GraduationCap className="h-8 w-8" />}
              title="No tutors found"
              description={
                searchQuery
                  ? "Try adjusting your search"
                  : "There are no tutors registered on the platform."
              }
              testId="empty-tutors"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
