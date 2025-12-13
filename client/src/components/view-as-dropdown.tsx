import { useAuth } from "@/hooks/useAuth";
import { useViewAs } from "@/contexts/view-as-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Eye, X, GraduationCap, Users, BookOpen, BarChart3, Shield } from "lucide-react";
import type { UserRole } from "@shared/schema";

const roleConfig: Record<UserRole, { label: string; icon: React.ReactNode }> = {
  student: { label: "Student", icon: <GraduationCap className="h-4 w-4" /> },
  parent: { label: "Parent", icon: <Users className="h-4 w-4" /> },
  tutor: { label: "Tutor", icon: <BookOpen className="h-4 w-4" /> },
  manager: { label: "Manager", icon: <BarChart3 className="h-4 w-4" /> },
  admin: { label: "Admin", icon: <Shield className="h-4 w-4" /> },
};

export function ViewAsDropdown() {
  const { user } = useAuth();
  const { viewAsRole, setViewAsRole, clearViewAs } = useViewAs();

  if (!user?.isSuperAdmin) {
    return null;
  }

  const roles: UserRole[] = ["student", "parent", "tutor", "manager", "admin"];

  return (
    <div className="flex items-center gap-2">
      {viewAsRole && (
        <Badge variant="secondary" className="gap-1" data-testid="badge-viewing-as">
          <Eye className="h-3 w-3" />
          Viewing as {roleConfig[viewAsRole].label}
        </Badge>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="button-view-as"
          >
            <Eye className="h-4 w-4" />
            View As
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Switch View</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {roles.map((role) => (
            <DropdownMenuItem
              key={role}
              onClick={() => setViewAsRole(role)}
              className="gap-2"
              data-testid={`menu-view-as-${role}`}
            >
              {roleConfig[role].icon}
              {roleConfig[role].label}
              {viewAsRole === role && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Current
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
          {viewAsRole && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={clearViewAs}
                className="gap-2 text-muted-foreground"
                data-testid="menu-clear-view-as"
              >
                <X className="h-4 w-4" />
                Clear View-As
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
