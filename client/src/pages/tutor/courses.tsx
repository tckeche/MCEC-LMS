import { useQuery, useMutation } from "@tanstack/react-query";
import { BookOpen, Plus, Users, ClipboardList } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EmptyState } from "@/components/empty-state";
import { CourseCardSkeleton } from "@/components/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertCourseSchema } from "@shared/schema";
import type { CourseWithEnrollmentCount } from "@shared/schema";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

const createCourseSchema = insertCourseSchema.omit({ tutorId: true }).extend({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

type CreateCourseFormData = z.infer<typeof createCourseSchema>;

export default function TutorCourses() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: courses, isLoading } = useQuery<CourseWithEnrollmentCount[]>({
    queryKey: ["/api/tutor/courses"],
  });

  const form = useForm<CreateCourseFormData>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      title: "",
      description: "",
      syllabus: "",
      maxEnrollment: 30,
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: CreateCourseFormData) => {
      return apiRequest("POST", "/api/courses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/courses"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Course created",
        description: "Your new course has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create course. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateCourseFormData) => {
    createCourseMutation.mutate(data);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
            Course Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage your courses
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-course">
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading">Create New Course</DialogTitle>
              <DialogDescription>
                Fill in the details below to create a new course.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter course title"
                          data-testid="input-course-title"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter course description"
                          className="min-h-24"
                          data-testid="input-course-description"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="syllabus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Syllabus (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter course syllabus"
                          className="min-h-32"
                          data-testid="input-course-syllabus"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxEnrollment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Enrollment</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="30"
                          data-testid="input-course-max-enrollment"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                          value={field.value || 30}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-course"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCourseMutation.isPending}
                    data-testid="button-submit-course"
                  >
                    {createCourseMutation.isPending ? "Creating..." : "Create Course"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} data-testid={`course-card-${course.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-heading text-lg line-clamp-2">
                    {course.title}
                  </CardTitle>
                  <Badge variant={course.isActive ? "default" : "secondary"}>
                    {course.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {course.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{course.enrollmentCount} enrolled</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ClipboardList className="h-4 w-4" />
                    <span>Max {course.maxEnrollment}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/tutor/courses/${course.id}`} data-testid={`button-view-course-${course.id}`}>
                    View Details
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/tutor/courses/${course.id}/assignments`} data-testid={`button-assignments-${course.id}`}>
                    Assignments
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={<BookOpen className="h-12 w-12" />}
              title="No courses yet"
              description="Create your first course to get started teaching."
              action={{
                label: "Create Course",
                onClick: () => setIsDialogOpen(true),
              }}
              testId="empty-courses"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
