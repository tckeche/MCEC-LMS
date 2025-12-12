import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import type { AnnouncementWithAuthor } from "@shared/schema";

interface AnnouncementCardProps {
  announcement: AnnouncementWithAuthor;
  testId?: string;
}

export function AnnouncementCard({ announcement, testId }: AnnouncementCardProps) {
  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "A";
  };

  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-start gap-4 pb-2">
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={announcement.author?.profileImageUrl || undefined}
            alt={`${announcement.author?.firstName || ""} ${announcement.author?.lastName || ""}`}
            className="object-cover"
          />
          <AvatarFallback className="text-xs">
            {getInitials(announcement.author?.firstName, announcement.author?.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-semibold" data-testid={`${testId}-title`}>
              {announcement.title}
            </h3>
            {announcement.isGlobal && (
              <Badge variant="default" className="text-xs">
                Global
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              {announcement.author?.firstName} {announcement.author?.lastName}
            </span>
            <span>·</span>
            <span>
              {announcement.createdAt
                ? format(new Date(announcement.createdAt), "MMM d, yyyy 'at' h:mm a")
                : "Unknown date"}
            </span>
            {announcement.course && (
              <>
                <span>·</span>
                <span>{announcement.course.title}</span>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <p className="text-sm leading-relaxed text-foreground" data-testid={`${testId}-content`}>
          {announcement.content}
        </p>
      </CardContent>
    </Card>
  );
}
