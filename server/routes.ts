// API routes for MCEC LMS
import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import {
  setupAuth,
  isAuthenticated,
  requireAdminLevel
} from "./auth";

import { setupDevAuth } from "./devAuth";
import {
  insertCourseSchema,
  insertEnrollmentSchema,
  insertAssignmentSchema,
  insertSubmissionSchema,
  insertGradeSchema,
  insertAnnouncementSchema,
  insertParentChildSchema,
  insertTutorAvailabilitySchema,
  insertSessionProposalSchema,
  insertHourWalletSchema,
  insertInvoiceSchema,
  insertInvoiceLineItemSchema,
  insertPayoutSchema,
  insertPayoutLineSchema,
  insertPayoutFlagSchema,
  type UserRole,
  type ProposalStatus,
  type TutoringSessionStatus,
  type InvoiceStatus,
  type PayoutStatus,
} from "@shared/schema";
import { z } from "zod";
import PDFDocument from "pdfkit";

function isStaffWithAccess(user: any) {
  return (
    user?.isSuperAdmin === true ||
    user?.role === "admin" ||
    user?.role === "manager"
  );
}

// Round minutes up to nearest 15-minute block for consistent billing
function roundUpTo15Minutes(minutes: number): number {
  return Math.ceil(minutes / 15) * 15;
}

// Helper to deduct from wallet with audit logging
async function deductWalletWithAudit(
  studentId: string, 
  courseId: string, 
  minutes: number, 
  reason: string,
  sessionId?: string
): Promise<void> {
  const wallet = await storage.getHourWalletByStudentCourse(studentId, courseId);
  if (!wallet) return;
  
  await storage.deductMinutesFromWallet(studentId, courseId, minutes);
  
  // Refetch to get updated balance
  const updatedWallet = await storage.getHourWalletByStudentCourse(studentId, courseId);
  if (updatedWallet) {
    const remainingMinutes = updatedWallet.purchasedMinutes - updatedWallet.consumedMinutes;
    await storage.createWalletTransaction({
      walletId: updatedWallet.id,
      minutesDelta: -minutes,
      balanceAfter: remainingMinutes,
      reason: reason,
      performedById: null,
    });
  }
}

// Helper to refund to wallet with audit logging
async function refundWalletWithAudit(
  studentId: string, 
  courseId: string, 
  minutes: number, 
  reason: string
): Promise<void> {
  const wallet = await storage.getHourWalletByStudentCourse(studentId, courseId);
  if (!wallet) return;
  
  // Refund works by reducing consumedMinutes
  const newConsumed = Math.max(0, wallet.consumedMinutes - minutes);
  await storage.updateHourWallet(wallet.id, { consumedMinutes: newConsumed });
  
  const remainingMinutes = wallet.purchasedMinutes - newConsumed;
  await storage.createWalletTransaction({
    walletId: wallet.id,
    minutesDelta: minutes, // Positive delta for refund
    balanceAfter: remainingMinutes,
    reason: `[REFUND] ${reason}`,
    performedById: null,
  });
}

function getDbUser(req: Request) {
  return (req as any).dbUser;
}


// Extend Express Request to include dbUser from session auth
declare global {
  namespace Express {
    interface User {
      claims: {
        sub: string;
      };
    }
    interface Request {
      dbUser?: import("@shared/schema").User;
    }
  }
}

// Role-based middleware with isActive check
const requireRole = (...roles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(403).json({ message: "Forbidden: user not found" });
    }
    
    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }
    
    // Super Admin bypasses all role checks
    if (user.isSuperAdmin) {
      (req as any).dbUser = user;
      return next();
    }
    
    // Regular role check
    if (!roles.includes(user.role as UserRole)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }
    
    // Attach user to request for ownership checks
    (req as any).dbUser = user;
    
    next();
  };
};

// Super Admin only middleware
const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(403).json({ message: "Forbidden: user not found" });
  }
  
  if (!user.isActive) {
    return res.status(403).json({ message: "Account is deactivated" });
  }
  
  if (!user.isSuperAdmin) {
    return res.status(403).json({ message: "Forbidden: Super Admin access required" });
  }
  
  (req as any).dbUser = user;
  next();
};

// Zod schemas for PATCH validation (allowing partial updates with safe fields only)
const updateCourseSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  syllabus: z.string().optional(),
  isActive: z.boolean().optional(),
  maxEnrollment: z.number().int().positive().optional(),
  imageUrl: z.string().optional(),
  teamsMeetingLink: z.string().nullable().optional(),
});

const updateAssignmentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  pointsPossible: z.number().int().positive().optional(),
  status: z.enum(["draft", "published", "closed"]).optional(),
});

const updateSubmissionSchema = z.object({
  content: z.string().optional(),
  fileUrl: z.string().optional(),
  status: z.enum(["pending", "submitted", "graded", "late"]).optional(),
});

const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  isGlobal: z.boolean().optional(),
});

const updateGradeSchema = z.object({
  points: z.number().int().min(0).optional(),
  feedback: z.string().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);
  
  // Setup Development Auth (Microsoft SSO & Phone OTP bypasses)
  setupDevAuth(app);

  // ==========================================
  // AUTH ROUTES
  // ==========================================
  
  app.get('/api/auth/user', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ==========================================
  // STAFF ROLE REQUEST ROUTES
  // ==========================================
  
  // Submit staff role proposal (authenticated users only)
  app.post('/api/staff/proposals', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { proposedRole, notes } = req.body;
      
      // Validate proposed role
      if (!['tutor', 'manager', 'admin'].includes(proposedRole)) {
        return res.status(400).json({ message: "Invalid role. Must be tutor, manager, or admin" });
      }
      
      // Check if user already has a pending request
      const existingRequest = await storage.getUserStaffRoleRequest(userId);
      if (existingRequest && existingRequest.status === 'pending') {
        return res.status(400).json({ message: "You already have a pending role request" });
      }
      
      // Create the staff role request
      const request = await storage.createStaffRoleRequest({
        userId,
        proposedRole,
        notes: notes || null,
        status: 'pending',
      });
      
      // Update user status to pending
      await storage.updateUserAccountStatus(userId, 'pending');
      
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating staff role request:", error);
      res.status(500).json({ message: "Failed to submit staff role request" });
    }
  });
  
  // Get current user's staff role request
  app.get('/api/staff/proposals/me', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const request = await storage.getUserStaffRoleRequest(userId);
      res.json(request || null);
    } catch (error) {
      console.error("Error fetching user's staff role request:", error);
      res.status(500).json({ message: "Failed to fetch staff role request" });
    }
  });
  
  // Get all pending staff role requests (admin level 1+ - Staff)
  app.get('/api/staff/proposals', isAuthenticated, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      if (dbUser.adminLevel < 1) {
        return res.status(403).json({ message: "Insufficient admin level. Level 1 (Staff) required." });
      }
      
      const requests = await storage.getPendingStaffRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching pending staff requests:", error);
      res.status(500).json({ message: "Failed to fetch pending requests" });
    }
  });
  
  // Approve staff role request (admin level 1+ - Staff)
  app.post('/api/staff/proposals/:id/approve', isAuthenticated, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      if (dbUser.adminLevel < 1) {
        return res.status(403).json({ message: "Insufficient admin level. Level 1 (Staff) required." });
      }
      
      const reviewerId = req.user?.claims?.sub;
      if (!reviewerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      await storage.approveStaffRequest(req.params.id, reviewerId);
      res.json({ message: "Staff request approved" });
    } catch (error) {
      console.error("Error approving staff request:", error);
      res.status(500).json({ message: "Failed to approve staff request" });
    }
  });
  
  // Reject staff role request (admin level 1+ - Staff)
  app.post('/api/staff/proposals/:id/reject', isAuthenticated, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      if (dbUser.adminLevel < 1) {
        return res.status(403).json({ message: "Insufficient admin level. Level 1 (Staff) required." });
      }
      
      const reviewerId = req.user?.claims?.sub;
      if (!reviewerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      
      await storage.rejectStaffRequest(req.params.id, reviewerId, reason);
      res.json({ message: "Staff request rejected" });
    } catch (error) {
      console.error("Error rejecting staff request:", error);
      res.status(500).json({ message: "Failed to reject staff request" });
    }
  });

  // ==========================================
  // USER ROUTES
  // ==========================================
  
  // Get all users (admin only)
  app.get('/api/users', isAuthenticated, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get users by role (admin/manager)
  app.get('/api/users/role/:role', isAuthenticated, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const role = req.params.role as UserRole;
      const users = await storage.getUsersByRole(role);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users by role:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user role (admin only)
  app.patch('/api/users/:id/role', isAuthenticated, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { role } = req.body;
      const user = await storage.updateUserRole(req.params.id, role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Update user status (admin only)
  app.patch('/api/users/:id/status', isAuthenticated, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { isActive } = req.body;
      const user = await storage.updateUserStatus(req.params.id, isActive);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // ==========================================
  // SUPER ADMIN ROUTES
  // ==========================================

  // Get all users with full details (Super Admin only)
  app.get('/api/super-admin/users', isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user's admin level (Super Admin only)
  app.patch('/api/super-admin/users/:id/admin-level', isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      const { adminLevel } = req.body;
      
      if (typeof adminLevel !== 'number' || adminLevel < 1 || adminLevel > 5) {
        return res.status(400).json({ message: "Admin level must be between 1 and 5" });
      }
      
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const previousValue = targetUser.adminLevel?.toString() || "1";
      
      const user = await storage.updateUserAdminLevel(req.params.id, adminLevel);
      
      await storage.createAuditLog({
        performedById: dbUser.id,
        targetUserId: req.params.id,
        action: "update_admin_level",
        previousValue,
        newValue: adminLevel.toString(),
        metadata: { targetEmail: targetUser.email },
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error updating admin level:", error);
      res.status(500).json({ message: "Failed to update admin level" });
    }
  });

  // Toggle Super Admin status (Super Admin only)
  app.patch('/api/super-admin/users/:id/super-admin', isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      const { isSuperAdmin } = req.body;
      
      if (typeof isSuperAdmin !== 'boolean') {
        return res.status(400).json({ message: "isSuperAdmin must be a boolean" });
      }
      
      if (req.params.id === dbUser.id) {
        return res.status(400).json({ message: "Cannot modify your own Super Admin status" });
      }
      
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const previousValue = targetUser.isSuperAdmin.toString();
      
      const user = await storage.updateUserSuperAdmin(req.params.id, isSuperAdmin);
      
      await storage.createAuditLog({
        performedById: dbUser.id,
        targetUserId: req.params.id,
        action: isSuperAdmin ? "grant_super_admin" : "revoke_super_admin",
        previousValue,
        newValue: isSuperAdmin.toString(),
        metadata: { targetEmail: targetUser.email },
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error updating super admin status:", error);
      res.status(500).json({ message: "Failed to update super admin status" });
    }
  });

  // Update user role with audit logging (Super Admin only)
  app.patch('/api/super-admin/users/:id/role', isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      const { role } = req.body;
      
      const validRoles = ["student", "parent", "tutor", "manager", "admin"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const previousValue = targetUser.role;
      
      const user = await storage.updateUserRole(req.params.id, role);
      
      await storage.createAuditLog({
        performedById: dbUser.id,
        targetUserId: req.params.id,
        action: "update_role",
        previousValue,
        newValue: role,
        metadata: { targetEmail: targetUser.email },
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Update user fully (Super Admin only - can update multiple fields at once)
  app.patch('/api/super-admin/users/:id', isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      const { role, adminLevel, isActive, status } = req.body;
      
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updateData: any = {};
      const changes: string[] = [];
      
      if (role !== undefined) {
        const validRoles = ["student", "parent", "tutor", "manager", "admin"];
        if (!validRoles.includes(role)) {
          return res.status(400).json({ message: "Invalid role" });
        }
        updateData.role = role;
        changes.push(`role: ${targetUser.role} -> ${role}`);
      }
      
      if (adminLevel !== undefined) {
        if (typeof adminLevel !== 'number' || adminLevel < 1 || adminLevel > 5) {
          return res.status(400).json({ message: "Admin level must be between 1 and 5" });
        }
        updateData.adminLevel = adminLevel;
        changes.push(`adminLevel: ${targetUser.adminLevel} -> ${adminLevel}`);
      }
      
      if (isActive !== undefined) {
        if (typeof isActive !== 'boolean') {
          return res.status(400).json({ message: "isActive must be a boolean" });
        }
        updateData.isActive = isActive;
        changes.push(`isActive: ${targetUser.isActive} -> ${isActive}`);
      }
      
      if (status !== undefined) {
        const validStatuses = ["active", "pending", "rejected", "suspended"];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }
        updateData.status = status;
        changes.push(`status: ${targetUser.status} -> ${status}`);
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      const user = await storage.updateUserFull(req.params.id, updateData);
      
      await storage.createAuditLog({
        performedById: dbUser.id,
        targetUserId: req.params.id,
        action: "update_user",
        previousValue: JSON.stringify({ role: targetUser.role, adminLevel: targetUser.adminLevel, isActive: targetUser.isActive, status: targetUser.status }),
        newValue: JSON.stringify(updateData),
        metadata: { targetEmail: targetUser.email, changes },
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Get audit logs (Super Admin only)
  app.get('/api/super-admin/audit-logs', isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Get audit logs for specific user (Super Admin only)
  app.get('/api/super-admin/audit-logs/user/:userId', isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const logs = await storage.getAuditLogsByUser(req.params.userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching user audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // ==========================================
  // COURSE ROUTES
  // ==========================================
  
  // Get all courses
  app.get('/api/courses', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const courses = await storage.getAllCourses();
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Get single course
  app.get('/api/courses/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const course = await storage.getCourseWithTutor(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  // Get tutor's courses
  app.get('/api/tutor/courses', isAuthenticated, requireRole("tutor"), async (req: Request, res: Response) => {
    try {
      const tutorId = req.user?.claims?.sub;
      if (!tutorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const courses = await storage.getCoursesByTutor(tutorId);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching tutor courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Create course (tutor/admin)
  app.post('/api/courses', isAuthenticated, requireRole("tutor", "admin", "manager"), async (req: Request, res: Response) => {
    console.log("[POST /api/courses] Request entry");
    console.log("[POST /api/courses] dbUser:", (req as any).dbUser);
    console.log("[POST /api/courses] req.body:", req.body);
    
    try {
      const dbUser = (req as any).dbUser;
      
      if (!dbUser || !dbUser.id) {
        console.error("[POST /api/courses] No dbUser found");
        return res.status(401).json({ message: "Unauthorized - user not found" });
      }
      
      // Validate required fields
      if (!req.body.title || req.body.title.trim() === "") {
        return res.status(400).json({ message: "Title is required" });
      }
      
      // Add tutorId from authenticated user if not provided (for tutors)
      // Admins/managers can specify a different tutorId
      const courseData = {
        ...req.body,
        tutorId: req.body.tutorId || dbUser.id,
      };
      
      console.log("[POST /api/courses] courseData with tutorId:", courseData);
      
      const validated = insertCourseSchema.parse(courseData);
      const course = await storage.createCourse(validated);
      
      console.log("[POST /api/courses] Course created successfully:", course.id);
      return res.status(201).json(course);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("[POST /api/courses] Zod validation error:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("[POST /api/courses] Error creating course:", error);
      return res.status(500).json({ message: "Failed to create course" });
    }
  });

  // Update course (with ownership check for tutors)
  app.patch('/api/courses/:id', isAuthenticated, requireRole("tutor", "admin", "manager"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      const existingCourse = await storage.getCourse(req.params.id);
      
      if (!existingCourse) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Tutors can only update their own courses
      if (dbUser.role === "tutor" && existingCourse.tutorId !== dbUser.id) {
        return res.status(403).json({ message: "You can only update your own courses" });
      }
      
      // Validate and sanitize input
      const validated = updateCourseSchema.parse(req.body);
      
      const course = await storage.updateCourse(req.params.id, validated);
      res.json(course);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating course:", error);
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  // Delete course
  app.delete('/api/courses/:id', isAuthenticated, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      await storage.deleteCourse(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  // Get active students for tutor enrollment (searchable dropdown)
  app.get('/api/tutor/active-students', isAuthenticated, requireRole("tutor", "admin", "manager"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      
      // For tutors, only return students in their courses
      if (dbUser.role === "tutor") {
        const students = await storage.getActiveStudentsByTutor(dbUser.id);
        return res.json(students);
      }
      
      // Admin/manager see all active students
      const students = await storage.getActiveStudents();
      res.json(students);
    } catch (error) {
      console.error("Error fetching active students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // Get all active students (for wallet management - role-based access)
  app.get('/api/students/active', isAuthenticated, requireRole("tutor", "admin", "manager"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      
      // For tutors, only return students in their courses
      if (dbUser.role === "tutor") {
        const students = await storage.getActiveStudentsByTutor(dbUser.id);
        return res.json(students.map(s => ({
          id: s.id,
          fullName: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email,
          email: s.email,
          phone: s.phone
        })));
      }
      
      // Admin/manager see all active students
      const students = await storage.getActiveStudents();
      res.json(students.map(s => ({
        id: s.id,
        fullName: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email,
        email: s.email,
        phone: s.phone
      })));
    } catch (error) {
      console.error("Error fetching active students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // ==========================================
  // ENROLLMENT ROUTES
  // ==========================================
  
  // Get student's enrollments
  app.get('/api/enrollments/student', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const studentId = req.user?.claims?.sub;
      if (!studentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const enrollments = await storage.getEnrollmentsByStudent(studentId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  // Get course enrollments (tutor)
  app.get('/api/courses/:courseId/enrollments', isAuthenticated, requireRole("tutor", "admin", "manager"), async (req: Request, res: Response) => {
    try {
      const enrollments = await storage.getEnrollmentsByCourse(req.params.courseId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching course enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  // Create enrollment (with ownership check for tutors)
  app.post('/api/enrollments', isAuthenticated, requireRole("admin", "manager", "tutor"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      const validated = insertEnrollmentSchema.parse(req.body);
      
      // Tutors can only enroll students in their own courses
      if (dbUser.role === "tutor") {
        const course = await storage.getCourse(validated.courseId);
        if (!course || course.tutorId !== dbUser.id) {
          return res.status(403).json({ message: "You can only enroll students in your own courses" });
        }
      }
      
      const enrollment = await storage.createEnrollment(validated);
      res.status(201).json(enrollment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating enrollment:", error);
      res.status(500).json({ message: "Failed to create enrollment" });
    }
  });

  // Update enrollment status
  app.patch('/api/enrollments/:id/status', isAuthenticated, requireRole("admin", "manager", "tutor"), async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const enrollment = await storage.updateEnrollmentStatus(req.params.id, status);
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      res.json(enrollment);
    } catch (error) {
      console.error("Error updating enrollment:", error);
      res.status(500).json({ message: "Failed to update enrollment" });
    }
  });

  // ==========================================
  // ASSIGNMENT ROUTES
  // ==========================================
  
  // Get assignments for student
  app.get('/api/assignments/student', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const studentId = req.user?.claims?.sub;
      if (!studentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const assignments = await storage.getAssignmentsForStudent(studentId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Get course assignments
  app.get('/api/courses/:courseId/assignments', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const assignments = await storage.getAssignmentsByCourse(req.params.courseId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching course assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Get single assignment
  app.get('/api/assignments/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });

  // Create assignment (tutor - must own the course)
  app.post('/api/assignments', isAuthenticated, requireRole("tutor", "admin"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      
      // Tutors can only create assignments for their own courses
      if (dbUser.role === "tutor") {
        const course = await storage.getCourse(req.body.courseId);
        if (!course || course.tutorId !== dbUser.id) {
          return res.status(403).json({ message: "You can only create assignments for your own courses" });
        }
      }
      
      const validated = insertAssignmentSchema.parse(req.body);
      const assignment = await storage.createAssignment(validated);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating assignment:", error);
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  // Update assignment (with ownership check for tutors)
  app.patch('/api/assignments/:id', isAuthenticated, requireRole("tutor", "admin"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      const existingAssignment = await storage.getAssignment(req.params.id);
      
      if (!existingAssignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Tutors can only update assignments in their own courses
      if (dbUser.role === "tutor") {
        const course = await storage.getCourse(existingAssignment.courseId);
        if (!course || course.tutorId !== dbUser.id) {
          return res.status(403).json({ message: "You can only update assignments in your own courses" });
        }
      }
      
      // Validate and sanitize input
      const validated = updateAssignmentSchema.parse(req.body);
      
      const assignment = await storage.updateAssignment(req.params.id, validated);
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating assignment:", error);
      res.status(500).json({ message: "Failed to update assignment" });
    }
  });

  // Delete assignment (with ownership check for tutors)
  app.delete('/api/assignments/:id', isAuthenticated, requireRole("tutor", "admin"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      const existingAssignment = await storage.getAssignment(req.params.id);
      
      if (!existingAssignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Tutors can only delete assignments in their own courses
      if (dbUser.role === "tutor") {
        const course = await storage.getCourse(existingAssignment.courseId);
        if (!course || course.tutorId !== dbUser.id) {
          return res.status(403).json({ message: "You can only delete assignments in your own courses" });
        }
      }
      
      await storage.deleteAssignment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });

  // ==========================================
  // SUBMISSION ROUTES
  // ==========================================
  
  // Get student's submissions
  app.get('/api/submissions/student', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const studentId = req.user?.claims?.sub;
      if (!studentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const submissions = await storage.getSubmissionsByStudent(studentId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Get assignment submissions (tutor)
  app.get('/api/assignments/:assignmentId/submissions', isAuthenticated, requireRole("tutor", "admin"), async (req: Request, res: Response) => {
    try {
      const submissions = await storage.getSubmissionsByAssignment(req.params.assignmentId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching assignment submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Create submission (student)
  app.post('/api/submissions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const studentId = req.user?.claims?.sub;
      if (!studentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const validated = insertSubmissionSchema.parse({
        ...req.body,
        studentId,
      });
      const submission = await storage.createSubmission(validated);
      res.status(201).json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating submission:", error);
      res.status(500).json({ message: "Failed to create submission" });
    }
  });

  // Update submission (students can only update their own)
  app.patch('/api/submissions/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const existingSubmission = await storage.getSubmission(req.params.id);
      if (!existingSubmission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      // Students can only update their own submissions
      if (existingSubmission.studentId !== userId) {
        const user = await storage.getUser(userId);
        if (!user || (user.role !== "tutor" && user.role !== "admin")) {
          return res.status(403).json({ message: "You can only update your own submissions" });
        }
      }
      
      // Validate and sanitize input
      const validated = updateSubmissionSchema.parse(req.body);
      
      const submission = await storage.updateSubmission(req.params.id, validated);
      res.json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating submission:", error);
      res.status(500).json({ message: "Failed to update submission" });
    }
  });

  // ==========================================
  // GRADE ROUTES
  // ==========================================
  
  // Get student's grades
  app.get('/api/grades/student', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const studentId = req.user?.claims?.sub;
      if (!studentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const grades = await storage.getGradesByStudent(studentId);
      res.json(grades);
    } catch (error) {
      console.error("Error fetching grades:", error);
      res.status(500).json({ message: "Failed to fetch grades" });
    }
  });

  // Get tutor's graded submissions
  app.get('/api/grades/tutor', isAuthenticated, requireRole("tutor"), async (req: Request, res: Response) => {
    try {
      const tutorId = req.user?.claims?.sub;
      if (!tutorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const grades = await storage.getGradesByTutor(tutorId);
      res.json(grades);
    } catch (error) {
      console.error("Error fetching grades:", error);
      res.status(500).json({ message: "Failed to fetch grades" });
    }
  });

  // Create grade (tutor)
  app.post('/api/grades', isAuthenticated, requireRole("tutor", "admin"), async (req: Request, res: Response) => {
    try {
      const tutorId = req.user?.claims?.sub;
      if (!tutorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const validated = insertGradeSchema.parse({
        ...req.body,
        gradedById: tutorId,
      });
      const grade = await storage.createGrade(validated);
      
      // Trigger notification for the student
      try {
        const submission = await storage.getSubmission(validated.submissionId);
        if (submission) {
          const assignment = await storage.getAssignment(submission.assignmentId);
          await storage.createNotification({
            userId: submission.studentId,
            type: "grade_posted",
            title: "Grade Posted",
            message: `Your submission for "${assignment?.title || 'an assignment'}" has been graded. You received ${validated.points} points.`,
            link: "/grades",
            isRead: false,
            relatedId: grade.id,
          });
        }
      } catch (notifError) {
        console.error("Error creating grade notification:", notifError);
      }
      
      res.status(201).json(grade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating grade:", error);
      res.status(500).json({ message: "Failed to create grade" });
    }
  });

  // Update grade (tutors can only update their own grades)
  app.patch('/api/grades/:id', isAuthenticated, requireRole("tutor", "admin"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      const existingGrade = await storage.getGrade(req.params.id);
      
      if (!existingGrade) {
        return res.status(404).json({ message: "Grade not found" });
      }
      
      // Tutors can only update their own grades
      if (dbUser.role === "tutor" && existingGrade.gradedById !== dbUser.id) {
        return res.status(403).json({ message: "You can only update your own grades" });
      }
      
      // Validate and sanitize input
      const validated = updateGradeSchema.parse(req.body);
      
      const grade = await storage.updateGrade(req.params.id, validated);
      res.json(grade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating grade:", error);
      res.status(500).json({ message: "Failed to update grade" });
    }
  });

  // ==========================================
  // ANNOUNCEMENT ROUTES
  // ==========================================
  
  // Get all announcements (for current user)
  app.get('/api/announcements', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let announcements;
      if (user.role === "admin" || user.role === "manager") {
        announcements = await storage.getAllAnnouncements();
      } else if (user.role === "student") {
        announcements = await storage.getAnnouncementsForStudent(userId);
      } else {
        announcements = await storage.getAllAnnouncements();
      }
      
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  // Get course announcements
  app.get('/api/courses/:courseId/announcements', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const announcements = await storage.getAnnouncementsByCourse(req.params.courseId);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching course announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  // Create announcement (tutor/admin/manager)
  app.post('/api/announcements', isAuthenticated, requireRole("tutor", "admin", "manager"), async (req: Request, res: Response) => {
    try {
      const authorId = req.user?.claims?.sub;
      if (!authorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const validated = insertAnnouncementSchema.parse({
        ...req.body,
        authorId,
      });
      const announcement = await storage.createAnnouncement(validated);
      
      // Trigger notifications for enrolled students
      try {
        if (validated.courseId) {
          const studentIds = await storage.getEnrolledStudentIds(validated.courseId);
          for (const studentId of studentIds) {
            await storage.createNotification({
              userId: studentId,
              type: "announcement",
              title: "New Announcement",
              message: validated.title,
              link: "/announcements",
              isRead: false,
              relatedId: announcement.id,
            });
          }
        }
      } catch (notifError) {
        console.error("Error creating announcement notifications:", notifError);
      }
      
      res.status(201).json(announcement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating announcement:", error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  // Update announcement (authors can only update their own, admins/managers can update any)
  app.patch('/api/announcements/:id', isAuthenticated, requireRole("tutor", "admin", "manager"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      const existingAnnouncement = await storage.getAnnouncement(req.params.id);
      
      if (!existingAnnouncement) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      
      // Tutors can only update their own announcements
      if (dbUser.role === "tutor" && existingAnnouncement.authorId !== dbUser.id) {
        return res.status(403).json({ message: "You can only update your own announcements" });
      }
      
      // Validate and sanitize input
      const validated = updateAnnouncementSchema.parse(req.body);
      
      const announcement = await storage.updateAnnouncement(req.params.id, validated);
      res.json(announcement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating announcement:", error);
      res.status(500).json({ message: "Failed to update announcement" });
    }
  });

  // Delete announcement
  app.delete('/api/announcements/:id', isAuthenticated, requireRole("tutor", "admin", "manager"), async (req: Request, res: Response) => {
    try {
      await storage.deleteAnnouncement(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  // ==========================================
  // PARENT-CHILD ROUTES
  // ==========================================
  
  // Get parent's children
  app.get('/api/parent/children', isAuthenticated, requireRole("parent"), async (req: Request, res: Response) => {
    try {
      const parentId = req.user?.claims?.sub;
      if (!parentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const children = await storage.getParentChildren(parentId);
      res.json(children);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ message: "Failed to fetch children" });
    }
  });

  // Create parent-child relationship (admin only)
  app.post('/api/parent-children', isAuthenticated, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const validated = insertParentChildSchema.parse(req.body);
      const relation = await storage.createParentChild(validated);
      res.status(201).json(relation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating parent-child relationship:", error);
      res.status(500).json({ message: "Failed to create relationship" });
    }
  });

  // Delete parent-child relationship (admin only)
  app.delete('/api/parent-children/:id', isAuthenticated, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      await storage.deleteParentChild(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting parent-child relationship:", error);
      res.status(500).json({ message: "Failed to delete relationship" });
    }
  });

  // ==========================================
  // DASHBOARD ROUTES (aggregated data for each role)
  // ==========================================
  
  // Student dashboard
  app.get('/api/student/dashboard', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const studentId = req.user?.claims?.sub;
      if (!studentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get student enrollments to find courses
      const enrollmentList = await storage.getEnrollmentsByStudent(studentId);
      const activeCourseIds = enrollmentList
        .filter(e => e.status === "active")
        .map(e => e.courseId);
      
      // Get assignments for student
      const allAssignments = await storage.getAssignmentsForStudent(studentId);
      const pendingAssignments = allAssignments.filter(a => a.status === "published");
      
      // Get submissions
      const studentSubmissions = await storage.getSubmissionsByStudent(studentId);
      const completedCount = studentSubmissions.filter(s => s.status === "submitted" || s.status === "graded").length;
      
      // Get grades
      const studentGrades = await storage.getGradesByStudent(studentId);
      let averageGrade: number | null = null;
      if (studentGrades.length > 0) {
        const totalPercentage = studentGrades.reduce((sum, g) => {
          if (g.submission?.assignment?.pointsPossible && g.submission.assignment.pointsPossible > 0) {
            return sum + (g.points / g.submission.assignment.pointsPossible * 100);
          }
          return sum;
        }, 0);
        averageGrade = Math.round(totalPercentage / studentGrades.length);
      }
      
      // Get courses with tutor info
      const allCourses = await storage.getAllCourses();
      const enrolledCourses = allCourses.filter(c => activeCourseIds.includes(c.id));
      
      // Get announcements
      const announcementsList = await storage.getAnnouncementsForStudent(studentId);
      
      res.json({
        stats: {
          enrolledCourses: enrolledCourses.length,
          pendingAssignments: pendingAssignments.length,
          completedAssignments: completedCount,
          averageGrade,
        },
        courses: enrolledCourses,
        upcomingAssignments: pendingAssignments.slice(0, 5),
        announcements: announcementsList.slice(0, 5),
      });
    } catch (error) {
      console.error("Error fetching student dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Tutor dashboard
  app.get('/api/tutor/dashboard', isAuthenticated, requireRole("tutor"), async (req: Request, res: Response) => {
    try {
      const tutorId = req.user?.claims?.sub;
      if (!tutorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get tutor's courses
      const tutorCourses = await storage.getCoursesByTutor(tutorId);
      
      // Count total students across all courses
      let totalStudents = 0;
      tutorCourses.forEach(c => {
        totalStudents += c.enrollmentCount || 0;
      });
      
      // Get pending submissions to grade
      let pendingSubmissions = 0;
      const recentSubmissions: { id: string; studentName: string; assignmentTitle: string; submittedAt: string }[] = [];
      
      for (const course of tutorCourses) {
        const courseAssignments = await storage.getAssignmentsByCourse(course.id);
        for (const assignment of courseAssignments) {
          const subs = await storage.getSubmissionsByAssignment(assignment.id);
          const pending = subs.filter(s => s.status === "submitted");
          pendingSubmissions += pending.length;
          
          // Add to recent submissions
          for (const sub of pending.slice(0, 3)) {
            recentSubmissions.push({
              id: sub.id,
              studentName: `${sub.student?.firstName || ''} ${sub.student?.lastName || ''}`.trim() || 'Unknown',
              assignmentTitle: assignment.title,
              submittedAt: sub.submittedAt?.toISOString() || new Date().toISOString(),
            });
          }
        }
      }
      
      // Calculate average grade across all courses
      const tutorGrades = await storage.getGradesByTutor(tutorId);
      let averageCourseGrade: number | null = null;
      if (tutorGrades.length > 0) {
        const totalPercentage = tutorGrades.reduce((sum, g) => {
          if (g.submission?.assignment?.pointsPossible && g.submission.assignment.pointsPossible > 0) {
            return sum + (g.points / g.submission.assignment.pointsPossible * 100);
          }
          return sum;
        }, 0);
        averageCourseGrade = Math.round(totalPercentage / tutorGrades.length);
      }
      
      // Get tutor's completed sessions for hours calculation
      const allSessions = await storage.getTutoringSessionsByTutor(tutorId);
      const completedSessions = allSessions.filter(s => s.status === "completed");
      
      // Calculate total hours (from billableMinutes or scheduledMinutes)
      const totalMinutes = completedSessions.reduce((sum, session) => {
        return sum + (session.billableMinutes || session.scheduledMinutes || 0);
      }, 0);
      const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
      
      // Calculate hours this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const sessionsThisMonth = completedSessions.filter(s => {
        const sessionDate = new Date(s.scheduledStartTime);
        return sessionDate >= startOfMonth;
      });
      const monthMinutes = sessionsThisMonth.reduce((sum, session) => {
        return sum + (session.billableMinutes || session.scheduledMinutes || 0);
      }, 0);
      const hoursThisMonth = Math.round(monthMinutes / 60 * 10) / 10;
      
      // Get upcoming sessions for calendar
      const upcomingSessions = allSessions
        .filter(s => s.status === "scheduled" && new Date(s.scheduledStartTime) >= now)
        .sort((a, b) => new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime())
        .slice(0, 5)
        .map(session => ({
          id: session.id,
          studentName: session.student ? `${session.student.firstName || ''} ${session.student.lastName || ''}`.trim() : 'Unknown',
          scheduledStartTime: session.scheduledStartTime.toISOString(),
          scheduledMinutes: session.scheduledMinutes,
          status: session.status,
        }));
      
      res.json({
        stats: {
          totalCourses: tutorCourses.length,
          totalStudents,
          pendingSubmissions,
          averageCourseGrade,
          hoursThisMonth,
          totalHours,
        },
        courses: tutorCourses,
        recentSubmissions: recentSubmissions.slice(0, 5),
        upcomingSessions,
      });
    } catch (error) {
      console.error("Error fetching tutor dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Get tutor's sessions for calendar view
  app.get('/api/tutor/sessions', isAuthenticated, requireRole("tutor"), async (req: Request, res: Response) => {
    try {
      const tutorId = req.user?.claims?.sub;
      if (!tutorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const sessions = await storage.getTutoringSessionsByTutor(tutorId);
      
      // Return sessions with relevant data for calendar
      const formattedSessions = sessions.map(session => ({
        id: session.id,
        studentId: session.studentId,
        studentName: session.student ? `${session.student.firstName || ''} ${session.student.lastName || ''}`.trim() : 'Unknown',
        scheduledStartTime: session.scheduledStartTime.toISOString(),
        scheduledMinutes: session.scheduledMinutes,
        billableMinutes: session.billableMinutes,
        status: session.status,
        notes: session.notes,
      }));
      
      res.json(formattedSessions);
    } catch (error) {
      console.error("Error fetching tutor sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Tutor students - get all students enrolled in tutor's courses with hours data
  app.get('/api/tutor/students', isAuthenticated, requireRole("tutor"), async (req: Request, res: Response) => {
    try {
      const tutorId = req.user?.claims?.sub;
      if (!tutorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get tutor's courses
      const courses = await storage.getCoursesByTutor(tutorId);
      
      // Fetch all sessions once for this tutor
      const allTutorSessions = await storage.getTutoringSessionsByTutor(tutorId);
      const completedSessions = allTutorSessions.filter(s => s.status === "completed");
      
      // Group sessions by student+course key for O(1) lookup
      const sessionsByStudentCourse = new Map<string, number>();
      for (const session of completedSessions) {
        const key = `${session.studentId}:${session.courseId}`;
        const current = sessionsByStudentCourse.get(key) || 0;
        sessionsByStudentCourse.set(key, current + (session.billableMinutes || 0));
      }
      
      // Get all students enrolled in tutor's courses
      const studentsWithProgress = [];
      
      for (const course of courses) {
        const enrollments = await storage.getEnrollmentsByCourse(course.id);
        const courseAssignments = await storage.getAssignmentsByCourse(course.id);
        const publishedAssignments = courseAssignments.filter(a => a.status === "published");
        const totalAssignments = publishedAssignments.length;
        
        for (const enrollment of enrollments) {
          if (!enrollment.student) continue;
          
          // Get submissions by this student for this course
          const studentSubmissions = await storage.getSubmissionsByStudent(enrollment.studentId);
          const courseSubmissions = studentSubmissions.filter(s => 
            courseAssignments.some(a => a.id === s.assignmentId)
          );
          const assignmentsCompleted = courseSubmissions.filter(s => 
            s.status === "submitted" || s.status === "graded"
          ).length;
          
          // Get grades for average with safe defaults
          const studentGrades = await storage.getGradesByStudent(enrollment.studentId);
          const courseGrades = studentGrades.filter(g => 
            courseAssignments.some(a => a.id === g.submission?.assignmentId)
          );
          
          let averageGrade: number | null = null;
          if (courseGrades.length > 0) {
            let validGradeCount = 0;
            const totalPercentage = courseGrades.reduce((sum, g) => {
              const pointsPossible = g.submission?.assignment?.pointsPossible;
              if (pointsPossible && pointsPossible > 0) {
                validGradeCount++;
                return sum + ((g.points || 0) / pointsPossible * 100);
              }
              return sum;
            }, 0);
            if (validGradeCount > 0) {
              averageGrade = Math.round(totalPercentage / validGradeCount);
            }
          }
          
          // Get hours data from hour wallet
          const wallet = await storage.getHourWalletByStudentCourse(enrollment.studentId, course.id);
          const purchasedMinutes = wallet?.purchasedMinutes || 0;
          const consumedMinutes = wallet?.consumedMinutes || 0;
          const remainingMinutes = purchasedMinutes - consumedMinutes;
          
          // Get hours tutored from pre-grouped sessions
          const sessionKey = `${enrollment.studentId}:${course.id}`;
          const tutorMinutes = sessionsByStudentCourse.get(sessionKey) || 0;
          const hoursUsed = tutorMinutes / 60;
          const hoursRemaining = Math.max(0, remainingMinutes / 60);
          
          studentsWithProgress.push({
            student: enrollment.student,
            enrollment: {
              id: enrollment.id,
              courseId: enrollment.courseId,
              studentId: enrollment.studentId,
              status: enrollment.status,
            },
            courseName: course.title,
            assignmentsCompleted,
            totalAssignments,
            averageGrade,
            hoursUsed: Math.round(hoursUsed * 10) / 10,
            hoursRemaining: Math.round(hoursRemaining * 10) / 10,
          });
        }
      }
      
      res.json({
        courses,
        students: studentsWithProgress,
      });
    } catch (error) {
      console.error("Error fetching tutor students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // Manager dashboard
  app.get('/api/manager/dashboard', isAuthenticated, requireRole("manager", "admin"), async (req: Request, res: Response) => {
    try {
      const stats = await storage.getManagerStats();
      const allCourses = await storage.getAllCourses();
      const tutors = await storage.getUsersByRole("tutor");
      const students = await storage.getUsersByRole("student");
      
      res.json({
        stats: {
          totalCourses: stats.totalCourses,
          totalStudents: stats.totalStudents,
          totalTutors: stats.totalTutors,
          activeEnrollments: 0, // Would need additional query
        },
        courses: allCourses.slice(0, 10),
        tutors: tutors.slice(0, 10),
        students: students.slice(0, 10),
      });
    } catch (error) {
      console.error("Error fetching manager dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Admin dashboard
  app.get('/api/admin/dashboard', isAuthenticated, requireRole("[admin]"), requireAdminLevel(1), async (req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allCourses = await storage.getAllCourses();
      
      const students = allUsers.filter(u => u.role === "student");
      const tutors = allUsers.filter(u => u.role === "tutor");
      
      // Count users by role
      const roleCount: Record<string, number> = {};
      for (const user of allUsers) {
        roleCount[user.role] = (roleCount[user.role] || 0) + 1;
      }
      
      const usersByRole = Object.entries(roleCount).map(([role, count]) => ({
        role,
        count,
      }));
      
      res.json({
        stats: {
          totalUsers: allUsers.length,
          totalStudents: students.length,
          totalTutors: tutors.length,
          totalCourses: allCourses.length,
        },
        recentUsers: allUsers.slice(0, 10),
        usersByRole,
      });
    } catch (error) {
      console.error("Error fetching admin dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Parent dashboard
  app.get('/api/parent/dashboard', isAuthenticated, requireRole("parent"), async (req: Request, res: Response) => {
    try {
      const parentId = req.user?.claims?.sub;
      if (!parentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get parent's children
      const childRelations = await storage.getParentChildren(parentId);
      
      const childrenData = [];
      for (const relation of childRelations) {
        if (relation.child) {
          const childId = relation.childId;
          
          // Get child's enrollments
          const childEnrollments = await storage.getEnrollmentsByStudent(childId);
          const activeCourseIds = childEnrollments
            .filter(e => e.status === "active")
            .map(e => e.courseId);
          
          // Get assignments for child
          const childAssignments = await storage.getAssignmentsForStudent(childId);
          const pendingAssignments = childAssignments.filter(a => a.status === "published");
          
          // Get submissions
          const childSubmissions = await storage.getSubmissionsByStudent(childId);
          const completedCount = childSubmissions.filter(s => s.status === "submitted" || s.status === "graded").length;
          
          // Get child's grades
          const childGrades = await storage.getGradesByStudent(childId);
          let averageGrade: number | null = null;
          if (childGrades.length > 0) {
            const totalPercentage = childGrades.reduce((sum, g) => {
              if (g.submission?.assignment?.pointsPossible && g.submission.assignment.pointsPossible > 0) {
                return sum + (g.points / g.submission.assignment.pointsPossible * 100);
              }
              return sum;
            }, 0);
            averageGrade = Math.round(totalPercentage / childGrades.length);
          }
          
          // Get courses with tutor info
          const allCourses = await storage.getAllCourses();
          const enrolledCourses = allCourses.filter(c => activeCourseIds.includes(c.id));
          
          childrenData.push({
            child: relation.child,
            stats: {
              enrolledCourses: enrolledCourses.length,
              pendingAssignments: pendingAssignments.length,
              completedAssignments: completedCount,
              averageGrade,
            },
            courses: enrolledCourses,
            upcomingAssignments: pendingAssignments.slice(0, 5),
          });
        }
      }
      
      res.json({
        children: childrenData,
      });
    } catch (error) {
      console.error("Error fetching parent dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Student grades page
  app.get('/api/student/grades', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const studentId = req.user?.claims?.sub;
      if (!studentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get all grades for student
      const studentGrades = await storage.getGradesByStudent(studentId);
      
      // Calculate stats
      let averageScore: number | null = null;
      if (studentGrades.length > 0) {
        const totalPercentage = studentGrades.reduce((sum, g) => {
          if (g.submission?.assignment?.pointsPossible && g.submission.assignment.pointsPossible > 0) {
            return sum + (g.points / g.submission.assignment.pointsPossible * 100);
          }
          return sum;
        }, 0);
        averageScore = totalPercentage / studentGrades.length;
      }
      
      // Get course averages
      const courseMap = new Map<string, { course: any; grades: number[]; total: number; graded: number }>();
      
      for (const grade of studentGrades) {
        const courseId = grade.submission?.assignment?.courseId;
        if (courseId && grade.submission?.assignment) {
          if (!courseMap.has(courseId)) {
            const course = await storage.getCourse(courseId);
            if (course) {
              courseMap.set(courseId, { course, grades: [], total: 0, graded: 0 });
            }
          }
          const data = courseMap.get(courseId);
          if (data && grade.submission.assignment.pointsPossible && grade.submission.assignment.pointsPossible > 0) {
            const percentage = (grade.points / grade.submission.assignment.pointsPossible) * 100;
            data.grades.push(percentage);
            data.graded++;
          }
        }
      }
      
      const courseAverages = Array.from(courseMap.values()).map(data => ({
        course: data.course,
        average: data.grades.length > 0 ? data.grades.reduce((a, b) => a + b, 0) / data.grades.length : 0,
        totalAssignments: data.total,
        gradedAssignments: data.graded,
      }));
      
      res.json({
        stats: {
          overallGPA: null,
          totalGraded: studentGrades.length,
          averageScore,
          trend: "stable" as const,
        },
        grades: studentGrades,
        courseAverages,
      });
    } catch (error) {
      console.error("Error fetching student grades:", error);
      res.status(500).json({ message: "Failed to fetch grades data" });
    }
  });

  // ==========================================
  // DASHBOARD STATS ROUTES (legacy/simple stats)
  // ==========================================
  
  // Get student stats
  app.get('/api/stats/student', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const studentId = req.user?.claims?.sub;
      if (!studentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const stats = await storage.getStudentStats(studentId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching student stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get tutor stats
  app.get('/api/stats/tutor', isAuthenticated, requireRole("tutor"), async (req: Request, res: Response) => {
    try {
      const tutorId = req.user?.claims?.sub;
      if (!tutorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const stats = await storage.getTutorStats(tutorId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching tutor stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get manager stats
  app.get('/api/stats/manager', isAuthenticated, requireRole("manager", "admin"), async (req: Request, res: Response) => {
    try {
      const stats = await storage.getManagerStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching manager stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get admin stats
  app.get('/api/stats/admin', isAuthenticated, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // ==========================================
  // NOTIFICATION ROUTES
  // ==========================================
  
  // Get user's notifications
  app.get('/api/notifications', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getNotificationsByUser(userId, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get('/api/notifications/unread-count', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // Mark notification as read
  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const notification = await storage.markNotificationAsRead(req.params.id, userId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark as read" });
    }
  });

  // Mark all notifications as read
  app.patch('/api/notifications/read-all', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all as read:", error);
      res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  // Delete notification
  app.delete('/api/notifications/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const deleted = await storage.deleteNotification(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // ==========================================
  // TUTOR AVAILABILITY ROUTES
  // ==========================================

  // Get tutor's own availability slots
  app.get('/api/tutor/availability', isAuthenticated, requireRole("tutor"), async (req: Request, res: Response) => {
    try {
      const tutorId = req.user?.claims?.sub;
      if (!tutorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const availability = await storage.getTutorAvailability(tutorId);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching tutor availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // Get any tutor's availability (for students viewing)
  app.get('/api/tutors/:tutorId/availability', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const availability = await storage.getTutorAvailability(req.params.tutorId);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching tutor availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // Create availability slot (tutor only)
  app.post('/api/tutor/availability', isAuthenticated, requireRole("tutor"), async (req: Request, res: Response) => {
    try {
      const tutorId = req.user?.claims?.sub;
      if (!tutorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const validated = insertTutorAvailabilitySchema.parse({
        ...req.body,
        tutorId,
      });
      const availability = await storage.createTutorAvailability(validated);
      res.status(201).json(availability);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating availability:", error);
      res.status(500).json({ message: "Failed to create availability" });
    }
  });

  // Update availability slot (tutor only, must own)
  app.patch('/api/tutor/availability/:id', isAuthenticated, requireRole("tutor"), async (req: Request, res: Response) => {
    try {
      const tutorId = req.user?.claims?.sub;
      if (!tutorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const updateSchema = z.object({
        dayOfWeek: z.number().min(0).max(6).optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        isRecurring: z.boolean().optional(),
      });
      const validated = updateSchema.parse(req.body);
      const availability = await storage.updateTutorAvailability(req.params.id, tutorId, validated);
      if (!availability) {
        return res.status(404).json({ message: "Availability slot not found or not owned by you" });
      }
      res.json(availability);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating availability:", error);
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  // Delete availability slot (tutor only, must own)
  app.delete('/api/tutor/availability/:id', isAuthenticated, requireRole("tutor"), async (req: Request, res: Response) => {
    try {
      const tutorId = req.user?.claims?.sub;
      if (!tutorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const deleted = await storage.deleteTutorAvailability(req.params.id, tutorId);
      if (!deleted) {
        return res.status(404).json({ message: "Availability slot not found or not owned by you" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting availability:", error);
      res.status(500).json({ message: "Failed to delete availability" });
    }
  });

  // ==========================================
  // SESSION PROPOSAL ROUTES
  // ==========================================

  // Student proposes a session
  app.post('/api/session-proposals', isAuthenticated, requireRole("student"), async (req: Request, res: Response) => {
    try {
      const studentId = req.user?.claims?.sub;
      if (!studentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate 15-minute block duration
      const proposedStart = new Date(req.body.proposedStartTime);
      const proposedEnd = new Date(req.body.proposedEndTime);
      const durationMinutes = (proposedEnd.getTime() - proposedStart.getTime()) / (1000 * 60);
      
      if (durationMinutes <= 0 || durationMinutes % 15 !== 0) {
        return res.status(400).json({ message: "Session duration must be in 15-minute blocks" });
      }

      // Check for double booking on the tutor's side
      const isDoubleBooked = await storage.checkDoubleBooking(
        req.body.tutorId,
        proposedStart,
        proposedEnd
      );
      if (isDoubleBooked) {
        return res.status(409).json({ message: "The tutor already has a session scheduled at this time" });
      }

      const validated = insertSessionProposalSchema.parse({
        ...req.body,
        studentId,
        proposedStartTime: proposedStart,
        proposedEndTime: proposedEnd,
      });
      const proposal = await storage.createSessionProposal(validated);
      res.status(201).json(proposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating session proposal:", error);
      res.status(500).json({ message: "Failed to create session proposal" });
    }
  });

  // Get student's proposals
  app.get('/api/session-proposals/student', isAuthenticated, requireRole("student"), async (req: Request, res: Response) => {
    try {
      const studentId = req.user?.claims?.sub;
      if (!studentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const proposals = await storage.getSessionProposalsByStudent(studentId);
      res.json(proposals);
    } catch (error) {
      console.error("Error fetching student proposals:", error);
      res.status(500).json({ message: "Failed to fetch proposals" });
    }
  });

  // Get tutor's pending proposals
  app.get('/api/session-proposals/tutor', isAuthenticated, requireRole("tutor"), async (req: Request, res: Response) => {
    try {
      const tutorId = req.user?.claims?.sub;
      if (!tutorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const status = req.query.status as ProposalStatus | undefined;
      const proposals = await storage.getSessionProposalsByTutor(tutorId, status);
      res.json(proposals);
    } catch (error) {
      console.error("Error fetching tutor proposals:", error);
      res.status(500).json({ message: "Failed to fetch proposals" });
    }
  });

  // Tutor approves a proposal (creates a tutoring session)
  app.patch('/api/session-proposals/:id/approve', isAuthenticated, requireRole("tutor"), async (req: Request, res: Response) => {
    try {
      const tutorId = req.user?.claims?.sub;
      if (!tutorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const proposal = await storage.getSessionProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      if (proposal.tutorId !== tutorId) {
        return res.status(403).json({ message: "You can only approve your own proposals" });
      }
      if (proposal.status !== "pending") {
        return res.status(400).json({ message: "Proposal is no longer pending" });
      }

      // Check for double booking before approving
      const isDoubleBooked = await storage.checkDoubleBooking(
        tutorId,
        new Date(proposal.proposedStartTime),
        new Date(proposal.proposedEndTime)
      );
      if (isDoubleBooked) {
        return res.status(409).json({ message: "You already have a session scheduled at this time" });
      }

      // Update proposal status
      await storage.updateSessionProposalStatus(req.params.id, "approved", req.body.tutorResponse);

      // Create the tutoring session
      const session = await storage.createTutoringSession({
        proposalId: proposal.id,
        tutorId: proposal.tutorId,
        studentId: proposal.studentId,
        courseId: proposal.courseId,
        scheduledStartTime: new Date(proposal.proposedStartTime),
        scheduledEndTime: new Date(proposal.proposedEndTime),
        status: "scheduled",
      });

      // Notify the student
      try {
        await storage.createNotification({
          userId: proposal.studentId,
          type: "session_approved",
          title: "Session Approved",
          message: `Your tutoring session request has been approved for ${new Date(proposal.proposedStartTime).toLocaleString()}`,
          link: "/sessions",
          isRead: false,
          relatedId: session.id,
        });
      } catch (notifError) {
        console.error("Error creating notification:", notifError);
      }

      res.json({ proposal: { ...proposal, status: "approved" }, session });
    } catch (error) {
      console.error("Error approving proposal:", error);
      res.status(500).json({ message: "Failed to approve proposal" });
    }
  });

  // Tutor rejects a proposal
  app.patch('/api/session-proposals/:id/reject', isAuthenticated, requireRole("tutor"), async (req: Request, res: Response) => {
    try {
      const tutorId = req.user?.claims?.sub;
      if (!tutorId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const proposal = await storage.getSessionProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      if (proposal.tutorId !== tutorId) {
        return res.status(403).json({ message: "You can only reject your own proposals" });
      }
      if (proposal.status !== "pending") {
        return res.status(400).json({ message: "Proposal is no longer pending" });
      }

      const updated = await storage.updateSessionProposalStatus(req.params.id, "rejected", req.body.tutorResponse);

      // Notify the student
      try {
        await storage.createNotification({
          userId: proposal.studentId,
          type: "session_rejected",
          title: "Session Rejected",
          message: `Your tutoring session request has been declined. ${req.body.tutorResponse || ""}`.trim(),
          link: "/sessions",
          isRead: false,
          relatedId: proposal.id,
        });
      } catch (notifError) {
        console.error("Error creating notification:", notifError);
      }

      res.json(updated);
    } catch (error) {
      console.error("Error rejecting proposal:", error);
      res.status(500).json({ message: "Failed to reject proposal" });
    }
  });

  // ==========================================
  // TUTORING SESSION ROUTES
  // ==========================================

  // Get sessions for parent's child
  app.get('/api/parent/children/:childId/sessions', isAuthenticated, requireRole("parent"), async (req: Request, res: Response) => {
    try {
      const parentId = req.user?.claims?.sub;
      if (!parentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const childId = req.params.childId;
      
      // Verify parent-child relationship
      const parentChildren = await storage.getParentChildren(parentId);
      const isParentOfChild = parentChildren.some(pc => pc.childId === childId);
      
      if (!isParentOfChild) {
        return res.status(403).json({ message: "Access denied - not your child" });
      }
      
      const status = req.query.status as TutoringSessionStatus | undefined;
      const sessions = await storage.getTutoringSessionsByStudent(childId, status);
      
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching child sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Get sessions for current user (filtered by role)
  app.get('/api/tutoring-sessions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const status = req.query.status as TutoringSessionStatus | undefined;
      let sessions;
      
      if (user.role === "tutor") {
        sessions = await storage.getTutoringSessionsByTutor(userId, status);
      } else if (user.role === "student") {
        sessions = await storage.getTutoringSessionsByStudent(userId, status);
      } else {
        return res.status(403).json({ message: "Only tutors and students can view sessions" });
      }
      
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Get single session details
  app.get('/api/tutoring-sessions/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const session = await storage.getTutoringSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Only tutor, student, or admin/manager can view
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (
        session.tutorId !== userId &&
        session.studentId !== userId &&
        !isStaffWithAccess(user)
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  // Join session (student or tutor)
  app.post('/api/tutoring-sessions/:id/join', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const session = await storage.getTutoringSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const isTutor = session.tutorId === userId;
      // For group sessions, check if student is in attendee list; for 1:1, check studentId
      const isStudent = session.isGroupSession 
        ? await storage.getStudentSessionAttendance(session.id, userId) !== undefined
        : session.studentId === userId;
      
      if (!isTutor && !isStudent) {
        return res.status(403).json({ message: "You are not a participant of this session" });
      }
      
      if (session.status !== "scheduled" && session.status !== "in_progress") {
        return res.status(400).json({ message: `Cannot join a session with status: ${session.status}` });
      }

      const now = new Date();
      const updates: any = {};

      if (isStudent && !isTutor) {
        // Calculate scheduled minutes if not already set, rounded to 15-minute blocks
        const rawScheduledMinutes = session.scheduledMinutes || 
          Math.ceil((new Date(session.scheduledEndTime).getTime() - new Date(session.scheduledStartTime).getTime()) / (1000 * 60));
        const scheduledMinutes = roundUpTo15Minutes(rawScheduledMinutes);
        
        if (session.isGroupSession) {
          // For group sessions, check if already joined via attendance record
          const attendance = await storage.getStudentSessionAttendance(session.id, userId);
          if (!attendance) {
            return res.status(403).json({ message: "You are not registered for this group session" });
          }
          
          // Idempotency: If already joined (reservedMinutes > 0), skip charging
          if (attendance.reservedMinutes && attendance.reservedMinutes > 0) {
            // Already joined and charged - just return current session
            return res.json(session);
          }
          
          // Check hour wallet balance before allowing student to join
          const wallet = await storage.getHourWalletByStudentCourse(userId, session.courseId);
          const balance = wallet ? wallet.purchasedMinutes - wallet.consumedMinutes : 0;
          
          if (balance < scheduledMinutes) {
            return res.status(402).json({ 
              message: `Insufficient hour balance. You need ${scheduledMinutes} minutes but have ${balance} available.` 
            });
          }
          
          // RESERVE scheduled minutes from wallet at join time with audit logging
          await deductWalletWithAudit(
            userId, 
            session.courseId, 
            scheduledMinutes, 
            `Session join: reserved ${scheduledMinutes} min for session ${session.id}`
          );
          
          await storage.updateSessionAttendance(attendance.id, {
            joinTime: now,
            attended: true,
            reservedMinutes: scheduledMinutes,
          });
        } else {
          // For 1:1 sessions - idempotency check
          if (session.studentJoinTime && session.reservedMinutes && session.reservedMinutes > 0) {
            // Already joined and charged - just return current session
            return res.json(session);
          }
          
          // Check hour wallet balance before allowing student to join
          const wallet = await storage.getHourWalletByStudentCourse(userId, session.courseId);
          const balance = wallet ? wallet.purchasedMinutes - wallet.consumedMinutes : 0;
          
          if (balance < scheduledMinutes) {
            return res.status(402).json({ 
              message: `Insufficient hour balance. You need ${scheduledMinutes} minutes but have ${balance} available.` 
            });
          }
          
          // RESERVE scheduled minutes from wallet at join time with audit logging
          await deductWalletWithAudit(
            userId, 
            session.courseId, 
            scheduledMinutes, 
            `Session join: reserved ${scheduledMinutes} min for session ${session.id}`
          );
          
          updates.studentJoinTime = now;
          updates.reservedMinutes = scheduledMinutes;
        }
      }

      if (isTutor) {
        updates.tutorJoinTime = now;
        
        // Check tutor lateness (>10 minutes after scheduled start)
        const scheduledStart = new Date(session.scheduledStartTime);
        const latenessThreshold = new Date(scheduledStart.getTime() + 10 * 60 * 1000);
        if (now > latenessThreshold) {
          updates.tutorLate = true;
        }
      }

      // If both have joined (or first one joining and session is scheduled), start the session
      if (session.status === "scheduled") {
        if (session.isGroupSession) {
          // For group sessions, start when tutor joins
          if (isTutor) {
            updates.status = "in_progress";
            updates.actualStartTime = now;
          }
        } else {
          // For 1:1 sessions, start when both have joined
          const otherJoined = isTutor ? session.studentJoinTime : session.tutorJoinTime;
          if (otherJoined || (updates.studentJoinTime && updates.tutorJoinTime)) {
            updates.status = "in_progress";
            updates.actualStartTime = now;
          }
        }
      }

      const updatedSession = await storage.updateTutoringSession(req.params.id, updates);
      res.json(updatedSession);
    } catch (error) {
      console.error("Error joining session:", error);
      res.status(500).json({ message: "Failed to join session" });
    }
  });

  // End session
  app.post('/api/tutoring-sessions/:id/end', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const session = await storage.getTutoringSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // For group sessions, only tutor can end; for 1:1, either participant can end
      const isTutor = session.tutorId === userId;
      const isStudent = session.isGroupSession 
        ? await storage.getStudentSessionAttendance(session.id, userId) !== undefined
        : session.studentId === userId;
      
      if (!isTutor && !isStudent) {
        return res.status(403).json({ message: "You are not a participant of this session" });
      }
      
      // Only tutor can end group sessions
      if (session.isGroupSession && !isTutor) {
        return res.status(403).json({ message: "Only the tutor can end a group session" });
      }
      
      if (session.status !== "in_progress") {
        return res.status(400).json({ message: "Session is not in progress" });
      }

      const now = new Date();
      const actualStart = session.actualStartTime ? new Date(session.actualStartTime) : now;
      const durationMs = now.getTime() - actualStart.getTime();
      const actualDurationMinutes = Math.ceil(durationMs / (1000 * 60));
      
      // Calculate scheduled minutes
      const scheduledMinutes = session.scheduledMinutes || 
        Math.ceil((new Date(session.scheduledEndTime).getTime() - new Date(session.scheduledStartTime).getTime()) / (1000 * 60));
      
      // Billable minutes = min(actual duration, scheduled minutes) - no extra billing beyond scheduled
      // Minutes were already reserved at join time, so no additional deduction needed
      const billableMinutes = Math.min(actualDurationMinutes, scheduledMinutes);

      if (session.isGroupSession) {
        // For group sessions, update each student's attendance record with leave time
        const attendees = await storage.getSessionAttendance(session.id);
        for (const attendee of attendees) {
          if (attendee.attended && attendee.joinTime && !attendee.leaveTime) {
            const studentDurationMs = now.getTime() - new Date(attendee.joinTime).getTime();
            const studentDurationMinutes = Math.ceil(studentDurationMs / (1000 * 60));
            const consumedMinutes = Math.min(studentDurationMinutes, attendee.reservedMinutes || scheduledMinutes);
            
            await storage.updateSessionAttendance(attendee.id, {
              leaveTime: now,
              consumedMinutes,
            });
          }
        }
      }

      // No additional deduction - minutes were reserved at join time
      const updatedSession = await storage.updateTutoringSession(req.params.id, {
        status: "completed",
        actualEndTime: now,
        billableMinutes,
      });

      res.json(updatedSession);
    } catch (error) {
      console.error("Error ending session:", error);
      res.status(500).json({ message: "Failed to end session" });
    }
  });

  // Postpone session
  app.patch('/api/tutoring-sessions/:id/postpone', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const session = await storage.getTutoringSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const isTutor = session.tutorId === userId;
      const isStudent = session.isGroupSession 
        ? await storage.getStudentSessionAttendance(session.id, userId) !== undefined
        : session.studentId === userId;
      
      if (!isTutor && !isStudent) {
        return res.status(403).json({ message: "You are not a participant of this session" });
      }
      
      // For group sessions, only tutor can postpone
      if (session.isGroupSession && !isTutor) {
        return res.status(403).json({ message: "Only the tutor can postpone a group session" });
      }
      
      if (session.status !== "scheduled") {
        return res.status(400).json({ message: "Only scheduled sessions can be postponed" });
      }

      const now = new Date();
      const scheduledStart = new Date(session.scheduledStartTime);
      const minutesUntilStart = (scheduledStart.getTime() - now.getTime()) / (1000 * 60);
      
      // Calculate scheduled minutes for charging, rounded to 15-minute blocks
      const rawScheduledMinutes = session.scheduledMinutes || 
        Math.ceil((new Date(session.scheduledEndTime).getTime() - scheduledStart.getTime()) / (1000 * 60));
      const scheduledMinutes = roundUpTo15Minutes(rawScheduledMinutes);

      // If less than 120 minutes before start, mark as missed with 50% charge
      if (minutesUntilStart < 120) {
        // For missed sessions <120 min, charge 50% of scheduled duration
        const missedChargeMinutes = roundUpTo15Minutes(Math.ceil(scheduledMinutes * 0.5));
        
        if (session.isGroupSession) {
          // For group sessions, handle each registered student
          const attendees = await storage.getSessionAttendance(session.id);
          for (const attendee of attendees) {
            if (attendee.reservedMinutes && attendee.reservedMinutes > 0) {
              // Student already joined and was charged full amount - issue refund to adjust to 50%
              const refundAmount = attendee.reservedMinutes - missedChargeMinutes;
              if (refundAmount > 0) {
                await refundWalletWithAudit(
                  attendee.studentId, 
                  session.courseId, 
                  refundAmount, 
                  `Late postpone refund: adjusting from ${attendee.reservedMinutes} to ${missedChargeMinutes} min (50%) for session ${session.id}`
                );
              }
              await storage.updateSessionAttendance(attendee.id, {
                attended: false,
                consumedMinutes: missedChargeMinutes,
              });
            } else {
              // Student never joined - charge 50% for missed session
              await deductWalletWithAudit(
                attendee.studentId, 
                session.courseId, 
                missedChargeMinutes, 
                `Missed session: 50% charge (${missedChargeMinutes} min) for session ${session.id}`
              );
              await storage.updateSessionAttendance(attendee.id, {
                attended: false,
                consumedMinutes: missedChargeMinutes,
              });
            }
          }
        } else if (session.studentId) {
          // For 1:1 sessions, check if student already joined (reservedMinutes > 0)
          if (session.reservedMinutes && session.reservedMinutes > 0) {
            // Student already joined and was charged full amount - issue refund to adjust to 50%
            const refundAmount = session.reservedMinutes - missedChargeMinutes;
            if (refundAmount > 0) {
              await refundWalletWithAudit(
                session.studentId, 
                session.courseId, 
                refundAmount, 
                `Late postpone refund: adjusting from ${session.reservedMinutes} to ${missedChargeMinutes} min (50%) for session ${session.id}`
              );
            }
          } else {
            // Student never joined - charge 50% for missed session
            await deductWalletWithAudit(
              session.studentId, 
              session.courseId, 
              missedChargeMinutes, 
              `Missed session: 50% charge (${missedChargeMinutes} min) for session ${session.id}`
            );
          }
        }
        
        const updatedSession = await storage.updateTutoringSession(req.params.id, {
          status: "missed",
          billableMinutes: missedChargeMinutes,
          notes: `Session marked as missed (postponed <120 min before start). 50% charge applied. ${req.body.reason || ""}`.trim(),
        });
        
        // Notify participants
        const otherUserId = isTutor ? session.studentId : session.tutorId;
        if (otherUserId) {
          try {
            await storage.createNotification({
              userId: otherUserId,
              type: "new_announcement" as any,
              title: "Session Missed",
              message: `Your tutoring session has been marked as missed (late postponement). A 50% charge was applied.`,
              link: "/sessions",
              isRead: false,
              relatedId: session.id,
            });
          } catch (notifError) {
            console.error("Error creating notification:", notifError);
          }
        }
        
        return res.json(updatedSession);
      }

      // Normal postponement (>120 min before start) - no charge
      const updatedSession = await storage.updateTutoringSession(req.params.id, {
        status: "postponed",
        notes: req.body.reason || "Session postponed",
      });

      // Notify the other participant
      const otherUserId = isTutor ? session.studentId : session.tutorId;
      if (otherUserId) {
        try {
          await storage.createNotification({
            userId: otherUserId,
            type: "new_announcement" as any,
            title: "Session Postponed",
            message: `Your tutoring session has been postponed. ${req.body.reason || ""}`.trim(),
            link: "/sessions",
            isRead: false,
            relatedId: session.id,
          });
        } catch (notifError) {
          console.error("Error creating notification:", notifError);
        }
      }

      res.json(updatedSession);
    } catch (error) {
      console.error("Error postponing session:", error);
      res.status(500).json({ message: "Failed to postpone session" });
    }
  });

  // Cancel session
  app.patch('/api/tutoring-sessions/:id/cancel', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const session = await storage.getTutoringSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (session.tutorId !== userId && session.studentId !== userId) {
        return res.status(403).json({ message: "You are not a participant of this session" });
      }
      
      if (session.status === "completed" || session.status === "cancelled") {
        return res.status(400).json({ message: "Session cannot be cancelled" });
      }

      const updatedSession = await storage.updateTutoringSession(req.params.id, {
        status: "cancelled",
        notes: req.body.reason || "Session cancelled",
      });

      // Notify the other participant
      const otherUserId = session.tutorId === userId ? session.studentId : session.tutorId;
      try {
        await storage.createNotification({
          userId: otherUserId,
          type: "session_cancelled",
          title: "Session Cancelled",
          message: `Your tutoring session has been cancelled. ${req.body.reason || ""}`.trim(),
          link: "/sessions",
          isRead: false,
          relatedId: session.id,
        });
      } catch (notifError) {
        console.error("Error creating notification:", notifError);
      }

      res.json(updatedSession);
    } catch (error) {
      console.error("Error cancelling session:", error);
      res.status(500).json({ message: "Failed to cancel session" });
    }
  });

  // ==========================================
  // HOUR WALLET ROUTES
  // ==========================================

  // Get all wallets (admin/manager only)
  app.get('/api/hour-wallets', isAuthenticated, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const wallets = await storage.getAllHourWallets();
      res.json(wallets);
    } catch (error) {
      console.error("Error fetching all wallets:", error);
      res.status(500).json({ message: "Failed to fetch wallets" });
    }
  });

  // Get student's own wallets
  app.get('/api/hour-wallets/student', isAuthenticated, requireRole("student"), async (req: Request, res: Response) => {
    try {
      const studentId = req.user?.claims?.sub;
      if (!studentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const wallets = await storage.getHourWalletsByStudent(studentId);
      res.json(wallets);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      res.status(500).json({ message: "Failed to fetch wallets" });
    }
  });

  // Get wallet for specific student/course (manager/admin/tutor view)
  app.get('/api/hour-wallets/:studentId/:courseId', isAuthenticated, requireRole("manager", "admin", "tutor"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      const { studentId, courseId } = req.params;
      
      // For tutors, verify they are the tutor of this course
      if (dbUser.role === "tutor") {
        const course = await storage.getCourse(courseId);
        if (!course || course.tutorId !== dbUser.id) {
          return res.status(403).json({ message: "Access denied: You can only view wallets for your own courses" });
        }
      }
      
      const wallet = await storage.getHourWalletByStudentCourse(studentId, courseId);
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      res.json(wallet);
    } catch (error) {
      console.error("Error fetching wallet:", error);
      res.status(500).json({ message: "Failed to fetch wallet" });
    }
  });

  // Get all wallets for a course (for tutor's own courses)
  app.get('/api/hour-wallets/course/:courseId', isAuthenticated, requireRole("manager", "admin", "tutor"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      const { courseId } = req.params;
      
      // For tutors, verify they are the tutor of this course
      if (dbUser.role === "tutor") {
        const course = await storage.getCourse(courseId);
        if (!course || course.tutorId !== dbUser.id) {
          return res.status(403).json({ message: "Access denied: You can only view wallets for your own courses" });
        }
      }
      
      // Get all wallets for this course with student and course details
      const wallets = await storage.getHourWalletsByCourse(courseId);
      res.json(wallets);
    } catch (error) {
      console.error("Error fetching course wallets:", error);
      res.status(500).json({ message: "Failed to fetch wallets" });
    }
  });

  // Create or add hours to wallet (manager/admin - original endpoint)
  app.post('/api/hour-wallets', isAuthenticated, requireRole("manager", "admin"), async (req: Request, res: Response) => {
    try {
      const { studentId, courseId, minutes, reason } = req.body;
      const performedById = req.user?.claims?.sub;
      
      if (!studentId || !courseId || !minutes || minutes <= 0) {
        return res.status(400).json({ message: "Invalid data: studentId, courseId, and positive minutes required" });
      }
      
      if (!reason || reason.trim() === "") {
        return res.status(400).json({ message: "Reason is required for top-up" });
      }

      let wallet;
      let isNew = false;
      
      // Check if wallet exists
      const existingWallet = await storage.getHourWalletByStudentCourse(studentId, courseId);
      
      if (existingWallet) {
        // Add to existing wallet (increments purchasedMinutes, does not overwrite)
        wallet = await storage.addMinutesToWallet(studentId, courseId, minutes);
      } else {
        // Create new wallet
        const validated = insertHourWalletSchema.parse({
          studentId,
          courseId,
          purchasedMinutes: minutes,
          consumedMinutes: 0,
        });
        wallet = await storage.createHourWallet(validated);
        isNew = true;
      }
      
      // Create wallet transaction audit log
      let transaction = null;
      if (wallet) {
        const remainingMinutes = wallet.purchasedMinutes - wallet.consumedMinutes;
        transaction = await storage.createWalletTransaction({
          walletId: wallet.id,
          minutesDelta: minutes,
          balanceAfter: remainingMinutes,
          reason: reason.trim(),
          performedById: performedById || null,
        });
      }
      
      res.status(isNew ? 201 : 200).json({ wallet, transaction });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating/updating wallet:", error);
      res.status(500).json({ message: "Failed to update wallet" });
    }
  });

  // Top-up hours to wallet (admin, manager, or tutor with course permission)
  app.post('/api/hour-wallets/top-up', isAuthenticated, requireRole("admin", "manager", "tutor"), async (req: Request, res: Response) => {
    try {
      const { studentId, courseId, addMinutes, reason } = req.body;
      const performedById = req.user?.claims?.sub;
      const dbUser = (req as any).dbUser;
      
      if (!studentId || !courseId || !addMinutes || addMinutes <= 0) {
        return res.status(400).json({ message: "Invalid data: studentId, courseId, and positive addMinutes required" });
      }
      
      if (!reason || reason.trim() === "") {
        return res.status(400).json({ message: "Reason is required for top-up" });
      }
      
      // For tutors, verify they are the tutor of this course
      if (dbUser.role === "tutor") {
        const course = await storage.getCourse(courseId);
        if (!course || course.tutorId !== dbUser.id) {
          return res.status(403).json({ message: "Access denied: You can only add hours to courses you teach" });
        }
        
        // Also verify the student is enrolled in this course
        const enrollments = await storage.getEnrollmentsByCourse(courseId);
        const isEnrolled = enrollments.some(e => e.studentId === studentId && e.status === "active");
        if (!isEnrolled) {
          return res.status(403).json({ message: "Access denied: This student is not enrolled in your course" });
        }
      }

      let wallet;
      let isNew = false;
      
      // Check if wallet exists
      const existingWallet = await storage.getHourWalletByStudentCourse(studentId, courseId);
      
      if (existingWallet) {
        // Add to existing wallet (increments purchasedMinutes, does not overwrite)
        wallet = await storage.addMinutesToWallet(studentId, courseId, addMinutes);
      } else {
        // Create new wallet
        const validated = insertHourWalletSchema.parse({
          studentId,
          courseId,
          purchasedMinutes: addMinutes,
          consumedMinutes: 0,
        });
        wallet = await storage.createHourWallet(validated);
        isNew = true;
      }
      
      // Create wallet transaction audit log
      let transaction = null;
      if (wallet) {
        const remainingMinutes = wallet.purchasedMinutes - wallet.consumedMinutes;
        transaction = await storage.createWalletTransaction({
          walletId: wallet.id,
          minutesDelta: addMinutes,
          balanceAfter: remainingMinutes,
          reason: reason.trim(),
          performedById: performedById || null,
        });
      }
      
      res.status(isNew ? 201 : 200).json({ wallet, transaction });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error in wallet top-up:", error);
      res.status(500).json({ message: "Failed to add hours to wallet" });
    }
  });

  // ==========================================
  // INVOICE ROUTES
  // ==========================================

  // Create invoice schema for validation
  const createInvoiceRequestSchema = z.object({
    parentId: z.string().min(1),
    studentId: z.string().min(1),
    billingPeriodStart: z.string().datetime(),
    billingPeriodEnd: z.string().datetime(),
    currency: z.enum(["ZAR", "USD", "GBP"]).default("ZAR"),
    dueDate: z.string().datetime().optional(),
    notes: z.string().optional(),
    lineItems: z.array(z.object({
      courseId: z.string().min(1),
      description: z.string().min(1),
      hours: z.string(),
      hourlyRate: z.string(),
      amount: z.string(),
      minutesToAdd: z.number().int().default(0),
    })).min(1),
  });

  // Get all invoices (admin level 3+ see all, parents see their own)
  app.get('/api/invoices', isAuthenticated, requireRole("admin", "manager", "parent"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      const status = req.query.status as InvoiceStatus | undefined;
      
      if (dbUser.role === "parent") {
        const invoices = await storage.getInvoicesByParent(dbUser.id);
        res.json(invoices);
      } else {
        // Admin/manager accessing all invoices requires level 3 (Finance)
        if (dbUser.adminLevel < 3 && !dbUser.isSuperAdmin) {
          return res.status(403).json({ message: "Insufficient admin level. Level 3 (Finance) required." });
        }
        const invoices = await storage.getAllInvoices(status);
        res.json(invoices);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Get single invoice with details
  app.get('/api/invoices/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Only admin, manager, parent, or student can access invoices
      const allowedRoles = ["admin", "manager", "parent", "student"];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const invoice = await storage.getInvoiceWithDetails(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Parents can only view their own invoices
      if (user.role === "parent" && invoice.parentId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Students can view invoices for them
      if (user.role === "student" && invoice.studentId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  // Create invoice with line items (admin level 3+ - Finance)
  app.post('/api/invoices', isAuthenticated, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      if (dbUser.adminLevel < 3 && !dbUser.isSuperAdmin) {
        return res.status(403).json({ message: "Insufficient admin level. Level 3 (Finance) required." });
      }
      
      const validated = createInvoiceRequestSchema.parse(req.body);
      
      // Generate invoice number
      const invoiceNumber = await storage.generateInvoiceNumber();
      
      // Calculate totals
      const subtotal = validated.lineItems.reduce((sum, item) => 
        sum + parseFloat(item.amount), 0
      );
      
      // Create the invoice
      const invoiceData = {
        invoiceNumber,
        parentId: validated.parentId,
        studentId: validated.studentId,
        billingPeriodStart: new Date(validated.billingPeriodStart),
        billingPeriodEnd: new Date(validated.billingPeriodEnd),
        currency: validated.currency,
        subtotal: subtotal.toFixed(2),
        taxAmount: "0.00",
        totalAmount: subtotal.toFixed(2),
        amountPaid: "0.00",
        amountOutstanding: subtotal.toFixed(2),
        status: "draft" as InvoiceStatus,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        notes: validated.notes || null,
      };
      
      const invoice = await storage.createInvoice(invoiceData);
      
      // Create line items
      for (const item of validated.lineItems) {
        await storage.createInvoiceLineItem({
          invoiceId: invoice.id,
          courseId: item.courseId,
          description: item.description,
          hours: item.hours,
          hourlyRate: item.hourlyRate,
          amount: item.amount,
          minutesToAdd: item.minutesToAdd,
        });
      }
      
      // Return invoice with details
      const invoiceWithDetails = await storage.getInvoiceWithDetails(invoice.id);
      res.status(201).json(invoiceWithDetails);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Update invoice (admin level 3+ - Finance, draft invoices only)
  app.patch('/api/invoices/:id', isAuthenticated, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      if (dbUser.adminLevel < 3 && !dbUser.isSuperAdmin) {
        return res.status(403).json({ message: "Insufficient admin level. Level 3 (Finance) required." });
      }
      
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Only draft invoices can be updated (except for status changes)
      if (invoice.status !== "draft" && !req.body.status) {
        return res.status(400).json({ message: "Only draft invoices can be updated" });
      }
      
      const updateSchema = z.object({
        dueDate: z.string().datetime().optional(),
        notes: z.string().optional(),
        status: z.enum(["draft", "awaiting_payment", "paid", "overdue", "disputed", "verified"]).optional(),
      });
      
      const validated = updateSchema.parse(req.body);
      
      const updates: any = {};
      if (validated.dueDate) updates.dueDate = new Date(validated.dueDate);
      if (validated.notes !== undefined) updates.notes = validated.notes;
      if (validated.status) updates.status = validated.status;
      
      const updated = await storage.updateInvoice(req.params.id, updates);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Send invoice (admin level 3+ - Finance)
  app.post('/api/invoices/:id/send', isAuthenticated, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      if (dbUser.adminLevel < 3 && !dbUser.isSuperAdmin) {
        return res.status(403).json({ message: "Insufficient admin level. Level 3 (Finance) required." });
      }
      
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      if (invoice.status !== "draft") {
        return res.status(400).json({ message: "Only draft invoices can be sent" });
      }
      
      // Set due date if not already set (default: 14 days from now)
      const dueDate = invoice.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      
      const updated = await storage.updateInvoice(req.params.id, {
        status: "awaiting_payment",
        dueDate,
      });
      
      // Create notification for parent
      try {
        await storage.createNotification({
          userId: invoice.parentId,
          type: "system" as any,
          title: "New Invoice",
          message: `Invoice ${invoice.invoiceNumber} has been issued. Amount: ${invoice.currency} ${invoice.totalAmount}`,
          link: `/invoices/${invoice.id}`,
          isRead: false,
          relatedId: invoice.id,
        });
      } catch (notifError) {
        console.error("Error creating invoice notification:", notifError);
      }
      
      const invoiceWithDetails = await storage.getInvoiceWithDetails(req.params.id);
      res.json(invoiceWithDetails);
    } catch (error) {
      console.error("Error sending invoice:", error);
      res.status(500).json({ message: "Failed to send invoice" });
    }
  });

  // Get invoices for a specific student (admin/manager/parent)
  app.get('/api/invoices/student/:studentId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Only admin/manager can view any student's invoices
      // Parents can only view invoices for their linked children
      if (user.role === "parent") {
        const children = await storage.getParentChildren(userId);
        const childIds = children.map(c => c.childId);
        if (!childIds.includes(req.params.studentId)) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (user.role !== "admin" && user.role !== "manager") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const invoices = await storage.getInvoicesByStudent(req.params.studentId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching student invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Get line items for an invoice
  app.get('/api/invoices/:id/line-items', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Access check
      if (user.role === "parent" && invoice.parentId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const lineItems = await storage.getInvoiceLineItems(req.params.id);
      res.json(lineItems);
    } catch (error) {
      console.error("Error fetching invoice line items:", error);
      res.status(500).json({ message: "Failed to fetch line items" });
    }
  });

  // Generate PDF for invoice
  app.get('/api/invoices/:id/pdf', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Only admin, manager, parent, or student can download invoices
      const allowedRoles = ["admin", "manager", "parent", "student"];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const invoice = await storage.getInvoiceWithDetails(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Parents can only download their own invoices
      if (user.role === "parent" && invoice.parentId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Students can download invoices for them
      if (user.role === "student" && invoice.studentId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const lineItems = await storage.getInvoiceLineItems(req.params.id);
      
      // Get parent and student details
      const parent = await storage.getUser(invoice.parentId);
      const student = await storage.getUser(invoice.studentId);
      
      // Create PDF document
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${invoice.invoiceNumber}`,
          Author: 'MCEC LMS',
        }
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      
      // Pipe to response
      doc.pipe(res);
      
      // Helper functions
      const formatCurrency = (amount: string | number, currency: string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        const symbols: Record<string, string> = { ZAR: 'R', USD: '$', GBP: '£' };
        return `${symbols[currency] || currency} ${num.toFixed(2)}`;
      };
      
      const formatDate = (date: Date | string | null) => {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('en-ZA', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      };
      
      // Document colors
      const primaryColor = '#2563eb';
      const grayColor = '#6b7280';
      const darkColor = '#1f2937';
      
      // Header
      doc.fontSize(24)
         .fillColor(primaryColor)
         .text('MCEC', 50, 50)
         .fontSize(10)
         .fillColor(grayColor)
         .text('Learning Management System', 50, 78);
      
      // Invoice title
      doc.fontSize(28)
         .fillColor(darkColor)
         .text('INVOICE', 400, 50, { align: 'right' });
      
      doc.fontSize(12)
         .fillColor(grayColor)
         .text(`#${invoice.invoiceNumber}`, 400, 85, { align: 'right' });
      
      // Status badge
      const statusColors: Record<string, string> = {
        draft: '#6b7280',
        awaiting_payment: '#f59e0b',
        paid: '#10b981',
        overdue: '#ef4444',
        disputed: '#ef4444',
        verified: '#10b981',
      };
      
      doc.fontSize(10)
         .fillColor(statusColors[invoice.status] || grayColor)
         .text(invoice.status.toUpperCase().replace('_', ' '), 400, 102, { align: 'right' });
      
      // Horizontal line
      doc.moveTo(50, 130)
         .lineTo(545, 130)
         .strokeColor('#e5e7eb')
         .stroke();
      
      // Bill To and Invoice Details section
      doc.fontSize(10)
         .fillColor(grayColor)
         .text('BILL TO', 50, 150);
      
      doc.fontSize(12)
         .fillColor(darkColor)
         .text(`${parent?.firstName || ''} ${parent?.lastName || ''}`.trim() || 'Parent', 50, 168)
         .fontSize(10)
         .fillColor(grayColor)
         .text(parent?.email || '', 50, 185);
      
      doc.fontSize(10)
         .fillColor(grayColor)
         .text('STUDENT', 50, 210);
      
      doc.fontSize(11)
         .fillColor(darkColor)
         .text(`${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'Student', 50, 225);
      
      // Right side - Invoice details
      doc.fontSize(10)
         .fillColor(grayColor)
         .text('Invoice Date:', 350, 150)
         .text('Due Date:', 350, 168)
         .text('Billing Period:', 350, 186);
      
      doc.fillColor(darkColor)
         .text(formatDate(invoice.createdAt), 450, 150, { align: 'right' })
         .text(formatDate(invoice.dueDate), 450, 168, { align: 'right' })
         .text(`${formatDate(invoice.billingPeriodStart)} - ${formatDate(invoice.billingPeriodEnd)}`, 350, 186, { align: 'right', width: 195 });
      
      // Line Items Table
      const tableTop = 270;
      const tableHeaders = ['Description', 'Hours', 'Rate', 'Amount'];
      const colWidths = [240, 60, 80, 80];
      const colPositions = [50, 290, 350, 430];
      
      // Table header background
      doc.rect(50, tableTop - 5, 495, 25)
         .fillColor('#f3f4f6')
         .fill();
      
      // Table headers
      doc.fontSize(10)
         .fillColor(grayColor);
      
      tableHeaders.forEach((header, i) => {
        const align = i === 0 ? 'left' : 'right';
        doc.text(header, colPositions[i], tableTop + 3, { 
          width: colWidths[i], 
          align: align as any
        });
      });
      
      // Table rows
      let yPos = tableTop + 30;
      doc.fontSize(10).fillColor(darkColor);
      
      for (const item of lineItems) {
        // Get course name
        const course = await storage.getCourse(item.courseId);
        const description = item.description || course?.title || 'Course';
        
        doc.text(description, colPositions[0], yPos, { width: colWidths[0] });
        doc.text(parseFloat(item.hours).toFixed(2), colPositions[1], yPos, { width: colWidths[1], align: 'right' });
        doc.text(formatCurrency(item.hourlyRate, invoice.currency), colPositions[2], yPos, { width: colWidths[2], align: 'right' });
        doc.text(formatCurrency(item.amount, invoice.currency), colPositions[3], yPos, { width: colWidths[3], align: 'right' });
        
        yPos += 25;
        
        // Add line separator
        doc.moveTo(50, yPos - 5)
           .lineTo(545, yPos - 5)
           .strokeColor('#e5e7eb')
           .stroke();
      }
      
      // Totals section
      const totalsTop = yPos + 20;
      
      doc.fontSize(10)
         .fillColor(grayColor)
         .text('Subtotal:', 350, totalsTop, { width: 80 })
         .text('Tax:', 350, totalsTop + 20, { width: 80 });
      
      doc.fillColor(darkColor)
         .text(formatCurrency(invoice.subtotal, invoice.currency), 430, totalsTop, { width: 80, align: 'right' })
         .text(formatCurrency(invoice.taxAmount, invoice.currency), 430, totalsTop + 20, { width: 80, align: 'right' });
      
      // Total line
      doc.moveTo(350, totalsTop + 40)
         .lineTo(510, totalsTop + 40)
         .strokeColor('#e5e7eb')
         .stroke();
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(darkColor)
         .text('Total:', 350, totalsTop + 50, { width: 80 })
         .text(formatCurrency(invoice.totalAmount, invoice.currency), 430, totalsTop + 50, { width: 80, align: 'right' });
      
      // Amount paid and outstanding
      if (parseFloat(invoice.amountPaid) > 0) {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#10b981')
           .text('Amount Paid:', 350, totalsTop + 75, { width: 80 })
           .text(`-${formatCurrency(invoice.amountPaid, invoice.currency)}`, 430, totalsTop + 75, { width: 80, align: 'right' });
      }
      
      if (parseFloat(invoice.amountOutstanding) > 0) {
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor(invoice.status === 'overdue' ? '#ef4444' : primaryColor)
           .text('Amount Due:', 350, totalsTop + 95, { width: 80 })
           .text(formatCurrency(invoice.amountOutstanding, invoice.currency), 430, totalsTop + 95, { width: 80, align: 'right' });
      }
      
      // Notes section
      if (invoice.notes) {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(grayColor)
           .text('Notes:', 50, totalsTop + 130)
           .fillColor(darkColor)
           .text(invoice.notes, 50, totalsTop + 148, { width: 300 });
      }
      
      // Footer
      const footerTop = 750;
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(grayColor)
         .text('Thank you for your business!', 50, footerTop, { align: 'center', width: 495 })
         .text('MCEC Learning Management System', 50, footerTop + 15, { align: 'center', width: 495 });
      
      // Finalize PDF
      doc.end();
      
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // ==========================================
  // INVOICE PAYMENT ROUTES
  // ==========================================

  // Parent uploads payment proof for an invoice
  app.post('/api/invoices/:id/payments', isAuthenticated, requireRole("parent"), async (req: Request, res: Response) => {
    try {
      const invoiceId = req.params.id;
      const dbUser = (req as any).dbUser;
      
      // Get the invoice and verify ownership
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Parents can only upload payments for their own invoices
      if (invoice.parentId !== dbUser.id) {
        return res.status(403).json({ message: "You can only upload payments for your own invoices" });
      }
      
      // Validate payment data with proper numeric validation
      const paymentSchema = z.object({
        amount: z.string().or(z.number()).transform((val, ctx) => {
          const num = typeof val === 'number' ? val : parseFloat(val);
          if (isNaN(num) || num <= 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Amount must be a valid positive number",
            });
            return z.NEVER;
          }
          // Return as string with 2 decimal places for consistent storage
          return num.toFixed(2);
        }),
        currency: z.enum(["ZAR", "USD", "GBP"]).optional(),
        paymentMethod: z.string().max(50).optional(),
        paymentReference: z.string().max(100).optional(),
        proofAssetUrl: z.string().optional(),
      });
      
      const validated = paymentSchema.parse(req.body);
      
      // Create payment record
      const payment = await storage.createInvoicePayment({
        invoiceId,
        amount: validated.amount,
        currency: validated.currency || invoice.currency,
        paymentMethod: validated.paymentMethod || null,
        paymentReference: validated.paymentReference || null,
        proofAssetUrl: validated.proofAssetUrl || null,
        verificationStatus: "pending",
        verifiedById: null,
        verifiedAt: null,
        rejectionReason: null,
      });
      
      // Update invoice status to awaiting_payment if it was draft
      if (invoice.status === "draft") {
        await storage.updateInvoice(invoiceId, { status: "awaiting_payment" });
      }
      
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error uploading payment:", error);
      res.status(500).json({ message: "Failed to upload payment" });
    }
  });

  // Get pending payments for admin review
  app.get('/api/payments/pending', isAuthenticated, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const pendingPayments = await storage.getPendingPayments();
      
      // Enrich with invoice details
      const enrichedPayments = await Promise.all(
        pendingPayments.map(async (payment) => {
          const invoice = await storage.getInvoiceWithDetails(payment.invoiceId);
          return {
            ...payment,
            invoice,
          };
        })
      );
      
      res.json(enrichedPayments);
    } catch (error) {
      console.error("Error fetching pending payments:", error);
      res.status(500).json({ message: "Failed to fetch pending payments" });
    }
  });

  // Get a specific payment
  app.get('/api/payments/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const payment = await storage.getInvoicePayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId!);
      
      // Check access: admin/manager can see all, parent can see their own
      if (user?.role !== "admin" && user?.role !== "manager") {
        const invoice = await storage.getInvoice(payment.invoiceId);
        if (invoice?.parentId !== userId && invoice?.studentId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      // Enrich with invoice details
      const invoice = await storage.getInvoiceWithDetails(payment.invoiceId);
      res.json({ ...payment, invoice });
    } catch (error) {
      console.error("Error fetching payment:", error);
      res.status(500).json({ message: "Failed to fetch payment" });
    }
  });

  // Admin verifies a payment
  app.patch('/api/payments/:id/verify', isAuthenticated, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const paymentId = req.params.id;
      const dbUser = (req as any).dbUser;
      
      const payment = await storage.getInvoicePayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      if (payment.verificationStatus !== "pending") {
        return res.status(400).json({ message: "Payment has already been processed" });
      }
      
      // Defensive validation: ensure payment amount is a valid number
      const paymentAmount = parseFloat(payment.amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ message: "Payment has invalid amount data and cannot be verified" });
      }
      
      // Update payment verification status
      const updatedPayment = await storage.updatePaymentVerification(
        paymentId,
        "verified",
        dbUser.id
      );
      
      // Update invoice amounts
      const invoice = await storage.getInvoice(payment.invoiceId);
      if (invoice) {
        const newAmountPaid = parseFloat(invoice.amountPaid) + paymentAmount;
        const newAmountOutstanding = parseFloat(invoice.totalAmount) - newAmountPaid;
        
        // Determine new status
        let newStatus: InvoiceStatus = invoice.status;
        if (newAmountOutstanding <= 0) {
          newStatus = "paid";
        }
        
        await storage.updateInvoice(invoice.id, {
          amountPaid: String(newAmountPaid),
          amountOutstanding: String(Math.max(0, newAmountOutstanding)),
          status: newStatus,
        });
        
        // If invoice is fully paid, credit the student's hour wallet
        if (newStatus === "paid") {
          const lineItems = await storage.getInvoiceLineItems(invoice.id);
          
          for (const item of lineItems) {
            if (item.minutesToAdd > 0) {
              // Get or create wallet for this student-course combo
              let wallet = await storage.getHourWalletByStudentCourse(invoice.studentId, item.courseId);
              
              if (!wallet) {
                wallet = await storage.createHourWallet({
                  studentId: invoice.studentId,
                  courseId: item.courseId,
                  purchasedMinutes: 0,
                  consumedMinutes: 0,
                  status: "active",
                  expiresAt: null,
                });
              }
              
              // Add minutes to wallet
              const updatedWallet = await storage.addMinutesToWallet(
                invoice.studentId,
                item.courseId,
                item.minutesToAdd
              );
              
              // Record wallet transaction for audit
              if (updatedWallet) {
                const remainingMinutes = updatedWallet.purchasedMinutes - updatedWallet.consumedMinutes;
                await storage.createWalletTransaction({
                  walletId: updatedWallet.id,
                  invoiceId: invoice.id,
                  minutesDelta: item.minutesToAdd,
                  balanceAfter: remainingMinutes,
                  reason: `Payment verified for invoice ${invoice.invoiceNumber}`,
                  performedById: dbUser.id,
                });
              }
            }
          }
        }
      }
      
      res.json(updatedPayment);
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  // Admin rejects a payment
  app.patch('/api/payments/:id/reject', isAuthenticated, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const paymentId = req.params.id;
      const dbUser = (req as any).dbUser;
      
      const payment = await storage.getInvoicePayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      if (payment.verificationStatus !== "pending") {
        return res.status(400).json({ message: "Payment has already been processed" });
      }
      
      const { reason } = req.body;
      if (!reason || typeof reason !== "string") {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      
      // Update payment verification status with rejection reason
      const updatedPayment = await storage.updatePaymentVerification(
        paymentId,
        "rejected",
        dbUser.id,
        reason
      );
      
      res.json(updatedPayment);
    } catch (error) {
      console.error("Error rejecting payment:", error);
      res.status(500).json({ message: "Failed to reject payment" });
    }
  });

  // Get payments for an invoice
  app.get('/api/invoices/:id/payments', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const invoiceId = req.params.id;
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId!);
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check access: admin/manager can see all, parent/student can see their own
      if (user?.role !== "admin" && user?.role !== "manager") {
        if (invoice.parentId !== userId && invoice.studentId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const payments = await storage.getInvoicePayments(invoiceId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching invoice payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // ==========================================
  // ACCOUNT STANDING ROUTES
  // ==========================================

  // Get account standing for the current parent
  app.get('/api/account/standing', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Only parents have account standing (invoices are billed to parents)
      if (user.role !== "parent") {
        return res.json({
          hasOverdueInvoices: false,
          overdueCount: 0,
          totalOverdueAmount: "0",
          oldestOverdueDate: null,
        });
      }
      
      const standing = await storage.getAccountStanding(userId);
      res.json(standing);
    } catch (error) {
      console.error("Error fetching account standing:", error);
      res.status(500).json({ message: "Failed to fetch account standing" });
    }
  });

  // Get account standing for a specific parent (admin/manager only)
  app.get('/api/account/standing/:parentId', isAuthenticated, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const parentId = req.params.parentId;
      const standing = await storage.getAccountStanding(parentId);
      res.json(standing);
    } catch (error) {
      console.error("Error fetching account standing:", error);
      res.status(500).json({ message: "Failed to fetch account standing" });
    }
  });

  // ==========================================
  // PAYROLL ROUTES
  // ==========================================

  // Get all payouts (admin level 3+ - Finance)
  app.get('/api/payouts', isAuthenticated, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      if (dbUser.adminLevel < 3 && !dbUser.isSuperAdmin) {
        return res.status(403).json({ message: "Insufficient admin level. Level 3 (Finance) required." });
      }
      
      const status = req.query.status as PayoutStatus | undefined;
      const payouts = await storage.getAllPayouts(status);
      res.json(payouts);
    } catch (error) {
      console.error("Error fetching payouts:", error);
      res.status(500).json({ message: "Failed to fetch payouts" });
    }
  });

  // Get tutor's own payouts
  app.get('/api/tutor/payouts', isAuthenticated, requireRole("tutor"), async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const payouts = await storage.getPayoutsByTutor(userId);
      res.json(payouts);
    } catch (error) {
      console.error("Error fetching tutor payouts:", error);
      res.status(500).json({ message: "Failed to fetch payouts" });
    }
  });

  // Get payout details
  app.get('/api/payouts/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const payoutId = req.params.id;
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId!);
      
      const payout = await storage.getPayoutWithDetails(payoutId);
      if (!payout) {
        return res.status(404).json({ message: "Payout not found" });
      }
      
      // Check access: admin/manager can see all, tutor can see their own
      if (user?.role !== "admin" && user?.role !== "manager") {
        if (payout.tutorId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      res.json(payout);
    } catch (error) {
      console.error("Error fetching payout:", error);
      res.status(500).json({ message: "Failed to fetch payout" });
    }
  });

  // Create payout (admin level 3+ - Finance)
  app.post('/api/payouts', isAuthenticated, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const dbUser = (req as any).dbUser;
      if (dbUser.adminLevel < 3 && !dbUser.isSuperAdmin) {
        return res.status(403).json({ message: "Insufficient admin level. Level 3 (Finance) required." });
      }
      
      const result = insertPayoutSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid payout data", errors: result.error.errors });
      }
      
      const payout = await storage.createPayout(result.data);
      res.status(201).json(payout);
    } catch (error) {
      console.error("Error creating payout:", error);
      res.status(500).json({ message: "Failed to create payout" });
    }
  });

  // Update payout (admin/manager only) - restricted fields and status transitions
  const updatePayoutSchema = z.object({
    status: z.enum(["draft", "approved", "paid", "on_hold"]).optional(),
    notes: z.string().optional(),
  });
  
  app.patch('/api/payouts/:id', isAuthenticated, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const payoutId = req.params.id;
      const dbUser = (req as any).dbUser;
      
      const payout = await storage.getPayout(payoutId);
      if (!payout) {
        return res.status(404).json({ message: "Payout not found" });
      }
      
      // Validate only allowed fields
      const result = updatePayoutSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid update data", errors: result.error.errors });
      }
      
      const safeUpdates: any = { ...result.data };
      
      // Enforce status transition rules
      if (safeUpdates.status) {
        const currentStatus = payout.status;
        const newStatus = safeUpdates.status;
        
        // Valid transitions: draft -> approved, approved -> paid, any -> on_hold, on_hold -> approved
        const validTransitions: Record<string, string[]> = {
          draft: ["approved", "on_hold"],
          approved: ["paid", "on_hold"],
          paid: [],
          on_hold: ["approved", "draft"],
        };
        
        if (!validTransitions[currentStatus]?.includes(newStatus)) {
          return res.status(400).json({ 
            message: `Invalid status transition from '${currentStatus}' to '${newStatus}'` 
          });
        }
        
        // Set approval metadata when transitioning to approved
        if (newStatus === "approved" && currentStatus !== "approved") {
          safeUpdates.approvedById = dbUser.id;
          safeUpdates.approvedAt = new Date();
          
          // Check for unpaid invoice mismatches and create flags
          const lines = await storage.getPayoutLines(payoutId);
          const existingFlags = await storage.getPayoutFlags(payoutId);
          const existingInvoiceFlags = new Set(
            existingFlags
              .filter(f => f.flagType === "unpaid_invoice")
              .map(f => f.invoiceId)
          );
          const studentsChecked = new Set<string>();
          
          for (const line of lines) {
            // Skip if we've already checked this student
            if (studentsChecked.has(line.studentId)) continue;
            studentsChecked.add(line.studentId);
            
            // Find unpaid invoices for this student in the payout period
            const unpaidInvoices = await storage.getUnpaidInvoicesByStudentInPeriod(
              line.studentId,
              payout.periodStart,
              payout.periodEnd
            );
            
            // Create a flag for each unpaid invoice (skip if already flagged)
            for (const invoice of unpaidInvoices) {
              if (existingInvoiceFlags.has(invoice.id)) continue;
              
              await storage.createPayoutFlag({
                payoutId,
                invoiceId: invoice.id,
                flagType: "unpaid_invoice",
                description: `Tutor payment includes sessions for student with unpaid invoice ${invoice.invoiceNumber} (Status: ${invoice.status}, Outstanding: ${invoice.amountOutstanding})`,
                isResolved: false,
              });
            }
          }
        }
        
        // Set paid timestamp when transitioning to paid
        if (newStatus === "paid" && currentStatus !== "paid") {
          safeUpdates.paidAt = new Date();
        }
      }
      
      const updatedPayout = await storage.updatePayout(payoutId, safeUpdates);
      
      // Return payout with details including any new flags
      const payoutWithDetails = await storage.getPayoutWithDetails(payoutId);
      res.json(payoutWithDetails || updatedPayout);
    } catch (error) {
      console.error("Error updating payout:", error);
      res.status(500).json({ message: "Failed to update payout" });
    }
  });

  // Add line to payout (admin/manager only)
  app.post('/api/payouts/:id/lines', isAuthenticated, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const payoutId = req.params.id;
      
      const payout = await storage.getPayout(payoutId);
      if (!payout) {
        return res.status(404).json({ message: "Payout not found" });
      }
      
      const lineData = { ...req.body, payoutId };
      const result = insertPayoutLineSchema.safeParse(lineData);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid line data", errors: result.error.errors });
      }
      
      const line = await storage.createPayoutLine(result.data);
      res.status(201).json(line);
    } catch (error) {
      console.error("Error adding payout line:", error);
      res.status(500).json({ message: "Failed to add payout line" });
    }
  });

  // Get payout lines
  app.get('/api/payouts/:id/lines', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const payoutId = req.params.id;
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId!);
      
      const payout = await storage.getPayout(payoutId);
      if (!payout) {
        return res.status(404).json({ message: "Payout not found" });
      }
      
      // Check access
      if (user?.role !== "admin" && user?.role !== "manager") {
        if (payout.tutorId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const lines = await storage.getPayoutLines(payoutId);
      res.json(lines);
    } catch (error) {
      console.error("Error fetching payout lines:", error);
      res.status(500).json({ message: "Failed to fetch payout lines" });
    }
  });

  // Create payout flag (admin/manager only)
  app.post('/api/payouts/:id/flags', isAuthenticated, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const payoutId = req.params.id;
      
      const payout = await storage.getPayout(payoutId);
      if (!payout) {
        return res.status(404).json({ message: "Payout not found" });
      }
      
      const flagData = { ...req.body, payoutId };
      const result = insertPayoutFlagSchema.safeParse(flagData);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid flag data", errors: result.error.errors });
      }
      
      const flag = await storage.createPayoutFlag(result.data);
      res.status(201).json(flag);
    } catch (error) {
      console.error("Error creating payout flag:", error);
      res.status(500).json({ message: "Failed to create payout flag" });
    }
  });

  // Update payout flag (resolve) (admin/manager only)
  app.patch('/api/payouts/:payoutId/flags/:flagId', isAuthenticated, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const { flagId } = req.params;
      const dbUser = (req as any).dbUser;
      
      const updates = req.body;
      
      // If resolving, set resolvedById and resolvedAt
      if (updates.isResolved === true) {
        updates.resolvedById = dbUser.id;
        updates.resolvedAt = new Date();
      }
      
      const updatedFlag = await storage.updatePayoutFlag(flagId, updates);
      if (!updatedFlag) {
        return res.status(404).json({ message: "Flag not found" });
      }
      
      res.json(updatedFlag);
    } catch (error) {
      console.error("Error updating payout flag:", error);
      res.status(500).json({ message: "Failed to update payout flag" });
    }
  });

  // Generate PDF payslip for payout
  app.get('/api/payouts/:id/pdf', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const payout = await storage.getPayoutWithDetails(req.params.id);
      if (!payout) {
        return res.status(404).json({ message: "Payout not found" });
      }
      
      // Access control: admin/manager can see all, tutor can see their own
      if (user.role !== "admin" && user.role !== "manager") {
        if (payout.tutorId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      // Use the enriched data from getPayoutWithDetails
      const lines = payout.lines || [];
      const flags = payout.flags || [];
      
      // Create PDF document
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 50,
        info: {
          Title: `Payslip - ${payout.tutor?.firstName || ''} ${payout.tutor?.lastName || ''}`,
          Author: 'MCEC LMS',
        }
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="payslip-${payout.id.slice(0, 8)}.pdf"`);
      
      // Pipe to response
      doc.pipe(res);
      
      // Helper functions
      const formatCurrency = (amount: string | number, currency: string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        const symbols: Record<string, string> = { ZAR: 'R', USD: '$', GBP: '£' };
        return `${symbols[currency] || currency} ${num.toFixed(2)}`;
      };
      
      const formatDate = (date: Date | string | null) => {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('en-ZA', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      };
      
      const formatMinutes = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
      };
      
      // Document colors
      const primaryColor = '#2563eb';
      const grayColor = '#6b7280';
      const darkColor = '#1f2937';
      const warningColor = '#f59e0b';
      
      // Header
      doc.fontSize(24)
         .fillColor(primaryColor)
         .text('MCEC', 50, 50)
         .fontSize(10)
         .fillColor(grayColor)
         .text('Learning Management System', 50, 78);
      
      // Payslip title
      doc.fontSize(28)
         .fillColor(darkColor)
         .text('PAYSLIP', 400, 50, { align: 'right' });
      
      // Status badge
      const statusColors: Record<string, string> = {
        draft: '#6b7280',
        approved: '#10b981',
        paid: '#2563eb',
        on_hold: '#f59e0b',
      };
      
      doc.fontSize(10)
         .fillColor(statusColors[payout.status] || grayColor)
         .text(payout.status.toUpperCase().replace('_', ' '), 400, 85, { align: 'right' });
      
      // Horizontal line
      doc.moveTo(50, 110)
         .lineTo(545, 110)
         .strokeColor('#e5e7eb')
         .stroke();
      
      // Tutor details section
      doc.fontSize(10)
         .fillColor(grayColor)
         .text('PAYEE', 50, 130);
      
      doc.fontSize(12)
         .fillColor(darkColor)
         .text(`${payout.tutor?.firstName || ''} ${payout.tutor?.lastName || ''}`.trim() || 'Tutor', 50, 148)
         .fontSize(10)
         .fillColor(grayColor)
         .text(payout.tutor?.email || '', 50, 165);
      
      // Right side - Payout details
      doc.fontSize(10)
         .fillColor(grayColor)
         .text('Pay Period:', 350, 130)
         .text('Total Hours:', 350, 148)
         .text('Generated:', 350, 166);
      
      doc.fillColor(darkColor)
         .text(`${formatDate(payout.periodStart)} - ${formatDate(payout.periodEnd)}`, 450, 130, { align: 'right' })
         .text(formatMinutes(payout.totalMinutes), 450, 148, { align: 'right' })
         .text(formatDate(payout.createdAt), 450, 166, { align: 'right' });
      
      // Line Items Table
      const tableTop = 210;
      const tableHeaders = ['Student', 'Course', 'Hours', 'Rate', 'Amount'];
      const colWidths = [120, 140, 50, 70, 70];
      const colPositions = [50, 170, 310, 360, 430];
      
      // Table header background
      doc.rect(50, tableTop - 5, 495, 25)
         .fillColor('#f3f4f6')
         .fill();
      
      // Table headers
      doc.fontSize(9)
         .fillColor(grayColor);
      
      tableHeaders.forEach((header, i) => {
        const align = i < 2 ? 'left' : 'right';
        doc.text(header, colPositions[i], tableTop + 3, { 
          width: colWidths[i], 
          align: align as any
        });
      });
      
      // Table rows
      let yPos = tableTop + 30;
      doc.fontSize(9).fillColor(darkColor);
      
      for (const line of lines) {
        // Use enriched student and course data from getPayoutWithDetails
        const student = (line as any).student;
        const course = (line as any).course;
        
        const studentName = student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() : 'Student';
        const courseName = course?.title || 'Course';
        
        doc.text(studentName, colPositions[0], yPos, { width: colWidths[0] });
        doc.text(courseName, colPositions[1], yPos, { width: colWidths[1] });
        doc.text(formatMinutes(line.minutes), colPositions[2], yPos, { width: colWidths[2], align: 'right' });
        doc.text(formatCurrency(line.hourlyRate, payout.currency), colPositions[3], yPos, { width: colWidths[3], align: 'right' });
        doc.text(formatCurrency(line.amount, payout.currency), colPositions[4], yPos, { width: colWidths[4], align: 'right' });
        
        yPos += 20;
        
        // Add line separator
        doc.moveTo(50, yPos - 5)
           .lineTo(545, yPos - 5)
           .strokeColor('#e5e7eb')
           .stroke();
        
        // Check if we need a new page
        if (yPos > 650) {
          doc.addPage();
          yPos = 50;
        }
      }
      
      // Totals section
      const totalsTop = yPos + 20;
      
      doc.fontSize(10)
         .fillColor(grayColor)
         .text('Gross Amount:', 350, totalsTop, { width: 80 })
         .text('Deductions:', 350, totalsTop + 20, { width: 80 });
      
      doc.fillColor(darkColor)
         .text(formatCurrency(payout.grossAmount, payout.currency), 430, totalsTop, { width: 80, align: 'right' })
         .text(`-${formatCurrency(payout.deductions, payout.currency)}`, 430, totalsTop + 20, { width: 80, align: 'right' });
      
      // Total line
      doc.moveTo(350, totalsTop + 40)
         .lineTo(510, totalsTop + 40)
         .strokeColor('#e5e7eb')
         .stroke();
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(darkColor)
         .text('Net Pay:', 350, totalsTop + 50, { width: 80 })
         .text(formatCurrency(payout.netAmount, payout.currency), 430, totalsTop + 50, { width: 80, align: 'right' });
      
      // Flags/Warnings section (if any)
      if (flags.length > 0) {
        const flagsTop = totalsTop + 90;
        
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor(warningColor)
           .text('Flags/Warnings:', 50, flagsTop);
        
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(darkColor);
        
        let flagYPos = flagsTop + 18;
        for (const flag of flags) {
          const statusText = flag.isResolved ? '[RESOLVED]' : '[PENDING]';
          const statusColor = flag.isResolved ? '#10b981' : warningColor;
          
          doc.fillColor(statusColor)
             .text(statusText, 50, flagYPos, { continued: true })
             .fillColor(darkColor)
             .text(` ${flag.description}`, { width: 450 });
          
          flagYPos += 15;
        }
      }
      
      // Notes section
      if (payout.notes) {
        const notesTop = flags.length > 0 ? totalsTop + 90 + flags.length * 15 + 30 : totalsTop + 90;
        
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(grayColor)
           .text('Notes:', 50, notesTop)
           .fillColor(darkColor)
           .text(payout.notes, 50, notesTop + 18, { width: 300 });
      }
      
      // Approval information
      if (payout.approvedById && payout.approvedAt) {
        const approvalTop = 700;
        doc.fontSize(9)
           .fillColor(grayColor)
           .text(`Approved by: ${payout.approvedBy?.firstName || ''} ${payout.approvedBy?.lastName || ''}`, 50, approvalTop)
           .text(`Approved on: ${formatDate(payout.approvedAt)}`, 50, approvalTop + 12);
      }
      
      // Paid date if applicable
      if (payout.paidAt) {
        const paidTop = payout.approvedById ? 730 : 700;
        doc.fontSize(9)
           .fillColor('#10b981')
           .text(`Paid on: ${formatDate(payout.paidAt)}`, 50, paidTop);
      }
      
      // Footer
      const footerTop = 770;
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(grayColor)
         .text('This is a computer-generated document.', 50, footerTop, { align: 'center', width: 495 })
         .text('MCEC Learning Management System', 50, footerTop + 12, { align: 'center', width: 495 });
      
      // Finalize PDF
      doc.end();
      
    } catch (error) {
      console.error("Error generating payslip PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  return httpServer;
}
