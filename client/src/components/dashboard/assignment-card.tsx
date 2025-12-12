import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText } from "lucide-react";
import { Link } from "wouter";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import type { AssignmentWithCourse, Submission } from "@shared/schema";

interface AssignmentCardProps {
  assignment: AssignmentWithCourse;
  submission?: Submission;
  showCourse?: boolean;
  testId?: string;
}

export function AssignmentCard({
  assignment,
  submission,
  showCourse = true,
  testId,
}: AssignmentCardProps) {
  const getStatusBadge = () => {
    if (submission?.status === "graded") {
      return <Badge variant="default">Graded</Badge>;
    }
    if (submission?.status === "submitted") {
      return <Badge variant="secondary">Submitted</Badge>;
    }
    if (!assignment.dueDate) {
      return <Badge variant="outline">No Due Date</Badge>;
    }
    const dueDate = new Date(assignment.dueDate);
    if (isPast(dueDate)) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (isToday(dueDate)) {
      return <Badge variant="destructive">Due Today</Badge>;
    }
    if (isTomorrow(dueDate)) {
      return <Badge className="bg-orange-500 text-white dark:bg-orange-600">Due Tomorrow</Badge>;
    }
    const daysLeft = differenceInDays(dueDate, new Date());
    if (daysLeft <= 3) {
      return <Badge className="bg-yellow-500 text-white dark:bg-yellow-600">Due Soon</Badge>;
    }
    return <Badge variant="outline">Upcoming</Badge>;
  };

  const getDueDateText = () => {
    if (!assignment.dueDate) return "No due date";
    const dueDate = new Date(assignment.dueDate);
    if (isToday(dueDate)) return "Today";
    if (isTomorrow(dueDate)) return "Tomorrow";
    return format(dueDate, "MMM d, yyyy");
  };

  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {getStatusBadge()}
              {assignment.status === "draft" && (
                <Badge variant="outline">Draft</Badge>
              )}
            </div>
            <h3 className="mt-2 font-heading text-lg font-semibold" data-testid={`${testId}-title`}>
              {assignment.title}
            </h3>
            {showCourse && assignment.course && (
              <p className="mt-1 text-sm text-muted-foreground">
                {assignment.course.title}
              </p>
            )}
            {assignment.description && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {assignment.description}
              </p>
            )}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{getDueDateText()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{assignment.pointsPossible} points</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t p-4">
        <Button asChild className="w-full" data-testid={`${testId}-view`}>
          <Link href={`/assignments/${assignment.id}`}>
            {submission?.status === "submitted" || submission?.status === "graded"
              ? "View Submission"
              : "Start Assignment"}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
