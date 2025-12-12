import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import StudentDashboard from "@/pages/student/dashboard";
import StudentCourses from "@/pages/student/courses";
import StudentAssignments from "@/pages/student/assignments";
import StudentGrades from "@/pages/student/grades";
import ParentDashboard from "@/pages/parent/dashboard";
import TutorDashboard from "@/pages/tutor/dashboard";
import TutorCourses from "@/pages/tutor/courses";
import TutorGradebook from "@/pages/tutor/gradebook";
import TutorStudents from "@/pages/tutor/students";
import ManagerDashboard from "@/pages/manager/dashboard";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import Announcements from "@/pages/announcements";

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b bg-background px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function StudentRoutes() {
  return (
    <Switch>
      <Route path="/" component={StudentDashboard} />
      <Route path="/courses" component={StudentCourses} />
      <Route path="/assignments" component={StudentAssignments} />
      <Route path="/grades" component={StudentGrades} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ParentRoutes() {
  return (
    <Switch>
      <Route path="/" component={ParentDashboard} />
      <Route path="/courses" component={StudentCourses} />
      <Route path="/grades" component={StudentGrades} />
      <Route component={NotFound} />
    </Switch>
  );
}

function TutorRoutes() {
  return (
    <Switch>
      <Route path="/" component={TutorDashboard} />
      <Route path="/tutor/courses" component={TutorCourses} />
      <Route path="/tutor/gradebook" component={TutorGradebook} />
      <Route path="/tutor/students" component={TutorStudents} />
      <Route path="/announcements" component={Announcements} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ManagerRoutes() {
  return (
    <Switch>
      <Route path="/" component={ManagerDashboard} />
      <Route path="/manager/overview" component={ManagerDashboard} />
      <Route path="/announcements" component={Announcements} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AdminRoutes() {
  return (
    <Switch>
      <Route path="/" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/announcements" component={Announcements} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Landing />;
  }

  const roleRoutes: Record<string, React.ReactNode> = {
    student: <StudentRoutes />,
    parent: <ParentRoutes />,
    tutor: <TutorRoutes />,
    manager: <ManagerRoutes />,
    admin: <AdminRoutes />,
  };

  return (
    <AuthenticatedLayout>
      {roleRoutes[user.role] || <NotFound />}
    </AuthenticatedLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="mcec-lms-theme">
        <TooltipProvider>
          <AppRouter />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
