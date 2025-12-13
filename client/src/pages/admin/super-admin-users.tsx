import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  ShieldCheck,
  Search,
  History,
  User,
  Crown,
} from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { format } from "date-fns";

const roleColors: Record<string, string> = {
  student: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  parent: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  tutor: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  manager: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

interface AuditLog {
  id: number;
  action: string;
  targetUserId: string;
  performedById: string;
  details: string;
  createdAt: string;
}

export default function SuperAdminUsers() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    action: "promote" | "demote";
    userName: string;
  } | null>(null);

  const { data: users, isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ["/api/super-admin/users"],
  });

  const { data: auditLogs, isLoading: logsLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/super-admin/audit-logs"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PATCH", `/api/super-admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/audit-logs"] });
      toast({ title: "Role updated successfully" });
      setEditingUser(null);
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const updateAdminLevelMutation = useMutation({
    mutationFn: async ({ userId, adminLevel }: { userId: string; adminLevel: number }) => {
      return apiRequest("PATCH", `/api/super-admin/users/${userId}/admin-level`, { adminLevel });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/audit-logs"] });
      toast({ title: "Admin level updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update admin level", variant: "destructive" });
    },
  });

  const toggleSuperAdminMutation = useMutation({
    mutationFn: async ({ userId, isSuperAdmin }: { userId: string; isSuperAdmin: boolean }) => {
      return apiRequest("PATCH", `/api/super-admin/users/${userId}/super-admin`, { isSuperAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/audit-logs"] });
      toast({ title: "Super Admin status updated successfully" });
      setConfirmDialog(null);
    },
    onError: () => {
      toast({ title: "Failed to update Super Admin status", variant: "destructive" });
    },
  });

  const filteredUsers = users?.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower)
    );
  });

  const handleSuperAdminToggle = (user: UserType) => {
    setConfirmDialog({
      open: true,
      userId: user.id,
      action: user.isSuperAdmin ? "demote" : "promote",
      userName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Unknown",
    });
  };

  const confirmSuperAdminToggle = () => {
    if (confirmDialog) {
      toggleSuperAdminMutation.mutate({
        userId: confirmDialog.userId,
        isSuperAdmin: confirmDialog.action === "promote",
      });
    }
  };

  if (usersLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Super Admin Panel</h1>
          <p className="text-sm text-muted-foreground">
            Manage users, roles, and system access
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">
            <User className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">
            <History className="h-4 w-4 mr-2" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    View and manage all users in the system
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-users"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Admin Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Super Admin</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                              {user.isSuperAdmin ? (
                                <Crown className="h-4 w-4 text-amber-500" />
                              ) : (
                                <User className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium" data-testid={`text-user-name-${user.id}`}>
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={roleColors[user.role] || ""}
                            data-testid={`badge-role-${user.id}`}
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={String(user.adminLevel ?? 0)}
                            onValueChange={(value) =>
                              updateAdminLevelMutation.mutate({
                                userId: user.id,
                                adminLevel: parseInt(value),
                              })
                            }
                            data-testid={`select-admin-level-${user.id}`}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.isActive ? "default" : "secondary"}
                            data-testid={`badge-status-${user.id}`}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={user.isSuperAdmin ? "default" : "outline"}
                            onClick={() => handleSuperAdminToggle(user)}
                            data-testid={`button-toggle-super-admin-${user.id}`}
                          >
                            {user.isSuperAdmin ? (
                              <>
                                <ShieldCheck className="h-4 w-4 mr-1" />
                                Yes
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-1" />
                                No
                              </>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingUser(user)}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            Edit Role
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                Track all administrative actions performed by Super Admins
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Performed By</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs?.map((log) => (
                        <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                          <TableCell>
                            <Badge variant="outline">{log.action}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {log.details}
                          </TableCell>
                          <TableCell>
                            {users?.find((u) => u.id === log.performedById)?.email || `User #${log.performedById}`}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!auditLogs || auditLogs.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No audit logs found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role for {editingUser?.firstName} {editingUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={editingUser?.role}
              onValueChange={(role) => {
                if (editingUser) {
                  updateRoleMutation.mutate({ userId: editingUser.id, role });
                }
              }}
            >
              <SelectTrigger data-testid="select-edit-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="tutor">Tutor</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDialog?.open} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.action === "promote"
                ? "Promote to Super Admin"
                : "Remove Super Admin Access"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.action === "promote"
                ? `Are you sure you want to give ${confirmDialog?.userName} Super Admin access? This will allow them to bypass all role-based access controls.`
                : `Are you sure you want to remove Super Admin access from ${confirmDialog?.userName}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog?.action === "promote" ? "default" : "destructive"}
              onClick={confirmSuperAdminToggle}
              disabled={toggleSuperAdminMutation.isPending}
              data-testid="button-confirm-super-admin"
            >
              {toggleSuperAdminMutation.isPending
                ? "Processing..."
                : confirmDialog?.action === "promote"
                  ? "Grant Super Admin"
                  : "Remove Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
