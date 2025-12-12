import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, BookOpen } from "lucide-react";
import { Link } from "wouter";
import type { CourseWithTutor } from "@shared/schema";

interface CourseCardProps {
  course: CourseWithTutor;
  progress?: number;
  enrollmentCount?: number;
  showEnrollButton?: boolean;
  showManageButton?: boolean;
  onEnroll?: () => void;
  testId?: string;
}

export function CourseCard({
  course,
  progress,
  enrollmentCount,
  showEnrollButton,
  showManageButton,
  onEnroll,
  testId,
}: CourseCardProps) {
  return (
    <Card className="flex flex-col" data-testid={testId}>
      <div className="relative h-40 overflow-hidden rounded-t-md bg-muted">
        {course.imageUrl ? (
          <img
            src={course.imageUrl}
            alt={course.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <BookOpen className="h-16 w-16 text-primary/40" />
          </div>
        )}
        {!course.isActive && (
          <Badge variant="secondary" className="absolute right-2 top-2">
            Inactive
          </Badge>
        )}
      </div>
      <CardContent className="flex-1 p-4">
        <h3 className="font-heading text-lg font-semibold line-clamp-2" data-testid={`${testId}-title`}>
          {course.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {course.tutor?.firstName} {course.tutor?.lastName}
        </p>
        {course.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {course.description}
          </p>
        )}
        {progress !== undefined && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        {enrollmentCount !== undefined && (
          <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{enrollmentCount} students enrolled</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2 border-t p-4">
        <Button asChild variant="outline" className="flex-1" data-testid={`${testId}-view`}>
          <Link href={`/courses/${course.id}`}>View Course</Link>
        </Button>
        {showEnrollButton && (
          <Button onClick={onEnroll} className="flex-1" data-testid={`${testId}-enroll`}>
            Enroll
          </Button>
        )}
        {showManageButton && (
          <Button asChild className="flex-1" data-testid={`${testId}-manage`}>
            <Link href={`/tutor/courses/${course.id}`}>Manage</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
