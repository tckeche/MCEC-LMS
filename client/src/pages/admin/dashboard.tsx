import { useQuery } from "@tanstack/react-query";
import { BookOpen, Users, GraduationCap, Shield, UserPlus } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  StatCardSkeleton,
} from "@/components/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import type { User } from "@shared/schema";

interface AdminDashboardData {
  stats: {
    totalUsers: number;
    totalStudents: number;
    totalTutors: number;
    totalCourses: number;
  };
  recentUsers: User[];
  usersByRole: {
    role: string;
    count: number;
  }[];
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery<AdminDashboardData>({
    queryKey: ["/api/admin/dashboard"],
  });

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      case "tutor":
        return "secondary";
      case "parent":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage users, roles, and system settings.
          </p>
        </div>
        <Button asChild data-testid="button-manage-users">
          <Link href="/admin/users">
            <UserPlus className="mr-2 h-4 w-4" />
            Manage Users
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Users"
              value={data?.stats.totalUsers || 0}
              icon={<Users className="h-6 w-6" />}
              testId="stat-total-users"
            />
            <StatCard
              title="Students"
              value={data?.stats.totalStudents || 0}
              icon={<GraduationCap className="h-6 w-6" />}
              testId="stat-total-students"
            />
            <StatCard
              title="Tutors"
              value={data?.stats.totalTutors || 0}
              icon={<Shield className="h-6 w-6" />}
              testId="stat-total-tutors"
            />
            <StatCard
              title="Courses"
              value={data?.stats.totalCourses || 0}
              icon={<BookOpen className="h-6 w-6" />}
              testId="stat-total-courses"
            />
          </>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="font-heading text-xl">Recent Users</CardTitle>
              <Button variant="outline" size="sm" asChild data-testid="link-view-all-users">
                <Link href="/admin/users">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                      <div className="flex-1">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                        <div className="mt-1 h-3 w-1/2 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : data?.recentUsers && data.recentUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentUsers.slice(0, 5).map((user) => (
                        <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={user.profileImageUrl || undefined}
                                  className="object-cover"
                                />
                                <AvatarFallback className="text-xs">
                                  {getInitials(user.firstName, user.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {user.firstName} {user.lastName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getRoleBadgeVariant(user.role)}
                              className="capitalize"
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  icon={<Users className="h-8 w-8" />}
                  title="No users yet"
                  description="Users will appear here once they sign up."
                  testId="empty-users"
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Users by Role</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-6 w-12 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : data?.usersByRole && data.usersByRole.length > 0 ? (
              <div className="space-y-4">
                {data.usersByRole.map((item) => (
                  <div
                    key={item.role}
                    className="flex items-center justify-between"
                    data-testid={`role-count-${item.role}`}
                  >
                    <span className="capitalize text-muted-foreground">{item.role}s</span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Shield className="h-8 w-8" />}
                title="No data"
                description="Role distribution will appear here."
                testId="empty-roles"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
