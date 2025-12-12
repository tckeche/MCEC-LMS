// Database storage implementation for MCEC LMS
import {
  users,
  courses,
  enrollments,
  assignments,
  submissions,
  grades,
  announcements,
  parentChildren,
  notifications,
  type User,
  type UpsertUser,
  type Course,
  type InsertCourse,
  type Enrollment,
  type InsertEnrollment,
  type Assignment,
  type InsertAssignment,
  type Submission,
  type InsertSubmission,
  type Grade,
  type InsertGrade,
  type Announcement,
  type InsertAnnouncement,
  type ParentChild,
  type InsertParentChild,
  type Notification,
  type InsertNotification,
  type CourseWithTutor,
  type CourseWithEnrollmentCount,
  type EnrollmentWithDetails,
  type AssignmentWithCourse,
  type SubmissionWithDetails,
  type GradeWithDetails,
  type AnnouncementWithAuthor,
  type ParentChildWithDetails,
  type UserRole,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql, inArray, or } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User management
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: UserRole): Promise<User[]>;
  updateUserRole(id: string, role: UserRole): Promise<User | undefined>;
  updateUserStatus(id: string, isActive: boolean): Promise<User | undefined>;
  
  // Course operations
  getCourse(id: string): Promise<Course | undefined>;
  getCourseWithTutor(id: string): Promise<CourseWithTutor | undefined>;
  getAllCourses(): Promise<CourseWithEnrollmentCount[]>;
  getCoursesByTutor(tutorId: string): Promise<CourseWithEnrollmentCount[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<boolean>;
  
  // Enrollment operations
  getEnrollment(id: string): Promise<Enrollment | undefined>;
  getEnrollmentsByStudent(studentId: string): Promise<EnrollmentWithDetails[]>;
  getEnrollmentsByCourse(courseId: string): Promise<EnrollmentWithDetails[]>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  updateEnrollmentStatus(id: string, status: Enrollment["status"]): Promise<Enrollment | undefined>;
  
  // Assignment operations
  getAssignment(id: string): Promise<Assignment | undefined>;
  getAssignmentsByCourse(courseId: string): Promise<Assignment[]>;
  getAssignmentsForStudent(studentId: string): Promise<AssignmentWithCourse[]>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: string, assignment: Partial<InsertAssignment>): Promise<Assignment | undefined>;
  deleteAssignment(id: string): Promise<boolean>;
  
  // Submission operations
  getSubmission(id: string): Promise<Submission | undefined>;
  getSubmissionsByAssignment(assignmentId: string): Promise<SubmissionWithDetails[]>;
  getSubmissionsByStudent(studentId: string): Promise<SubmissionWithDetails[]>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  updateSubmission(id: string, submission: Partial<InsertSubmission>): Promise<Submission | undefined>;
  
  // Grade operations
  getGrade(id: string): Promise<Grade | undefined>;
  getGradesByStudent(studentId: string): Promise<GradeWithDetails[]>;
  getGradesByTutor(tutorId: string): Promise<GradeWithDetails[]>;
  createGrade(grade: InsertGrade): Promise<Grade>;
  updateGrade(id: string, grade: Partial<InsertGrade>): Promise<Grade | undefined>;
  
  // Announcement operations
  getAnnouncement(id: string): Promise<Announcement | undefined>;
  getAllAnnouncements(): Promise<AnnouncementWithAuthor[]>;
  getAnnouncementsByCourse(courseId: string): Promise<AnnouncementWithAuthor[]>;
  getAnnouncementsForStudent(studentId: string): Promise<AnnouncementWithAuthor[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: string): Promise<boolean>;
  
  // Parent-child operations
  getParentChildren(parentId: string): Promise<ParentChildWithDetails[]>;
  getChildParents(childId: string): Promise<ParentChildWithDetails[]>;
  createParentChild(parentChild: InsertParentChild): Promise<ParentChild>;
  deleteParentChild(id: string): Promise<boolean>;
  
  // Dashboard stats
  getStudentStats(studentId: string): Promise<{
    coursesEnrolled: number;
    pendingAssignments: number;
    averageGrade: number;
  }>;
  getTutorStats(tutorId: string): Promise<{
    coursesTeaching: number;
    totalStudents: number;
    pendingGrading: number;
  }>;
  getManagerStats(): Promise<{
    totalCourses: number;
    totalStudents: number;
    totalTutors: number;
  }>;
  getAdminStats(): Promise<{
    totalUsers: number;
    usersByRole: Record<UserRole, number>;
  }>;
  
  // Notification operations
  getNotificationsByUser(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: string, userId: string): Promise<boolean>;
  
  // Helper to get enrolled students for a course (for notifications)
  getEnrolledStudentIds(courseId: string): Promise<string[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // User management
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role)).orderBy(desc(users.createdAt));
  }

  async updateUserRole(id: string, role: UserRole): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Course operations
  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async getCourseWithTutor(id: string): Promise<CourseWithTutor | undefined> {
    const result = await db
      .select()
      .from(courses)
      .innerJoin(users, eq(courses.tutorId, users.id))
      .where(eq(courses.id, id));
    
    if (result.length === 0) return undefined;
    
    return {
      ...result[0].courses,
      tutor: result[0].users,
    };
  }

  async getAllCourses(): Promise<CourseWithEnrollmentCount[]> {
    const result = await db
      .select({
        course: courses,
        tutor: users,
        enrollmentCount: count(enrollments.id),
      })
      .from(courses)
      .innerJoin(users, eq(courses.tutorId, users.id))
      .leftJoin(enrollments, and(
        eq(enrollments.courseId, courses.id),
        eq(enrollments.status, "active")
      ))
      .groupBy(courses.id, users.id)
      .orderBy(desc(courses.createdAt));
    
    return result.map(r => ({
      ...r.course,
      tutor: r.tutor,
      enrollmentCount: Number(r.enrollmentCount),
    }));
  }

  async getCoursesByTutor(tutorId: string): Promise<CourseWithEnrollmentCount[]> {
    const result = await db
      .select({
        course: courses,
        tutor: users,
        enrollmentCount: count(enrollments.id),
      })
      .from(courses)
      .innerJoin(users, eq(courses.tutorId, users.id))
      .leftJoin(enrollments, and(
        eq(enrollments.courseId, courses.id),
        eq(enrollments.status, "active")
      ))
      .where(eq(courses.tutorId, tutorId))
      .groupBy(courses.id, users.id)
      .orderBy(desc(courses.createdAt));
    
    return result.map(r => ({
      ...r.course,
      tutor: r.tutor,
      enrollmentCount: Number(r.enrollmentCount),
    }));
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db.insert(courses).values(course).returning();
    return newCourse;
  }

  async updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course | undefined> {
    const [updated] = await db
      .update(courses)
      .set({ ...course, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return updated;
  }

  async deleteCourse(id: string): Promise<boolean> {
    const result = await db.delete(courses).where(eq(courses.id, id));
    return true;
  }

  // Enrollment operations
  async getEnrollment(id: string): Promise<Enrollment | undefined> {
    const [enrollment] = await db.select().from(enrollments).where(eq(enrollments.id, id));
    return enrollment;
  }

  async getEnrollmentsByStudent(studentId: string): Promise<EnrollmentWithDetails[]> {
    const result = await db
      .select()
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(eq(enrollments.studentId, studentId))
      .orderBy(desc(enrollments.enrolledAt));
    
    return result.map(r => ({
      ...r.enrollments,
      course: r.courses,
      student: r.users,
    }));
  }

  async getEnrollmentsByCourse(courseId: string): Promise<EnrollmentWithDetails[]> {
    const result = await db
      .select()
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(eq(enrollments.courseId, courseId))
      .orderBy(desc(enrollments.enrolledAt));
    
    return result.map(r => ({
      ...r.enrollments,
      course: r.courses,
      student: r.users,
    }));
  }

  async createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment> {
    const [newEnrollment] = await db.insert(enrollments).values(enrollment).returning();
    return newEnrollment;
  }

  async updateEnrollmentStatus(id: string, status: Enrollment["status"]): Promise<Enrollment | undefined> {
    const [updated] = await db
      .update(enrollments)
      .set({ 
        status, 
        completedAt: status === "completed" ? new Date() : null 
      })
      .where(eq(enrollments.id, id))
      .returning();
    return updated;
  }

  // Assignment operations
  async getAssignment(id: string): Promise<Assignment | undefined> {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    return assignment;
  }

  async getAssignmentsByCourse(courseId: string): Promise<Assignment[]> {
    return db
      .select()
      .from(assignments)
      .where(eq(assignments.courseId, courseId))
      .orderBy(desc(assignments.dueDate));
  }

  async getAssignmentsForStudent(studentId: string): Promise<AssignmentWithCourse[]> {
    const studentEnrollments = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, "active")
      ));
    
    if (studentEnrollments.length === 0) return [];
    
    const courseIds = studentEnrollments.map(e => e.courseId);
    
    const result = await db
      .select()
      .from(assignments)
      .innerJoin(courses, eq(assignments.courseId, courses.id))
      .where(and(
        inArray(assignments.courseId, courseIds),
        eq(assignments.status, "published")
      ))
      .orderBy(desc(assignments.dueDate));
    
    return result.map(r => ({
      ...r.assignments,
      course: r.courses,
    }));
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [newAssignment] = await db.insert(assignments).values(assignment).returning();
    return newAssignment;
  }

  async updateAssignment(id: string, assignment: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const [updated] = await db
      .update(assignments)
      .set({ ...assignment, updatedAt: new Date() })
      .where(eq(assignments.id, id))
      .returning();
    return updated;
  }

  async deleteAssignment(id: string): Promise<boolean> {
    await db.delete(assignments).where(eq(assignments.id, id));
    return true;
  }

  // Submission operations
  async getSubmission(id: string): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
    return submission;
  }

  async getSubmissionsByAssignment(assignmentId: string): Promise<SubmissionWithDetails[]> {
    const result = await db
      .select()
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .innerJoin(users, eq(submissions.studentId, users.id))
      .leftJoin(grades, eq(grades.submissionId, submissions.id))
      .where(eq(submissions.assignmentId, assignmentId))
      .orderBy(desc(submissions.submittedAt));
    
    return result.map(r => ({
      ...r.submissions,
      assignment: r.assignments,
      student: r.users,
      grade: r.grades || undefined,
    }));
  }

  async getSubmissionsByStudent(studentId: string): Promise<SubmissionWithDetails[]> {
    const result = await db
      .select()
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .innerJoin(users, eq(submissions.studentId, users.id))
      .leftJoin(grades, eq(grades.submissionId, submissions.id))
      .where(eq(submissions.studentId, studentId))
      .orderBy(desc(submissions.submittedAt));
    
    return result.map(r => ({
      ...r.submissions,
      assignment: r.assignments,
      student: r.users,
      grade: r.grades || undefined,
    }));
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const [newSubmission] = await db.insert(submissions).values({
      ...submission,
      submittedAt: new Date(),
      status: "submitted",
    }).returning();
    return newSubmission;
  }

  async updateSubmission(id: string, submission: Partial<InsertSubmission>): Promise<Submission | undefined> {
    const [updated] = await db
      .update(submissions)
      .set({ ...submission, updatedAt: new Date() })
      .where(eq(submissions.id, id))
      .returning();
    return updated;
  }

  // Grade operations
  async getGrade(id: string): Promise<Grade | undefined> {
    const [grade] = await db.select().from(grades).where(eq(grades.id, id));
    return grade;
  }

  async getGradesByStudent(studentId: string): Promise<GradeWithDetails[]> {
    const result = await db
      .select()
      .from(grades)
      .innerJoin(submissions, eq(grades.submissionId, submissions.id))
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .innerJoin(users, eq(submissions.studentId, users.id))
      .where(eq(submissions.studentId, studentId))
      .orderBy(desc(grades.gradedAt));
    
    return result.map(r => ({
      ...r.grades,
      submission: {
        ...r.submissions,
        assignment: r.assignments,
        student: r.users,
      },
    }));
  }

  async getGradesByTutor(tutorId: string): Promise<GradeWithDetails[]> {
    const result = await db
      .select()
      .from(grades)
      .innerJoin(submissions, eq(grades.submissionId, submissions.id))
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .innerJoin(users, eq(submissions.studentId, users.id))
      .where(eq(grades.gradedById, tutorId))
      .orderBy(desc(grades.gradedAt));
    
    return result.map(r => ({
      ...r.grades,
      submission: {
        ...r.submissions,
        assignment: r.assignments,
        student: r.users,
      },
    }));
  }

  async createGrade(grade: InsertGrade): Promise<Grade> {
    const [newGrade] = await db.insert(grades).values(grade).returning();
    
    // Update submission status to graded
    await db
      .update(submissions)
      .set({ status: "graded", updatedAt: new Date() })
      .where(eq(submissions.id, grade.submissionId));
    
    return newGrade;
  }

  async updateGrade(id: string, grade: Partial<InsertGrade>): Promise<Grade | undefined> {
    const [updated] = await db
      .update(grades)
      .set({ ...grade, gradedAt: new Date() })
      .where(eq(grades.id, id))
      .returning();
    return updated;
  }

  // Announcement operations
  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    const [announcement] = await db.select().from(announcements).where(eq(announcements.id, id));
    return announcement;
  }

  async getAllAnnouncements(): Promise<AnnouncementWithAuthor[]> {
    const result = await db
      .select()
      .from(announcements)
      .innerJoin(users, eq(announcements.authorId, users.id))
      .leftJoin(courses, eq(announcements.courseId, courses.id))
      .orderBy(desc(announcements.createdAt));
    
    return result.map(r => ({
      ...r.announcements,
      author: r.users,
      course: r.courses || undefined,
    }));
  }

  async getAnnouncementsByCourse(courseId: string): Promise<AnnouncementWithAuthor[]> {
    const result = await db
      .select()
      .from(announcements)
      .innerJoin(users, eq(announcements.authorId, users.id))
      .leftJoin(courses, eq(announcements.courseId, courses.id))
      .where(eq(announcements.courseId, courseId))
      .orderBy(desc(announcements.createdAt));
    
    return result.map(r => ({
      ...r.announcements,
      author: r.users,
      course: r.courses || undefined,
    }));
  }

  async getAnnouncementsForStudent(studentId: string): Promise<AnnouncementWithAuthor[]> {
    // Get student's enrolled course IDs
    const studentEnrollments = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, "active")
      ));
    
    const courseIds = studentEnrollments.map(e => e.courseId);
    
    // Get global announcements and course-specific announcements
    const result = await db
      .select()
      .from(announcements)
      .innerJoin(users, eq(announcements.authorId, users.id))
      .leftJoin(courses, eq(announcements.courseId, courses.id))
      .where(or(
        eq(announcements.isGlobal, true),
        courseIds.length > 0 ? inArray(announcements.courseId, courseIds) : sql`false`
      ))
      .orderBy(desc(announcements.createdAt));
    
    return result.map(r => ({
      ...r.announcements,
      author: r.users,
      course: r.courses || undefined,
    }));
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db.insert(announcements).values(announcement).returning();
    return newAnnouncement;
  }

  async updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement | undefined> {
    const [updated] = await db
      .update(announcements)
      .set({ ...announcement, updatedAt: new Date() })
      .where(eq(announcements.id, id))
      .returning();
    return updated;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    await db.delete(announcements).where(eq(announcements.id, id));
    return true;
  }

  // Parent-child operations
  async getParentChildren(parentId: string): Promise<ParentChildWithDetails[]> {
    const result = await db
      .select()
      .from(parentChildren)
      .innerJoin(users, eq(parentChildren.childId, users.id))
      .where(eq(parentChildren.parentId, parentId));
    
    // Get parent user separately
    const [parent] = await db.select().from(users).where(eq(users.id, parentId));
    
    return result.map(r => ({
      ...r.parent_children,
      parent,
      child: r.users,
    }));
  }

  async getChildParents(childId: string): Promise<ParentChildWithDetails[]> {
    const result = await db
      .select()
      .from(parentChildren)
      .innerJoin(users, eq(parentChildren.parentId, users.id))
      .where(eq(parentChildren.childId, childId));
    
    // Get child user separately
    const [child] = await db.select().from(users).where(eq(users.id, childId));
    
    return result.map(r => ({
      ...r.parent_children,
      parent: r.users,
      child,
    }));
  }

  async createParentChild(parentChild: InsertParentChild): Promise<ParentChild> {
    const [newRelation] = await db.insert(parentChildren).values(parentChild).returning();
    return newRelation;
  }

  async deleteParentChild(id: string): Promise<boolean> {
    await db.delete(parentChildren).where(eq(parentChildren.id, id));
    return true;
  }

  // Dashboard stats
  async getStudentStats(studentId: string): Promise<{
    coursesEnrolled: number;
    pendingAssignments: number;
    averageGrade: number;
  }> {
    // Count enrolled courses
    const [enrollmentCount] = await db
      .select({ count: count() })
      .from(enrollments)
      .where(and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, "active")
      ));
    
    // Get student's course IDs
    const studentEnrollments = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, "active")
      ));
    
    const courseIds = studentEnrollments.map(e => e.courseId);
    
    // Count pending assignments (published assignments without a submission from this student)
    let pendingCount = 0;
    if (courseIds.length > 0) {
      const allAssignments = await db
        .select({ id: assignments.id })
        .from(assignments)
        .where(and(
          inArray(assignments.courseId, courseIds),
          eq(assignments.status, "published")
        ));
      
      const submittedAssignments = await db
        .select({ assignmentId: submissions.assignmentId })
        .from(submissions)
        .where(eq(submissions.studentId, studentId));
      
      const submittedIds = new Set(submittedAssignments.map(s => s.assignmentId));
      pendingCount = allAssignments.filter(a => !submittedIds.has(a.id)).length;
    }
    
    // Calculate average grade
    const studentGrades = await db
      .select({ points: grades.points })
      .from(grades)
      .innerJoin(submissions, eq(grades.submissionId, submissions.id))
      .where(eq(submissions.studentId, studentId));
    
    const averageGrade = studentGrades.length > 0
      ? studentGrades.reduce((sum, g) => sum + parseFloat(g.points), 0) / studentGrades.length
      : 0;
    
    return {
      coursesEnrolled: Number(enrollmentCount?.count || 0),
      pendingAssignments: pendingCount,
      averageGrade: Math.round(averageGrade * 10) / 10,
    };
  }

  async getTutorStats(tutorId: string): Promise<{
    coursesTeaching: number;
    totalStudents: number;
    pendingGrading: number;
  }> {
    // Count courses taught
    const [courseCount] = await db
      .select({ count: count() })
      .from(courses)
      .where(eq(courses.tutorId, tutorId));
    
    // Get tutor's course IDs
    const tutorCourses = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.tutorId, tutorId));
    
    const courseIds = tutorCourses.map(c => c.id);
    
    // Count unique students enrolled
    let studentCount = 0;
    if (courseIds.length > 0) {
      const [result] = await db
        .select({ count: sql<number>`count(distinct ${enrollments.studentId})` })
        .from(enrollments)
        .where(and(
          inArray(enrollments.courseId, courseIds),
          eq(enrollments.status, "active")
        ));
      studentCount = Number(result?.count || 0);
    }
    
    // Count pending grading (submissions without grades)
    let pendingGrading = 0;
    if (courseIds.length > 0) {
      const assignmentIds = await db
        .select({ id: assignments.id })
        .from(assignments)
        .where(inArray(assignments.courseId, courseIds));
      
      if (assignmentIds.length > 0) {
        const [result] = await db
          .select({ count: count() })
          .from(submissions)
          .leftJoin(grades, eq(grades.submissionId, submissions.id))
          .where(and(
            inArray(submissions.assignmentId, assignmentIds.map(a => a.id)),
            eq(submissions.status, "submitted"),
            sql`${grades.id} IS NULL`
          ));
        pendingGrading = Number(result?.count || 0);
      }
    }
    
    return {
      coursesTeaching: Number(courseCount?.count || 0),
      totalStudents: studentCount,
      pendingGrading,
    };
  }

  async getManagerStats(): Promise<{
    totalCourses: number;
    totalStudents: number;
    totalTutors: number;
  }> {
    const [courseCount] = await db.select({ count: count() }).from(courses);
    const [studentCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "student"));
    const [tutorCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "tutor"));
    
    return {
      totalCourses: Number(courseCount?.count || 0),
      totalStudents: Number(studentCount?.count || 0),
      totalTutors: Number(tutorCount?.count || 0),
    };
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    usersByRole: Record<UserRole, number>;
  }> {
    const [totalCount] = await db.select({ count: count() }).from(users);
    
    const roleCounts = await db
      .select({ role: users.role, count: count() })
      .from(users)
      .groupBy(users.role);
    
    const usersByRole: Record<UserRole, number> = {
      student: 0,
      parent: 0,
      tutor: 0,
      manager: 0,
      admin: 0,
    };
    
    for (const rc of roleCounts) {
      usersByRole[rc.role as UserRole] = Number(rc.count);
    }
    
    return {
      totalUsers: Number(totalCount?.count || 0),
      usersByRole,
    };
  }

  // Notification operations
  async getNotificationsByUser(userId: string, limit: number = 50): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    return Number(result?.count || 0);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return updated;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getEnrolledStudentIds(courseId: string): Promise<string[]> {
    const result = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(and(
        eq(enrollments.courseId, courseId),
        eq(enrollments.status, "active")
      ));
    return result.map(r => r.studentId);
  }
}

export const storage = new DatabaseStorage();
