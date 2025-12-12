// API routes for MCEC LMS
import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertCourseSchema,
  insertEnrollmentSchema,
  insertAssignmentSchema,
  insertSubmissionSchema,
  insertGradeSchema,
  insertAnnouncementSchema,
  insertParentChildSchema,
  type UserRole,
} from "@shared/schema";
import { z } from "zod";

// Extend Express.User to include our claims
declare global {
  namespace Express {
    interface User {
      claims: {
        sub: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        profile_image_url?: string;
      };
      access_token: string;
      refresh_token: string;
      expires_at: number;
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
    if (!user || !roles.includes(user.role as UserRole)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }
    
    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }
    
    // Attach user to request for ownership checks
    (req as any).dbUser = user;
    
    next();
  };
};

// Zod schemas for PATCH validation (allowing partial updates with safe fields only)
const updateCourseSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  syllabus: z.string().optional(),
  isActive: z.boolean().optional(),
  maxEnrollment: z.number().int().positive().optional(),
  imageUrl: z.string().optional(),
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
    try {
      const validated = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(validated);
      res.status(201).json(course);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Failed to create course" });
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

  // Create enrollment
  app.post('/api/enrollments', isAuthenticated, requireRole("admin", "manager", "tutor"), async (req: Request, res: Response) => {
    try {
      const validated = insertEnrollmentSchema.parse(req.body);
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
  // DASHBOARD STATS ROUTES
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

  return httpServer;
}
