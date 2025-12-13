import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar, Clock, Check, X, Send, BookOpen, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { format, addDays, startOfWeek, setHours, setMinutes, isBefore, isAfter } from "date-fns";
import type { EnrollmentWithDetails, TutorAvailability, SessionProposalWithDetails } from "@shared/schema";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTimeDisplay(time: string) {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${displayHour}:${minutes} ${ampm}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "approved":
      return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function ProposalCard({ proposal }: { proposal: SessionProposalWithDetails }) {
  return (
    <Card className="hover-elevate" data-testid={`proposal-card-${proposal.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{proposal.course?.title || "Course"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>
                {proposal.tutor?.firstName} {proposal.tutor?.lastName}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(proposal.proposedStartTime), "EEEE, MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {format(new Date(proposal.proposedStartTime), "h:mm a")} -{" "}
                {format(new Date(proposal.proposedEndTime), "h:mm a")}
              </span>
            </div>
            {proposal.studentMessage && (
              <p className="mt-2 text-sm text-muted-foreground">
                "{proposal.studentMessage}"
              </p>
            )}
            {proposal.tutorResponse && (
              <p className="mt-2 text-sm italic text-muted-foreground">
                Tutor: "{proposal.tutorResponse}"
              </p>
            )}
          </div>
          <div>{getStatusBadge(proposal.status)}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudentSchedulingPage() {
  const { toast } = useToast();
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentWithDetails | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    date: Date;
  } | null>(null);
  const [message, setMessage] = useState("");

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<EnrollmentWithDetails[]>({
    queryKey: ["/api/enrollments/student"],
  });

  const { data: proposals, isLoading: proposalsLoading } = useQuery<SessionProposalWithDetails[]>({
    queryKey: ["/api/session-proposals/student"],
  });

  const { data: availability, isLoading: availabilityLoading } = useQuery<TutorAvailability[]>({
    queryKey: ["/api/tutors", selectedEnrollment?.course?.tutorId, "availability"],
    enabled: !!selectedEnrollment?.course?.tutorId,
  });

  const proposeMutation = useMutation({
    mutationFn: async (data: {
      tutorId: string;
      courseId: string;
      proposedStartTime: string;
      proposedEndTime: string;
      studentMessage?: string;
    }) => {
      return apiRequest("POST", "/api/session-proposals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/session-proposals/student"] });
      setIsDialogOpen(false);
      setSelectedSlot(null);
      setMessage("");
      toast({
        title: "Session proposed",
        description: "Your session proposal has been sent to the tutor.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send proposal.",
        variant: "destructive",
      });
    },
  });

  const handleSelectEnrollment = (enrollmentId: string) => {
    const enrollment = enrollments?.find((e) => e.id === enrollmentId);
    setSelectedEnrollment(enrollment || null);
  };

  const handleSelectSlot = (slot: TutorAvailability, weekOffset: number) => {
    const today = new Date();
    const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 });
    const slotDate = addDays(weekStart, slot.dayOfWeek);
    
    const [startHour, startMin] = slot.startTime.split(":").map(Number);
    const proposedDate = setMinutes(setHours(slotDate, startHour), startMin);
    
    if (isBefore(proposedDate, today)) {
      toast({
        title: "Invalid time",
        description: "Cannot schedule a session in the past.",
        variant: "destructive",
      });
      return;
    }

    setSelectedSlot({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      date: slotDate,
    });
    setIsDialogOpen(true);
  };

  const handleSubmitProposal = () => {
    if (!selectedEnrollment || !selectedSlot) return;

    const [startHour, startMin] = selectedSlot.startTime.split(":").map(Number);
    const [endHour, endMin] = selectedSlot.endTime.split(":").map(Number);
    
    const proposedStart = setMinutes(setHours(selectedSlot.date, startHour), startMin);
    const proposedEnd = setMinutes(setHours(selectedSlot.date, endHour), endMin);

    proposeMutation.mutate({
      tutorId: selectedEnrollment.course.tutorId,
      courseId: selectedEnrollment.courseId,
      proposedStartTime: proposedStart.toISOString(),
      proposedEndTime: proposedEnd.toISOString(),
      studentMessage: message || undefined,
    });
  };

  const groupedAvailability = (availability || []).reduce((acc, slot) => {
    if (!slot.isActive) return acc;
    const day = slot.dayOfWeek;
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {} as Record<number, TutorAvailability[]>);

  Object.keys(groupedAvailability).forEach((day) => {
    groupedAvailability[Number(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  const pendingProposals = (proposals || []).filter((p) => p.status === "pending");
  const approvedProposals = (proposals || []).filter((p) => p.status === "approved");
  const rejectedProposals = (proposals || []).filter((p) => p.status === "rejected");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
          Schedule Tutoring
        </h1>
        <p className="mt-1 text-muted-foreground">
          View tutor availability and request tutoring sessions.
        </p>
      </div>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList>
          <TabsTrigger value="schedule" data-testid="tab-schedule">
            Schedule Session
          </TabsTrigger>
          <TabsTrigger value="proposals" data-testid="tab-proposals">
            My Proposals
            {pendingProposals.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingProposals.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select a Course</CardTitle>
              <CardDescription>
                Choose a course to view tutor availability
              </CardDescription>
            </CardHeader>
            <CardContent>
              {enrollmentsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : enrollments && enrollments.length > 0 ? (
                <Select
                  value={selectedEnrollment?.id || ""}
                  onValueChange={handleSelectEnrollment}
                >
                  <SelectTrigger data-testid="select-course">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {enrollments
                      .filter((e) => e.status === "active")
                      .map((enrollment) => (
                        <SelectItem key={enrollment.id} value={enrollment.id}>
                          {enrollment.course?.title || "Course"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <EmptyState
                  icon={<BookOpen className="h-8 w-8" />}
                  title="No enrollments"
                  description="You need to be enrolled in a course to schedule tutoring."
                  testId="empty-enrollments"
                />
              )}
            </CardContent>
          </Card>

          {selectedEnrollment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Tutor Availability
                </CardTitle>
                <CardDescription>
                  Click on an available time slot to propose a session
                </CardDescription>
              </CardHeader>
              <CardContent>
                {availabilityLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : availability && availability.filter((a) => a.isActive).length > 0 ? (
                  <div className="space-y-6">
                    <div className="rounded-md border">
                      <div className="border-b bg-muted/50 px-4 py-2">
                        <p className="text-sm font-medium">This Week</p>
                      </div>
                      <div className="p-4">
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                          {DAYS_OF_WEEK.map((day, index) => {
                            const slots = groupedAvailability[index] || [];
                            if (slots.length === 0) return null;

                            return (
                              <div key={index} className="space-y-2">
                                <p className="text-sm font-medium">{day}</p>
                                <div className="flex flex-wrap gap-2">
                                  {slots.map((slot) => (
                                    <Button
                                      key={slot.id}
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSelectSlot(slot, 0)}
                                      data-testid={`slot-${slot.id}-week0`}
                                    >
                                      <Clock className="mr-1 h-3 w-3" />
                                      {formatTimeDisplay(slot.startTime)}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border">
                      <div className="border-b bg-muted/50 px-4 py-2">
                        <p className="text-sm font-medium">Next Week</p>
                      </div>
                      <div className="p-4">
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                          {DAYS_OF_WEEK.map((day, index) => {
                            const slots = groupedAvailability[index] || [];
                            if (slots.length === 0) return null;

                            return (
                              <div key={index} className="space-y-2">
                                <p className="text-sm font-medium">{day}</p>
                                <div className="flex flex-wrap gap-2">
                                  {slots.map((slot) => (
                                    <Button
                                      key={slot.id}
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSelectSlot(slot, 1)}
                                      data-testid={`slot-${slot.id}-week1`}
                                    >
                                      <Clock className="mr-1 h-3 w-3" />
                                      {formatTimeDisplay(slot.startTime)}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={<Calendar className="h-8 w-8" />}
                    title="No availability"
                    description="This tutor has not set their availability yet."
                    testId="empty-availability"
                  />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="proposals" className="space-y-6">
          {proposalsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : proposals && proposals.length > 0 ? (
            <div className="space-y-6">
              {pendingProposals.length > 0 && (
                <div>
                  <h3 className="mb-3 font-heading text-lg font-semibold">
                    Pending ({pendingProposals.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {pendingProposals.map((proposal) => (
                      <ProposalCard key={proposal.id} proposal={proposal} />
                    ))}
                  </div>
                </div>
              )}

              {approvedProposals.length > 0 && (
                <div>
                  <h3 className="mb-3 font-heading text-lg font-semibold">
                    Approved ({approvedProposals.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {approvedProposals.map((proposal) => (
                      <ProposalCard key={proposal.id} proposal={proposal} />
                    ))}
                  </div>
                </div>
              )}

              {rejectedProposals.length > 0 && (
                <div>
                  <h3 className="mb-3 font-heading text-lg font-semibold">
                    Rejected ({rejectedProposals.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {rejectedProposals.map((proposal) => (
                      <ProposalCard key={proposal.id} proposal={proposal} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <EmptyState
                  icon={<Send className="h-8 w-8" />}
                  title="No proposals yet"
                  description="Schedule a tutoring session to see your proposals here."
                  testId="empty-proposals"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propose Tutoring Session</DialogTitle>
            <DialogDescription>
              Send a request to your tutor for the selected time slot.
            </DialogDescription>
          </DialogHeader>

          {selectedSlot && selectedEnrollment && (
            <div className="space-y-4 py-4">
              <div className="rounded-md bg-muted p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {selectedEnrollment.course?.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(selectedSlot.date, "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {formatTimeDisplay(selectedSlot.startTime)} -{" "}
                      {formatTimeDisplay(selectedSlot.endTime)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message (optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a message for your tutor..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  data-testid="input-proposal-message"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitProposal}
              disabled={proposeMutation.isPending}
              data-testid="button-submit-proposal"
            >
              {proposeMutation.isPending ? "Sending..." : "Send Proposal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
