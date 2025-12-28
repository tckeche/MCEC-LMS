import { useQuery, useMutation } from "@tanstack/react-query";
import { Wallet, Search, Plus, Clock, User, BookOpen } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const addHoursSchema = z.object({
  studentId: z.string().min(1, "Please select a student"),
  courseId: z.string().min(1, "Please select a course"),
  minutes: z.coerce.number().min(15, "Minimum 15 minutes").max(6000, "Maximum 100 hours"),
  reason: z.string().min(1, "Reason is required"),
});

type AddHoursFormData = z.infer<typeof addHoursSchema>;

export default function AdminWallets() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: wallets, isLoading } = useQuery<WalletWithDetails[]>({
    queryKey: ["/api/hour-wallets"],
  });

  const { data: students } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users"],
    select: (users) => users?.filter(u => u.role === "student") || [],
  });

  const { data: courses } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const form = useForm<AddHoursFormData>({
    resolver: zodResolver(addHoursSchema),
    defaultValues: {
      studentId: "",
      courseId: "",
      minutes: 60,
      reason: "",
    },
  });

  const addHoursMutation = useMutation({
    mutationFn: async (data: AddHoursFormData) => {
      return apiRequest("POST", "/api/hour-wallets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hour-wallets"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Hours added",
        description: "The hours have been added to the student's wallet.",
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Hours Wallets</h1>
          <p className="text-muted-foreground">Manage student tutoring hours</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-hours">
              <Plus className="mr-2 h-4 w-4" />
              Add Hours
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Hours to Student Wallet</DialogTitle>
              <DialogDescription>
                Add tutoring hours to a student's wallet for a specific course.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-student">
                            <SelectValue placeholder="Select a student" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students?.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.firstName} {student.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <FormField
                  control={form.control}
                  name="minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minutes to Add</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={15}
                          step={15}
                          placeholder="60"
                          data-testid="input-minutes"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
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
                    disabled={addHoursMutation.isPending}
                    data-testid="button-submit-hours"
                  >
                    {addHoursMutation.isPending ? "Adding..." : "Add Hours"}
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
