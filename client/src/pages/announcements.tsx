import { useQuery, useMutation } from "@tanstack/react-query";
import { Megaphone, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnnouncementCard } from "@/components/dashboard/announcement-card";
import { EmptyState } from "@/components/empty-state";
import { AnnouncementCardSkeleton } from "@/components/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AnnouncementWithAuthor, Course } from "@shared/schema";

const createAnnouncementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  courseId: z.string().optional(),
  isGlobal: z.boolean().default(false),
});

type CreateAnnouncementFormData = z.infer<typeof createAnnouncementSchema>;

interface AnnouncementsData {
  announcements: AnnouncementWithAuthor[];
  courses: Course[];
}

export default function Announcements() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const canCreate = user?.role === "tutor" || user?.role === "manager" || user?.role === "admin";

  const { data, isLoading } = useQuery<AnnouncementsData>({
    queryKey: ["/api/announcements"],
  });

  const form = useForm<CreateAnnouncementFormData>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: {
      title: "",
      content: "",
      courseId: undefined,
      isGlobal: false,
    },
  });

  const isGlobal = form.watch("isGlobal");

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: CreateAnnouncementFormData) => {
      return apiRequest("/api/announcements", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Announcement created",
        description: "Your announcement has been published.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create announcement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateAnnouncementFormData) => {
    createAnnouncementMutation.mutate(data);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
            Announcements
          </h1>
          <p className="mt-1 text-muted-foreground">
            Stay updated with the latest news and updates
          </p>
        </div>
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-announcement">
                <Plus className="mr-2 h-4 w-4" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-heading">Create Announcement</DialogTitle>
                <DialogDescription>
                  Share important updates with students and staff.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Announcement title"
                            data-testid="input-title"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Write your announcement..."
                            className="min-h-32"
                            data-testid="input-content"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {(user?.role === "manager" || user?.role === "admin") && (
                    <FormField
                      control={form.control}
                      name="isGlobal"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Global Announcement</FormLabel>
                            <FormDescription>
                              Make this announcement visible to everyone
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-global"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                  {!isGlobal && (
                    <FormField
                      control={form.control}
                      name="courseId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-course">
                                <SelectValue placeholder="Select a course" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {data?.courses.map((course) => (
                                <SelectItem key={course.id} value={course.id}>
                                  {course.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Leave empty to make a general announcement
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createAnnouncementMutation.isPending}
                      data-testid="button-submit"
                    >
                      {createAnnouncementMutation.isPending ? "Publishing..." : "Publish"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">All Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <AnnouncementCardSkeleton />
              <AnnouncementCardSkeleton />
              <AnnouncementCardSkeleton />
            </div>
          ) : data?.announcements && data.announcements.length > 0 ? (
            <div className="space-y-4">
              {data.announcements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  testId={`announcement-card-${announcement.id}`}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Megaphone className="h-8 w-8" />}
              title="No announcements"
              description="There are no announcements at this time."
              testId="empty-announcements"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
