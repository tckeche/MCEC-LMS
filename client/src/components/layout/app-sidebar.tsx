import { Link, useLocation } from "wouter";
import {
  BookOpen,
  ClipboardList,
  Clock,
  GraduationCap,
  Home,
  Users,
  Settings,
  BarChart3,
  Megaphone,
  UserCog,
  FileText,
  Calendar,
  Wallet,
  UserCheck,
  LogOut,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useViewAs } from "@/contexts/view-as-context";
import type { UserRole } from "@shared/schema";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  superAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    roles: ["student", "parent", "tutor", "manager", "admin"],
  },
  {
    title: "My Courses",
    url: "/courses",
    icon: BookOpen,
    roles: ["student", "parent"],
  },
  {
    title: "Assignments",
    url: "/assignments",
    icon: ClipboardList,
    roles: ["student"],
  },
  {
    title: "Grades",
    url: "/grades",
    icon: FileText,
    roles: ["student", "parent"],
  },
  {
    title: "Invoices",
    url: "/invoices",
    icon: FileText,
    roles: ["parent"],
  },
  {
    title: "Attendance",
    url: "/attendance",
    icon: Calendar,
    roles: ["parent"],
  },
  {
    title: "Schedule Tutoring",
    url: "/scheduling",
    icon: Calendar,
    roles: ["student"],
  },
  {
    title: "Session Calendar",
    url: "/calendar",
    icon: Calendar,
    roles: ["student", "tutor"],
  },
  {
    title: "Course Management",
    url: "/tutor/courses",
    icon: BookOpen,
    roles: ["tutor"],
  },
  {
    title: "Grade Book",
    url: "/tutor/gradebook",
    icon: ClipboardList,
    roles: ["tutor"],
  },
  {
    title: "Students",
    url: "/tutor/students",
    icon: Users,
    roles: ["tutor"],
  },
  {
    title: "My Availability",
    url: "/tutor/availability",
    icon: Calendar,
    roles: ["tutor"],
  },
  {
    title: "Session Requests",
    url: "/tutor/proposals",
    icon: ClipboardList,
    roles: ["tutor"],
  },
  {
    title: "Overview",
    url: "/manager/overview",
    icon: BarChart3,
    roles: ["manager"],
  },
  {
    title: "Tutors",
    url: "/manager/tutors",
    icon: GraduationCap,
    roles: ["manager"],
  },
  {
    title: "Courses",
    url: "/manager/courses",
    icon: BookOpen,
    roles: ["manager"],
  },
  {
    title: "Hours Wallets",
    url: "/manager/wallets",
    icon: Clock,
    roles: ["manager"],
  },
  {
    title: "User Management",
    url: "/admin/users",
    icon: UserCog,
    roles: ["admin"],
  },
  {
    title: "Hours Wallets",
    url: "/admin/wallets",
    icon: Clock,
    roles: ["admin"],
  },
  {
    title: "Invoices",
    url: "/admin/invoices",
    icon: FileText,
    roles: ["admin"],
  },
  {
    title: "Payroll",
    url: "/admin/payroll",
    icon: Wallet,
    roles: ["admin"],
  },
  {
    title: "Staff Approval",
    url: "/admin/staff-approval",
    icon: UserCheck,
    roles: ["admin"],
  },
  {
    title: "All Courses",
    url: "/admin/courses",
    icon: BookOpen,
    roles: ["admin"],
  },
  {
    title: "Announcements",
    url: "/announcements",
    icon: Megaphone,
    roles: ["tutor", "manager", "admin"],
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
    roles: ["admin"],
  },
  {
    title: "Super Admin",
    url: "/admin/super-admin",
    icon: Shield,
    roles: ["admin"],
    superAdminOnly: true,
  },
];

export function AppSidebar() {
  const { user } = useAuth();
  const { viewAsRole } = useViewAs();
  const [location] = useLocation();

  if (!user) return null;

  const effectiveRole = user?.isSuperAdmin && viewAsRole ? viewAsRole : (user?.role || "student");

  const filteredItems = navItems.filter((item) => {
    if (item.superAdminOnly) {
      return user.isSuperAdmin;
    }
    return item.roles.includes(effectiveRole as UserRole);
  });

  const mainItems = filteredItems.filter(
    (item) => !["Settings", "Announcements", "Super Admin"].includes(item.title)
  );
  const secondaryItems = filteredItems.filter((item) =>
    ["Settings", "Announcements", "Super Admin"].includes(item.title)
  );

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="border-b border-border/50 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-sm font-bold tracking-tight">MCEC LMS</span>
            <span className="text-xs text-muted-foreground capitalize">{effectiveRole}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={isActive ? "bg-primary/10 text-primary ring-1 ring-primary/20" : ""}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {secondaryItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
              System
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {secondaryItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={isActive ? "bg-primary/10 text-primary ring-1 ring-primary/20" : ""}
                        data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-border/50 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground truncate">
            {user?.email || "User"}
          </p>
          <a
            href="/api/logout"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-1 hover:bg-muted/50"
            data-testid="button-logout-sidebar"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
