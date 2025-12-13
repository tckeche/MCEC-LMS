import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  pgEnum,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "student",
  "parent",
  "tutor",
  "manager",
  "admin",
]);

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "draft",
  "published",
  "closed",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "pending",
  "submitted",
  "graded",
  "late",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "active",
  "completed",
  "dropped",
  "pending",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "grade_posted",
  "assignment_due",
  "announcement",
  "enrollment",
  "submission",
  "system",
]);

// Scheduling system enums
export const proposalStatusEnum = pgEnum("proposal_status", [
  "pending",
  "approved",
  "rejected",
]);

export const tutoringSessionStatusEnum = pgEnum("tutoring_session_status", [
  "scheduled",
  "in_progress",
  "completed",
  "missed",
  "postponed",
  "cancelled",
]);

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default("student").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Parent-Child relationship
export const parentChildren = pgTable("parent_children", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  childId: varchar("child_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  syllabus: text("syllabus"),
  tutorId: varchar("tutor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true).notNull(),
  maxEnrollment: integer("max_enrollment").default(30),
  imageUrl: varchar("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enrollments table
export const enrollments = pgTable("enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: varchar("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  status: enrollmentStatusEnum("status").default("active").notNull(),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Assignments table
export const assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  instructions: text("instructions"),
  dueDate: timestamp("due_date"),
  pointsPossible: integer("points_possible").default(100).notNull(),
  status: assignmentStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Submissions table
export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id")
    .notNull()
    .references(() => assignments.id, { onDelete: "cascade" }),
  studentId: varchar("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content"),
  fileUrl: varchar("file_url"),
  status: submissionStatusEnum("status").default("pending").notNull(),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Grades table
export const grades = pgTable("grades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  points: decimal("points", { precision: 5, scale: 2 }).notNull(),
  feedback: text("feedback"),
  gradedById: varchar("graded_by_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  gradedAt: timestamp("graded_at").defaultNow(),
});

// Announcements table
export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").references(() => courses.id, {
    onDelete: "cascade",
  }),
  authorId: varchar("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  isGlobal: boolean("is_global").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link"),
  isRead: boolean("is_read").default(false).notNull(),
  relatedId: varchar("related_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// SCHEDULING SYSTEM TABLES
// ==========================================

// Tutor Availability (weekly recurring slots)
export const tutorAvailability = pgTable("tutor_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tutorId: varchar("tutor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Session Proposals (student requests awaiting tutor approval)
export const sessionProposals = pgTable("session_proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tutorId: varchar("tutor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: varchar("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  proposedStartTime: timestamp("proposed_start_time").notNull(),
  proposedEndTime: timestamp("proposed_end_time").notNull(),
  status: proposalStatusEnum("status").default("pending").notNull(),
  studentMessage: text("student_message"),
  tutorResponse: text("tutor_response"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tutoring Sessions (confirmed/scheduled sessions)
export const tutoringSessions = pgTable("tutoring_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tutorId: varchar("tutor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: varchar("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  scheduledStartTime: timestamp("scheduled_start_time").notNull(),
  scheduledEndTime: timestamp("scheduled_end_time").notNull(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  studentJoinTime: timestamp("student_join_time"),
  tutorJoinTime: timestamp("tutor_join_time"),
  status: tutoringSessionStatusEnum("status").default("scheduled").notNull(),
  tutorLate: boolean("tutor_late").default(false).notNull(),
  billableDuration: integer("billable_duration"),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  recurrenceGroupId: varchar("recurrence_group_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Hour Wallets (purchased hours per student-course)
export const hourWallets = pgTable("hour_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: varchar("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  purchasedMinutes: integer("purchased_minutes").default(0).notNull(),
  consumedMinutes: integer("consumed_minutes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  courses: many(courses),
  enrollments: many(enrollments),
  submissions: many(submissions),
  grades: many(grades),
  announcements: many(announcements),
  notifications: many(notifications),
  parentOf: many(parentChildren, { relationName: "parent" }),
  childOf: many(parentChildren, { relationName: "child" }),
}));

export const parentChildrenRelations = relations(parentChildren, ({ one }) => ({
  parent: one(users, {
    fields: [parentChildren.parentId],
    references: [users.id],
    relationName: "parent",
  }),
  child: one(users, {
    fields: [parentChildren.childId],
    references: [users.id],
    relationName: "child",
  }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  tutor: one(users, {
    fields: [courses.tutorId],
    references: [users.id],
  }),
  enrollments: many(enrollments),
  assignments: many(assignments),
  announcements: many(announcements),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(users, {
    fields: [enrollments.studentId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  course: one(courses, {
    fields: [assignments.courseId],
    references: [courses.id],
  }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
  student: one(users, {
    fields: [submissions.studentId],
    references: [users.id],
  }),
  grade: one(grades),
}));

export const gradesRelations = relations(grades, ({ one }) => ({
  submission: one(submissions, {
    fields: [grades.submissionId],
    references: [submissions.id],
  }),
  gradedBy: one(users, {
    fields: [grades.gradedById],
    references: [users.id],
  }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  course: one(courses, {
    fields: [announcements.courseId],
    references: [courses.id],
  }),
  author: one(users, {
    fields: [announcements.authorId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Scheduling system relations
export const tutorAvailabilityRelations = relations(tutorAvailability, ({ one }) => ({
  tutor: one(users, {
    fields: [tutorAvailability.tutorId],
    references: [users.id],
  }),
}));

export const sessionProposalsRelations = relations(sessionProposals, ({ one }) => ({
  student: one(users, {
    fields: [sessionProposals.studentId],
    references: [users.id],
    relationName: "proposalStudent",
  }),
  tutor: one(users, {
    fields: [sessionProposals.tutorId],
    references: [users.id],
    relationName: "proposalTutor",
  }),
  course: one(courses, {
    fields: [sessionProposals.courseId],
    references: [courses.id],
  }),
}));

export const tutoringSessionsRelations = relations(tutoringSessions, ({ one }) => ({
  student: one(users, {
    fields: [tutoringSessions.studentId],
    references: [users.id],
    relationName: "sessionStudent",
  }),
  tutor: one(users, {
    fields: [tutoringSessions.tutorId],
    references: [users.id],
    relationName: "sessionTutor",
  }),
  course: one(courses, {
    fields: [tutoringSessions.courseId],
    references: [courses.id],
  }),
}));

export const hourWalletsRelations = relations(hourWallets, ({ one }) => ({
  student: one(users, {
    fields: [hourWallets.studentId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [hourWallets.courseId],
    references: [courses.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
  id: true,
  enrolledAt: true,
  completedAt: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGradeSchema = createInsertSchema(grades).omit({
  id: true,
  gradedAt: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertParentChildSchema = createInsertSchema(parentChildren).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Scheduling system insert schemas
export const insertTutorAvailabilitySchema = createInsertSchema(tutorAvailability).omit({
  id: true,
  createdAt: true,
});

export const insertSessionProposalSchema = createInsertSchema(sessionProposals).omit({
  id: true,
  createdAt: true,
});

export const insertTutoringSessionSchema = createInsertSchema(tutoringSessions).omit({
  id: true,
  createdAt: true,
});

export const insertHourWalletSchema = createInsertSchema(hourWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type Enrollment = typeof enrollments.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;

export type Grade = typeof grades.$inferSelect;
export type InsertGrade = z.infer<typeof insertGradeSchema>;

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

export type ParentChild = typeof parentChildren.$inferSelect;
export type InsertParentChild = z.infer<typeof insertParentChildSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type NotificationType = "grade_posted" | "assignment_due" | "announcement" | "enrollment" | "submission" | "system";

// Extended types for frontend use
export type CourseWithTutor = Course & {
  tutor: User;
};

export type CourseWithEnrollmentCount = Course & {
  tutor: User;
  enrollmentCount: number;
};

export type EnrollmentWithDetails = Enrollment & {
  course: Course;
  student: User;
};

export type AssignmentWithCourse = Assignment & {
  course: Course;
};

export type SubmissionWithDetails = Submission & {
  assignment: Assignment;
  student: User;
  grade?: Grade;
};

export type GradeWithDetails = Grade & {
  submission: Submission & {
    assignment: Assignment;
    student: User;
  };
};

export type AnnouncementWithAuthor = Announcement & {
  author: User;
  course?: Course;
};

export type ParentChildWithDetails = ParentChild & {
  parent: User;
  child: User;
};

// User role type for type safety
export type UserRole = "student" | "parent" | "tutor" | "manager" | "admin";

// Scheduling system types
export type TutorAvailability = typeof tutorAvailability.$inferSelect;
export type InsertTutorAvailability = z.infer<typeof insertTutorAvailabilitySchema>;

export type SessionProposal = typeof sessionProposals.$inferSelect;
export type InsertSessionProposal = z.infer<typeof insertSessionProposalSchema>;

export type TutoringSession = typeof tutoringSessions.$inferSelect;
export type InsertTutoringSession = z.infer<typeof insertTutoringSessionSchema>;

export type HourWallet = typeof hourWallets.$inferSelect;
export type InsertHourWallet = z.infer<typeof insertHourWalletSchema>;

export type ProposalStatus = "pending" | "approved" | "rejected";
export type TutoringSessionStatus = "scheduled" | "in_progress" | "completed" | "missed" | "postponed" | "cancelled";

// Extended types for scheduling
export type SessionProposalWithDetails = SessionProposal & {
  student: User;
  tutor: User;
  course: Course;
};

export type TutoringSessionWithDetails = TutoringSession & {
  student: User;
  tutor: User;
  course: Course;
};

export type HourWalletWithDetails = HourWallet & {
  student: User;
  course: Course;
};
