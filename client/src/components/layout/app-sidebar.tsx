import { Link, useLocation } from "wouter";
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  Home,
  Users,
  Settings,
  BarChart3,
  Megaphone,
  UserCog,
  FileText,
  Calendar,
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
import type { UserRole } from "@shared/schema";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
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
    title: "User Management",
    url: "/admin/users",
    icon: UserCog,
    roles: ["admin"],
  },
  {
    title: "Invoices",
    url: "/admin/invoices",
    icon: FileText,
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
    url: "/settings",
    icon: Settings,
    roles: ["admin"],
  },
];

export function AppSidebar() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(user.role as UserRole)
  );

  const mainItems = filteredItems.filter(
    (item) => !["Settings", "Announcements"].includes(item.title)
  );
  const secondaryItems = filteredItems.filter((item) =>
    ["Settings", "Announcements"].includes(item.title)
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-heading text-lg font-bold">MCEC LMS</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {secondaryItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {secondaryItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Logged in as{" "}
          <span className="font-medium capitalize">{user.role}</span>
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
