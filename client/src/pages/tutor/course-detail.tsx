import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Users, UserPlus, ArrowLeft, Check, Video, Pencil, ExternalLink, X, Loader2, Clock, Plus, MessageCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CourseWithTutor, User, Enrollment, HourWallet } from "@shared/schema";

interface EnrollmentWithStudent extends Enrollment {
  student: User;
}

interface WalletWithDetails extends HourWallet {
  student?: User;
  course?: { id: string; title: string };
}

type ChatThreadSummary = {
  id: string;
  participants: User[];
};

export default function TutorCourseDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditingTeamsLink, setIsEditingTeamsLink] = useState(false);
  const [teamsLinkInput, setTeamsLinkInput] = useState("");
  const [addHoursDialogOpen, setAddHoursDialogOpen] = useState(false);
  const [selectedStudentForHours, setSelectedStudentForHours] = useState<User | null>(null);
  const [addMinutes, setAddMinutes] = useState(60);
  const [addReason, setAddReason] = useState("");
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

  const { data: wallets } = useQuery<WalletWithDetails[]>({
    queryKey: ["/api/hour-wallets/course", id],
    enabled: !!id,
  });

  const { data: chatThreads = [] } = useQuery<ChatThreadSummary[]>({
    queryKey: ["/api/chats"],
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

  const createChatThreadMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const res = await apiRequest("POST", "/api/chats", { participantId });
      return res.json();
    },
    onSuccess: (thread: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setLocation(`/chat?threadId=${thread.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to start chat. Please try again.",
        variant: "destructive",
      });
    },
  });

  const teamsLinkMutation = useMutation({
    mutationFn: async (teamsMeetingLink: string | null) => {
      return apiRequest("PATCH", `/api/courses/${id}`, { teamsMeetingLink });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id] });
      setIsEditingTeamsLink(false);
      toast({
        title: "Teams link updated",
        description: "The Microsoft Teams meeting link has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update Teams link. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addHoursMutation = useMutation({
    mutationFn: async (data: { studentId: string; courseId: string; addMinutes: number; reason: string }) => {
      return apiRequest("POST", "/api/hour-wallets/top-up", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hour-wallets/course", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id, "enrollments"] });
      setAddHoursDialogOpen(false);
      setSelectedStudentForHours(null);
      setAddMinutes(60);
      setAddReason("");
      toast({
        title: "Hours added",
        description: "The hours have been added to the student's wallet.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add hours. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (course?.teamsMeetingLink) {
      setTeamsLinkInput(course.teamsMeetingLink);
    }
  }, [course?.teamsMeetingLink]);

  const handleSaveTeamsLink = () => {
    const link = teamsLinkInput.trim();
    teamsLinkMutation.mutate(link || null);
  };

  const handleCancelEditTeamsLink = () => {
    setTeamsLinkInput(course?.teamsMeetingLink || "");
    setIsEditingTeamsLink(false);
  };

  const handleOpenAddHoursDialog = (student: User) => {
    setSelectedStudentForHours(student);
    setAddHoursDialogOpen(true);
  };

  const handleSubmitAddHours = () => {
    if (!selectedStudentForHours || !id || !addReason.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields including reason.",
        variant: "destructive",
      });
      return;
    }
    addHoursMutation.mutate({
      studentId: selectedStudentForHours.id,
      courseId: id,
      addMinutes,
      reason: addReason.trim(),
    });
  };

  const canAddHours = user?.role === "admin" || user?.role === "manager";

  const getWalletForStudent = (studentId: string) => {
    return wallets?.find(w => w.studentId === studentId);
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const enrolledStudentIds = enrollments?.map(e => e.studentId) || [];
  const availableStudents = allStudents?.filter(s => !enrolledStudentIds.includes(s.id)) || [];
  
  const filteredStudents = availableStudents.filter(student => {
    const fullName = `${student.firstName || ""} ${student.lastName || ""}`.toLowerCase();
    const email = (student.email || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  const handleWriteReport = (studentId: string, courseId: string) => {
    const params = new URLSearchParams({
      studentId,
      courseId,
      type: "monthly",
      month: new Date().toISOString().slice(0, 7),
    });
    setLocation(`/reports?${params.toString()}`);
  };

  const handleStartChat = (studentId: string) => {
    const existingThread = chatThreads.find((thread) =>
      thread.participants.some((participant) => participant.id === studentId),
    );
    if (existingThread) {
      setLocation(`/chat?threadId=${existingThread.id}`);
      return;
    }
    createChatThreadMutation.mutate(studentId);
  };

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

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="font-heading text-xl flex items-center gap-2">
              <Video className="h-5 w-5" />
              Microsoft Teams Meeting Link
            </CardTitle>
            <CardDescription>
              Set the Teams link for online sessions. Students will see this link.
            </CardDescription>
          </div>
          {!isEditingTeamsLink && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingTeamsLink(true)}
              data-testid="button-edit-teams-link"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditingTeamsLink ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                type="url"
                placeholder="https://teams.microsoft.com/l/meetup-join/..."
                value={teamsLinkInput}
                onChange={(e) => setTeamsLinkInput(e.target.value)}
                className="flex-1"
                data-testid="input-teams-link"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveTeamsLink}
                  disabled={teamsLinkMutation.isPending}
                  data-testid="button-save-teams-link"
                >
                  {teamsLinkMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEditTeamsLink}
                  disabled={teamsLinkMutation.isPending}
                  data-testid="button-cancel-teams-link"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : course.teamsMeetingLink ? (
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={course.teamsMeetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1 break-all"
                data-testid="link-teams-meeting"
              >
                {course.teamsMeetingLink}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="text-no-teams-link">
              No Teams link set. Click Edit to add one.
            </p>
          )}
        </CardContent>
      </Card>

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
              {enrollments.map((enrollment) => {
                const wallet = getWalletForStudent(enrollment.studentId);
                const remaining = wallet ? wallet.purchasedMinutes - wallet.consumedMinutes : 0;
                const usagePercent = wallet && wallet.purchasedMinutes > 0 
                  ? Math.round((wallet.consumedMinutes / wallet.purchasedMinutes) * 100) 
                  : 0;
                
                return (
                  <div
                    key={enrollment.id}
                    className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
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
                    
                    <div className="flex flex-wrap items-center gap-3">
                      {wallet ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{formatMinutes(remaining)}</span>
                          <span className="text-muted-foreground">remaining</span>
                          <Progress value={100 - usagePercent} className="h-1.5 w-16" />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No wallet</span>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWriteReport(enrollment.studentId, enrollment.courseId)}
                        data-testid={`button-write-report-${enrollment.studentId}`}
                      >
                        <FileText className="mr-1 h-3 w-3" />
                        Write Report
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartChat(enrollment.studentId)}
                        data-testid={`button-chat-${enrollment.studentId}`}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      
                      {canAddHours && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => enrollment.student && handleOpenAddHoursDialog(enrollment.student)}
                          data-testid={`button-add-hours-${enrollment.studentId}`}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add Hours
                        </Button>
                      )}
                      
                      <Badge variant={enrollment.status === "active" ? "default" : "secondary"}>
                        {enrollment.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
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

      {canAddHours && (
        <Dialog open={addHoursDialogOpen} onOpenChange={setAddHoursDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Hours to Wallet</DialogTitle>
              <DialogDescription>
                Add tutoring hours for {selectedStudentForHours?.firstName} {selectedStudentForHours?.lastName} in {course?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="minutes">Minutes to Add</Label>
                <Input
                  id="minutes"
                  type="number"
                  min={15}
                  step={15}
                  value={addMinutes}
                  onChange={(e) => setAddMinutes(parseInt(e.target.value) || 0)}
                  placeholder="60"
                  data-testid="input-add-minutes"
                />
                <p className="text-xs text-muted-foreground">
                  {addMinutes > 0 ? `${Math.floor(addMinutes / 60)}h ${addMinutes % 60}m` : "0h 0m"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (required)</Label>
                <Input
                  id="reason"
                  value={addReason}
                  onChange={(e) => setAddReason(e.target.value)}
                  placeholder="e.g., Package purchase, bonus hours"
                  data-testid="input-add-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddHoursDialogOpen(false)}
                data-testid="button-cancel-add-hours"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAddHours}
                disabled={addHoursMutation.isPending || !addReason.trim() || addMinutes <= 0}
                data-testid="button-submit-add-hours"
              >
                {addHoursMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Hours"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
