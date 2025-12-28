import { useQuery, useMutation } from "@tanstack/react-query";
import { Wallet, Search, Plus, Clock, User, BookOpen, CalendarDays } from "lucide-react";
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

const addHoursSchema = z.object({
  studentId: z.string().min(1, "Please select a student"),
  month: z.string().min(1, "Please select a month"),
  courseId: z.string().min(1, "Please select a course"),
  hours: z.coerce.number().min(0.25, "Minimum 15 minutes (0.25 hours)").max(100, "Maximum 100 hours"),
  reason: z.string().optional(),
});

type AddHoursFormData = z.infer<typeof addHoursSchema>;

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
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const { toast } = useToast();
  
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const currentMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || format(new Date(), "MMMM yyyy");

  const { data: wallets, isLoading } = useQuery<WalletWithDetails[]>({
    queryKey: ["/api/hour-wallets"],
  });

  const { data: students, isLoading: studentsLoading } = useQuery<ActiveStudent[]>({
    queryKey: ["/api/students/active"],
  });

  const { data: courses } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
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

  const filteredStudents = students?.filter(student => {
    if (!studentSearchQuery) return true;
    const searchLower = studentSearchQuery.toLowerCase();
    return student.fullName.toLowerCase().includes(searchLower) ||
           student.email.toLowerCase().includes(searchLower);
  }) || [];

  const form = useForm<AddHoursFormData>({
    resolver: zodResolver(addHoursSchema),
    defaultValues: {
      studentId: "",
      month: format(new Date(), "yyyy-MM"),
      courseId: "",
      hours: 1,
      reason: "",
    },
  });

  useEffect(() => {
    form.setValue("studentId", selectedStudentId);
  }, [selectedStudentId, form]);

  useEffect(() => {
    form.setValue("month", selectedMonth);
  }, [selectedMonth, form]);

  const addHoursMutation = useMutation({
    mutationFn: async (data: AddHoursFormData) => {
      const minutes = Math.round(data.hours * 60);
      
      return apiRequest("POST", "/api/hour-wallets", {
        studentId: data.studentId,
        courseId: data.courseId,
        minutes,
        reason: data.reason || `Hours added for ${currentMonthLabel}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hour-wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students", selectedStudentId, "rollover"] });
      setIsDialogOpen(false);
      form.reset();
      setSelectedStudentId("");
      setSelectedMonth(format(new Date(), "yyyy-MM"));
      toast({
        title: "Hours added",
        description: `Hours have been added for ${currentMonthLabel}.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add hours. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddHoursFormData) => {
    addHoursMutation.mutate(data);
  };

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
          setIsDialogOpen(open);
          if (!open) {
            setStudentSearchQuery("");
            setSelectedStudentId("");
            setSelectedMonth(format(new Date(), "yyyy-MM"));
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-hours">
              <Plus className="mr-2 h-4 w-4" />
              Add Hours
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Hours to Student Wallet</DialogTitle>
              <DialogDescription>
                Add tutoring hours for a specific month.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                  {/* 4. Rollover Breakdown */}
                  {selectedStudentId && !rolloverLoading && rolloverData && rolloverData.totalMinutes > 0 && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      {rolloverData.breakdown.map((item, index) => (
                        <div key={index} className="text-sm" data-testid={`rollover-item-${index}`}>
                          <div className="font-medium">{item.courseName}</div>
                          <div className="text-muted-foreground">{item.monthRange}</div>
                          <div className="text-muted-foreground">
                            Outstanding: {formatMinutes(item.remainingMinutes)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Course Selector */}
                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-course">
                            <SelectValue placeholder="Select a course" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {courses?.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 6. Hours to Add Input */}
                <FormField
                  control={form.control}
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours to add for {currentMonthLabel}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0.25}
                          step={0.25}
                          placeholder="1"
                          data-testid="input-hours"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 7. Reason (optional) */}
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

                {/* 8 & 9. Action Buttons */}
                <DialogFooter className="flex-col gap-2 sm:flex-col">
                  <Button
                    type="submit"
                    disabled={addHoursMutation.isPending}
                    className="w-full"
                    data-testid="button-submit-hours"
                  >
                    {addHoursMutation.isPending ? "Adding..." : `Add hours for ${currentMonthLabel}`}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="w-full"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </form>
            </Form>
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
