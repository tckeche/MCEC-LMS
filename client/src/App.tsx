import { Switch, Route, useLocation } from "wouter";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, LogOut } from "lucide-react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import ParentSignup from "@/pages/auth/parent-signup";
import StaffProposal from "@/pages/auth/staff-proposal";
import mcecLogo from "@assets/MCEC_Transparent_Logo_1765615854771.jpg";
import StudentDashboard from "@/pages/student/dashboard";
import StudentCourses from "@/pages/student/courses";
import StudentAssignments from "@/pages/student/assignments";
import StudentGrades from "@/pages/student/grades";
import StudentScheduling from "@/pages/student/scheduling";
import ParentDashboard from "@/pages/parent/dashboard";
import ParentInvoices from "@/pages/parent/invoices";
import ParentAttendance from "@/pages/parent/attendance";
import TutorDashboard from "@/pages/tutor/dashboard";
import TutorCourses from "@/pages/tutor/courses";
import TutorGradebook from "@/pages/tutor/gradebook";
import TutorStudents from "@/pages/tutor/students";
import TutorAvailability from "@/pages/tutor/availability";
import TutorProposals from "@/pages/tutor/proposals";
import TutorCourseDetail from "@/pages/tutor/course-detail";
import CalendarPage from "@/pages/calendar";
import ManagerDashboard from "@/pages/manager/dashboard";
import ManagerTutors from "@/pages/manager/tutors";
import ManagerCourses from "@/pages/manager/courses";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminInvoices from "@/pages/admin/invoices";
import AdminPayroll from "@/pages/admin/payroll";
import AdminStaffApproval from "@/pages/admin/staff-approval";
import AdminCourses from "@/pages/admin/courses";
import AdminSettings from "@/pages/admin/settings";
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

function PendingAccountScreen() {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <img src={mcecLogo} alt="MCEC Logo" className="h-20 object-contain" data-testid="img-logo" />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" asChild data-testid="button-logout">
              <a href="/api/logout">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
              <Clock className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl" data-testid="text-pending-title">
              Account Pending Approval
            </CardTitle>
            <CardDescription data-testid="text-pending-description">
              Your account is awaiting approval by an administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Hello, {user?.firstName || user?.email || "User"}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Once your account is approved, you will be able to access the platform. 
              This typically takes 1-2 business days.
            </p>
            <Button variant="outline" asChild data-testid="button-logout-bottom">
              <a href="/api/logout">Sign Out</a>
            </Button>
          </CardContent>
        </Card>
      </main>
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
      <Route path="/scheduling" component={StudentScheduling} />
      <Route path="/calendar" component={CalendarPage} />
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
      <Route path="/invoices" component={ParentInvoices} />
      <Route path="/attendance" component={ParentAttendance} />
      <Route component={NotFound} />
    </Switch>
  );
}

function TutorRoutes() {
  return (
    <Switch>
      <Route path="/" component={TutorDashboard} />
      <Route path="/tutor/courses" component={TutorCourses} />
      <Route path="/tutor/courses/:id" component={TutorCourseDetail} />
      <Route path="/tutor/gradebook" component={TutorGradebook} />
      <Route path="/tutor/students" component={TutorStudents} />
      <Route path="/tutor/availability" component={TutorAvailability} />
      <Route path="/tutor/proposals" component={TutorProposals} />
      <Route path="/calendar" component={CalendarPage} />
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
      <Route path="/manager/tutors" component={ManagerTutors} />
      <Route path="/manager/courses" component={ManagerCourses} />
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
      <Route path="/admin/invoices" component={AdminInvoices} />
      <Route path="/admin/payroll" component={AdminPayroll} />
      <Route path="/admin/staff-approval" component={AdminStaffApproval} />
      <Route path="/admin/courses" component={AdminCourses} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/announcements" component={Announcements} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (location.startsWith("/auth/")) {
    return (
      <Switch>
        <Route path="/auth/parent-signup" component={ParentSignup} />
        <Route path="/auth/staff-proposal" component={StaffProposal} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  if (!user) {
    return <Landing />;
  }

  if (user.status === "pending") {
    return <PendingAccountScreen />;
  }

  if (user.status === "rejected") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3">
              <img src={mcecLogo} alt="MCEC Logo" className="h-20 object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" asChild>
                <a href="/api/logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </a>
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-destructive">Account Rejected</CardTitle>
              <CardDescription>
                Your account request has been rejected. Please contact support for more information.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" asChild>
                <a href="/api/logout">Sign Out</a>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
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
