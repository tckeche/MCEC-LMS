import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
          <Skeleton className="h-12 w-12 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

export function CourseCardSkeleton() {
  return (
    <Card>
      <Skeleton className="h-40 rounded-b-none rounded-t-md" />
      <CardContent className="p-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="mt-2 h-4 w-1/2" />
        <Skeleton className="mt-3 h-16 w-full" />
      </CardContent>
      <div className="flex gap-2 border-t p-4">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 flex-1" />
      </div>
    </Card>
  );
}

export function AssignmentCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="mt-2 h-6 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </div>
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
        <div className="mt-4 flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
      <div className="border-t p-4">
        <Skeleton className="h-9 w-full" />
      </div>
    </Card>
  );
}

export function AnnouncementCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-4 pb-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-2 h-3 w-1/3" />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />
    </div>
  );
}
