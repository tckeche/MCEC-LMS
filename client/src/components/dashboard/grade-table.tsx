import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { GradeWithDetails } from "@shared/schema";

interface GradeTableProps {
  grades: GradeWithDetails[];
  testId?: string;
}

export function GradeTable({ grades, testId }: GradeTableProps) {
  const getGradeBadgeVariant = (points: string, pointsPossible: number) => {
    const percentage = (parseFloat(points) / pointsPossible) * 100;
    if (percentage >= 90) return "default";
    if (percentage >= 80) return "secondary";
    if (percentage >= 70) return "outline";
    return "destructive";
  };

  const getLetterGrade = (points: string, pointsPossible: number) => {
    const percentage = (parseFloat(points) / pointsPossible) * 100;
    if (percentage >= 93) return "A";
    if (percentage >= 90) return "A-";
    if (percentage >= 87) return "B+";
    if (percentage >= 83) return "B";
    if (percentage >= 80) return "B-";
    if (percentage >= 77) return "C+";
    if (percentage >= 73) return "C";
    if (percentage >= 70) return "C-";
    if (percentage >= 67) return "D+";
    if (percentage >= 63) return "D";
    if (percentage >= 60) return "D-";
    return "F";
  };

  if (grades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" data-testid={`${testId}-empty`}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <span className="text-2xl font-bold text-muted-foreground">--</span>
        </div>
        <h3 className="mt-4 font-heading text-lg font-semibold">No grades yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Your grades will appear here once assignments are graded.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid={testId}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Assignment</TableHead>
            <TableHead>Course</TableHead>
            <TableHead className="text-center">Score</TableHead>
            <TableHead className="text-center">Grade</TableHead>
            <TableHead>Feedback</TableHead>
            <TableHead>Graded On</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grades.map((grade) => (
            <TableRow key={grade.id} data-testid={`${testId}-row-${grade.id}`}>
              <TableCell className="font-medium">
                {grade.submission?.assignment?.title || "Unknown Assignment"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {/* Course info would come from joining */}
                -
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={getGradeBadgeVariant(
                    grade.points,
                    grade.submission?.assignment?.pointsPossible || 100
                  )}
                >
                  {grade.points} / {grade.submission?.assignment?.pointsPossible || 100}
                </Badge>
              </TableCell>
              <TableCell className="text-center font-heading font-semibold">
                {getLetterGrade(
                  grade.points,
                  grade.submission?.assignment?.pointsPossible || 100
                )}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                {grade.feedback || "No feedback provided"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {grade.gradedAt
                  ? format(new Date(grade.gradedAt), "MMM d, yyyy")
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
