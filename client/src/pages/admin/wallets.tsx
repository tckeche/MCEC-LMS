import { useQuery, useMutation } from "@tanstack/react-query";
import { Wallet, Search, Plus, Clock, User, BookOpen, CalendarDays, Split, RotateCcw, AlertCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, addMonths } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User as UserType, Course, HourWallet } from "@shared/schema";

type WalletWithDetails = HourWallet & {
  student?: UserType;
  course?: Course;
};

type ActiveStudent = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
};

type RolloverData = {
  totalMinutes: number;
  totalHours: number;
  remainingMinutes: number;
  breakdown: Array<{
    courseName: string;
    courseId: string;
    remainingMinutes: number;
    monthRange: string;
  }>;
};

type EnrolledCourse = {
  courseId: string;
  courseName: string;
  courseLevel: string;
  enrolledAt: string;
};

type CourseAllocation = {
  courseId: string;
  courseName: string;
  courseLevel: string;
  hours: number;
  note: string;
};

const step1Schema = z.object({
  studentId: z.string().min(1, "Please select a student"),
  month: z.string().min(1, "Please select a month"),
  totalHours: z.coerce.number().min(0.25, "Minimum 15 minutes (0.25 hours)").max(100, "Maximum 100 hours"),
  reason: z.string().optional(),
});

type Step1FormData = z.infer<typeof step1Schema>;

function generateMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = addMonths(startOfMonth(now), i);
    options.push({
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
    });
  }
  
  return options;
}

export default function AdminWallets() {
  const [searchQuery, setSearchQuery] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [step1Data, setStep1Data] = useState<Step1FormData | null>(null);
  const [allocations, setAllocations] = useState<CourseAllocation[]>([]);
  const { toast } = useToast();
  
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const currentMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || format(new Date(), "MMMM yyyy");

  const { data: wallets, isLoading } = useQuery<WalletWithDetails[]>({
    queryKey: ["/api/hour-wallets"],
  });

  const { data: students, isLoading: studentsLoading } = useQuery<ActiveStudent[]>({
    queryKey: ["/api/students/active"],
  });

  const { data: rolloverData, isLoading: rolloverLoading } = useQuery<RolloverData>({
    queryKey: ["/api/students", selectedStudentId, "rollover", selectedMonth],
    queryFn: async () => {
      const response = await fetch(`/api/students/${selectedStudentId}/rollover?month=${selectedMonth}`);
      if (!response.ok) {
        throw new Error("Failed to fetch rollover data");
      }
      return response.json();
    },
    enabled: !!selectedStudentId,
  });

  const { data: enrolledCourses, isLoading: coursesLoading } = useQuery<EnrolledCourse[]>({
    queryKey: ["/api/students", selectedStudentId, "enrolled-courses"],
    queryFn: async () => {
      const response = await fetch(`/api/students/${selectedStudentId}/enrolled-courses`);
      if (!response.ok) {
        throw new Error("Failed to fetch enrolled courses");
      }
      return response.json();
    },
    enabled: !!selectedStudentId,
  });

  const filteredStudents = students?.filter(student => {
    if (!studentSearchQuery) return true;
    const searchLower = studentSearchQuery.toLowerCase();
    return student.fullName.toLowerCase().includes(searchLower) ||
           student.email.toLowerCase().includes(searchLower);
  }) || [];

  const form = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      studentId: "",
      month: format(new Date(), "yyyy-MM"),
      totalHours: 1,
      reason: "",
    },
  });

  useEffect(() => {
    form.setValue("studentId", selectedStudentId);
  }, [selectedStudentId, form]);

  useEffect(() => {
    form.setValue("month", selectedMonth);
  }, [selectedMonth, form]);

  // Initialize allocations only once when first entering Step 2
  const [allocationsInitialized, setAllocationsInitialized] = useState(false);
  
  useEffect(() => {
    if (currentStep === 2 && enrolledCourses && enrolledCourses.length > 0 && !allocationsInitialized) {
      setAllocations(
        enrolledCourses.map(course => ({
          courseId: course.courseId,
          courseName: course.courseName,
          courseLevel: course.courseLevel,
          hours: 0,
          note: "",
        }))
      );
      setAllocationsInitialized(true);
    }
  }, [currentStep, enrolledCourses, allocationsInitialized]);
  
  // Reset the initialization flag when going back to Step 1 or closing modal
  useEffect(() => {
    if (currentStep === 1) {
      setAllocationsInitialized(false);
    }
  }, [currentStep]);

  const allocateMutation = useMutation({
    mutationFn: async () => {
      if (!step1Data) throw new Error("Missing step 1 data");
      
      const [year, month] = step1Data.month.split("-").map(Number);
      const totalMinutes = Math.round(step1Data.totalHours * 60);
      
      return apiRequest("POST", "/api/wallets/allocate-month", {
        studentId: step1Data.studentId,
        month,
        year,
        totalMinutes,
        allocations: allocations.map(a => ({
          courseId: a.courseId,
          minutes: Math.round(a.hours * 60),
        })),
        reason: step1Data.reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hour-wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students", selectedStudentId, "rollover"] });
      resetModal();
      toast({
        title: "Hours allocated",
        description: `Hours have been allocated for ${currentMonthLabel}.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to allocate hours. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetModal = () => {
    setIsDialogOpen(false);
    setCurrentStep(1);
    setSelectedStudentId("");
    setSelectedMonth(format(new Date(), "yyyy-MM"));
    setStep1Data(null);
    setAllocations([]);
    setAllocationsInitialized(false);
    setStudentSearchQuery("");
    form.reset();
  };

  const onStep1Submit = (data: Step1FormData) => {
    setStep1Data(data);
    setCurrentStep(2);
  };

  const updateAllocation = (courseId: string, hours: number) => {
    setAllocations(prev => prev.map(a => 
      a.courseId === courseId ? { ...a, hours: Math.max(0, hours) } : a
    ));
  };

  const updateAllocationNote = (courseId: string, note: string) => {
    setAllocations(prev => prev.map(a => 
      a.courseId === courseId ? { ...a, note } : a
    ));
  };

  const splitEvenly = () => {
    if (!step1Data || allocations.length === 0) return;
    
    const totalHours = step1Data.totalHours;
    const numCourses = allocations.length;
    const hoursPerCourse = totalHours / numCourses;
    
    // Round each allocation to 2 decimal places
    const baseHours = Math.floor(hoursPerCourse * 100) / 100;
    const totalBase = baseHours * numCourses;
    const remainder = Math.round((totalHours - totalBase) * 100) / 100;
    
    // Distribute remainder across courses (add small amounts to first few courses)
    const remainderPerCourse = Math.round((remainder / numCourses) * 100) / 100;
    let leftover = remainder;
    
    setAllocations(prev => prev.map((a, index) => {
      let courseHours = baseHours;
      if (leftover > 0) {
        const add = Math.min(remainderPerCourse || 0.01, leftover);
        courseHours += add;
        leftover = Math.round((leftover - add) * 100) / 100;
      }
      return { ...a, hours: Math.round(courseHours * 100) / 100 };
    }));
  };

  const clearAllocations = () => {
    setAllocations(prev => prev.map(a => ({ ...a, hours: 0 })));
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.hours, 0);
  const remainingToAllocate = step1Data ? step1Data.totalHours - totalAllocated : 0;
  const canSave = Math.abs(remainingToAllocate) < 0.01; // Allow small floating point tolerance

  const selectedStudentName = students?.find(s => s.id === selectedStudentId)?.fullName || "Student";

  const filteredWallets = wallets?.filter(wallet => {
    if (!searchQuery) return true;
    const studentName = wallet.student 
      ? `${wallet.student.firstName} ${wallet.student.lastName}`.toLowerCase() 
      : "";
    const courseName = wallet.course?.title?.toLowerCase() || "";
    return studentName.includes(searchQuery.toLowerCase()) || 
           courseName.includes(searchQuery.toLowerCase());
  }) || [];

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatRollover = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    return `${hours} hours (${totalMinutes} minutes)`;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Hours Wallets</h1>
          <p className="text-muted-foreground">Manage student tutoring hours</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) resetModal();
          else setIsDialogOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-hours">
              <Plus className="mr-2 h-4 w-4" />
              Add Hours
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            {currentStep === 1 ? (
              <>
                <DialogHeader>
                  <DialogTitle>Add Hours to Student Wallet</DialogTitle>
                  <DialogDescription>
                    Step 1: Set the monthly hours pool
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onStep1Submit)} className="space-y-4">
                    {/* 1. Student Selector */}
                    <FormField
                      control={form.control}
                      name="studentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedStudentId(value);
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-student">
                                <SelectValue placeholder={studentsLoading ? "Loading students..." : "Select a student"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <div className="px-2 pb-2">
                                <Input
                                  placeholder="Search students..."
                                  value={studentSearchQuery}
                                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                                  className="h-8"
                                  data-testid="input-student-search"
                                />
                              </div>
                              {filteredStudents.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  {studentsLoading ? "Loading..." : "No students found"}
                                </div>
                              ) : (
                                filteredStudents.map((student) => (
                                  <SelectItem key={student.id} value={student.id}>
                                    {student.fullName}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 2. Month Selector */}
                    <FormField
                      control={form.control}
                      name="month"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Month</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedMonth(value);
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-month">
                                <SelectValue placeholder="Select a month" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {monthOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 3. Rollover Summary Line */}
                    <div className="rounded-md border bg-muted/50 p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Rollover from previous months:</span>
                        {!selectedStudentId ? (
                          <span className="text-muted-foreground">Select a student</span>
                        ) : rolloverLoading ? (
                          <span className="text-muted-foreground">Loading...</span>
                        ) : (
                          <span data-testid="text-rollover-total">
                            {formatRollover(rolloverData?.totalMinutes || 0)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 4. Total Hours Input */}
                    <FormField
                      control={form.control}
                      name="totalHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total hours to add for {currentMonthLabel}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0.25}
                              step={0.25}
                              placeholder="1"
                              data-testid="input-total-hours"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 5. Reason (optional) */}
                    <FormField
                      control={form.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason (optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Package purchase, bonus hours"
                              data-testid="input-reason"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Step 1 Action Button */}
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={!selectedStudentId || coursesLoading}
                        className="w-full"
                        data-testid="button-next-allocate"
                      >
                        {coursesLoading ? "Loading courses..." : "Next: Allocate hours"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Allocate Hours Across Courses</DialogTitle>
                  <DialogDescription>
                    Allocate {step1Data?.totalHours} hours across courses for {selectedStudentName} in {currentMonthLabel}
                  </DialogDescription>
                </DialogHeader>

                {/* Remaining Badge */}
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={canSave ? "default" : "secondary"}
                    className="text-sm"
                    data-testid="badge-remaining"
                  >
                    Remaining to allocate: {remainingToAllocate.toFixed(2)} hours
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={splitEvenly}
                      data-testid="button-split-evenly"
                    >
                      <Split className="mr-1 h-3 w-3" />
                      Split evenly
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearAllocations}
                      data-testid="button-clear"
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Clear
                    </Button>
                  </div>
                </div>

                {/* Course Allocations */}
                <div className="max-h-80 space-y-3 overflow-y-auto">
                  {allocations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-md border bg-muted/50 p-6 text-center">
                      <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="font-medium">No courses found for this student</p>
                      <p className="text-sm text-muted-foreground">
                        Enroll the student first, then allocate hours.
                      </p>
                    </div>
                  ) : (
                    allocations.map((allocation) => (
                      <div
                        key={allocation.courseId}
                        className="rounded-md border p-3 space-y-2"
                        data-testid={`allocation-row-${allocation.courseId}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-medium">{allocation.courseName}</div>
                            {allocation.courseLevel && (
                              <div className="text-sm text-muted-foreground">{allocation.courseLevel}</div>
                            )}
                          </div>
                          <div className="w-24">
                            <Input
                              type="number"
                              min={0}
                              max={step1Data ? remainingToAllocate + allocation.hours : 100}
                              step={0.25}
                              value={allocation.hours}
                              onChange={(e) => updateAllocation(allocation.courseId, parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              data-testid={`input-allocation-${allocation.courseId}`}
                            />
                          </div>
                        </div>
                        <Input
                          placeholder="Note (optional)"
                          value={allocation.note}
                          onChange={(e) => updateAllocationNote(allocation.courseId, e.target.value)}
                          className="text-sm"
                          data-testid={`input-note-${allocation.courseId}`}
                        />
                      </div>
                    ))
                  )}
                </div>

                {/* Step 2 Action Buttons */}
                <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    disabled={!canSave || allocations.length === 0 || allocateMutation.isPending}
                    onClick={() => allocateMutation.mutate()}
                    className="flex-1"
                    data-testid="button-save-allocation"
                  >
                    {allocateMutation.isPending ? "Saving..." : "Save allocation"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              All Wallets
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredWallets.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-8 w-8" />}
              title="No wallets found"
              description={searchQuery ? "Try a different search term" : "Add hours to create a wallet"}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Purchased</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWallets.map((wallet) => {
                  const remaining = wallet.purchasedMinutes - wallet.consumedMinutes;
                  const usagePercent = wallet.purchasedMinutes > 0 
                    ? Math.round((wallet.consumedMinutes / wallet.purchasedMinutes) * 100)
                    : 0;
                  return (
                    <TableRow key={wallet.id} data-testid={`row-wallet-${wallet.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {wallet.student 
                              ? `${wallet.student.firstName} ${wallet.student.lastName}`
                              : wallet.studentId.slice(0, 8)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span>{wallet.course?.title || wallet.courseId.slice(0, 8)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatMinutes(wallet.purchasedMinutes)}
                        </div>
                      </TableCell>
                      <TableCell>{formatMinutes(wallet.consumedMinutes)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="font-medium">{formatMinutes(remaining)}</span>
                          <Progress value={100 - usagePercent} className="h-1.5 w-20" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={wallet.status === "active" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {wallet.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
