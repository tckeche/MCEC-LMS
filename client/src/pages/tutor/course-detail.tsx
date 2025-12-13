import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { BookOpen, Users, UserPlus, ArrowLeft, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CourseWithTutor, User, Enrollment } from "@shared/schema";

interface EnrollmentWithStudent extends Enrollment {
  student: User;
}

export default function TutorCourseDetail() {
  const { id } = useParams<{ id: string }>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithTutor>({
    queryKey: ["/api/courses", id],
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<EnrollmentWithStudent[]>({
    queryKey: ["/api/courses", id, "enrollments"],
  });

  const { data: allStudents, isLoading: studentsLoading, isError: studentsError } = useQuery<User[]>({
    queryKey: ["/api/tutor/active-students"],
  });

  const enrollMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return apiRequest("POST", "/api/enrollments", {
        studentId,
        courseId: id,
        status: "active",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id, "enrollments"] });
      setIsDialogOpen(false);
      toast({
        title: "Student enrolled",
        description: "The student has been successfully enrolled in this course.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to enroll student. Please try again.",
        variant: "destructive",
      });
    },
  });

  const enrolledStudentIds = enrollments?.map(e => e.studentId) || [];
  const availableStudents = allStudents?.filter(s => !enrolledStudentIds.includes(s.id)) || [];
  
  const filteredStudents = availableStudents.filter(student => {
    const fullName = `${student.firstName || ""} ${student.lastName || ""}`.toLowerCase();
    const email = (student.email || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  if (courseLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
        <p>Course not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/tutor/courses" data-testid="link-back-courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Link>
        </Button>
        
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold" data-testid="text-course-title">
              {course.title}
            </h1>
            <p className="mt-1 text-muted-foreground">{course.description}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={course.isActive ? "default" : "secondary"}>
                {course.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="font-heading text-xl flex items-center gap-2">
              <Users className="h-5 w-5" />
              Enrolled Students
            </CardTitle>
            <CardDescription>
              {enrollments?.length || 0} students enrolled
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-student">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading">Add Student to Course</DialogTitle>
                <DialogDescription>
                  Search and select a student to enroll in this course.
                </DialogDescription>
              </DialogHeader>
              {studentsError ? (
                <div className="p-4 text-center text-destructive">
                  <p className="text-sm">Failed to load students. Please try again.</p>
                </div>
              ) : studentsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="mt-1 h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Command className="rounded-lg border">
                  <CommandInput 
                    placeholder="Search students..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    data-testid="input-search-students"
                  />
                  <CommandList>
                    <CommandEmpty>
                      {availableStudents.length === 0 
                        ? "All students are already enrolled in this course."
                        : "No students found matching your search."}
                    </CommandEmpty>
                    <CommandGroup heading="Available Students">
                      {filteredStudents.map((student) => (
                        <CommandItem
                          key={student.id}
                          value={`${student.firstName} ${student.lastName} ${student.email}`}
                          onSelect={() => enrollMutation.mutate(student.id)}
                          className="cursor-pointer"
                          data-testid={`student-option-${student.id}`}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={student.profileImageUrl || undefined} />
                              <AvatarFallback>
                                {(student.firstName?.[0] || "") + (student.lastName?.[0] || "")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-medium truncate">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {student.email}
                              </p>
                            </div>
                            {enrollMutation.isPending && (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {enrollmentsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-1 h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : enrollments && enrollments.length > 0 ? (
            <div className="space-y-3">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  data-testid={`enrollment-${enrollment.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={enrollment.student?.profileImageUrl || undefined} />
                      <AvatarFallback>
                        {(enrollment.student?.firstName?.[0] || "") + (enrollment.student?.lastName?.[0] || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {enrollment.student?.firstName} {enrollment.student?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {enrollment.student?.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant={enrollment.status === "active" ? "default" : "secondary"}>
                    {enrollment.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">
                No students enrolled yet. Click "Add Student" to enroll students.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
