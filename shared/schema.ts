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

// Financial system enums
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "awaiting_payment",
  "paid",
  "overdue",
  "disputed",
  "verified",
]);

export const currencyCodeEnum = pgEnum("currency_code", [
  "ZAR",
  "USD",
  "GBP",
]);

export const paymentVerificationStatusEnum = pgEnum("payment_verification_status", [
  "pending",
  "verified",
  "rejected",
]);

export const walletStatusEnum = pgEnum("wallet_status", [
  "active",
  "depleted",
  "expired",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "draft",
  "approved",
  "paid",
  "on_hold",
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

// Authentication and user status enums
export const userStatusEnum = pgEnum("user_status", [
  "active",
  "pending",
  "rejected",
  "suspended",
]);

export const authProviderEnum = pgEnum("auth_provider", [
  "replit",
  "microsoft",
  "phone_otp",
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
  status: userStatusEnum("status").default("active").notNull(),
  authProvider: authProviderEnum("auth_provider").default("replit"),
  proposedRole: userRoleEnum("proposed_role"),
  pendingNotes: text("pending_notes"),
  phoneNumber: varchar("phone_number"),
  adminLevel: integer("admin_level").default(1),
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit Logs table (for tracking Super Admin actions)
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  performedById: varchar("performed_by_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetUserId: varchar("target_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Staff Role Requests (for tracking approval workflow)
export const staffRoleRequests = pgTable("staff_role_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  proposedRole: userRoleEnum("proposed_role").notNull(),
  notes: text("notes"),
  status: proposalStatusEnum("status").default("pending").notNull(),
  reviewedById: varchar("reviewed_by_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
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
  teamsMeetingLink: text("teams_meeting_link"),
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
  proposalId: varchar("proposal_id").references(() => sessionProposals.id),
  studentId: varchar("student_id")
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
  scheduledMinutes: integer("scheduled_minutes"),
  reservedMinutes: integer("reserved_minutes").default(0),
  billableMinutes: integer("billable_minutes"),
  isGroupSession: boolean("is_group_session").default(false).notNull(),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  recurrenceGroupId: varchar("recurrence_group_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Session Attendance (for group sessions - tracks per-student attendance)
export const sessionAttendance = pgTable("session_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id")
    .notNull()
    .references(() => tutoringSessions.id, { onDelete: "cascade" }),
  studentId: varchar("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  joinTime: timestamp("join_time"),
  leaveTime: timestamp("leave_time"),
  attended: boolean("attended").default(false).notNull(),
  reservedMinutes: integer("reserved_minutes").default(0),
  consumedMinutes: integer("consumed_minutes").default(0),
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
  status: walletStatusEnum("status").default("active").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==========================================
// FINANCIAL SYSTEM TABLES
// ==========================================

// Invoice sequence for generating INV001223 style numbers
export const invoiceSequence = pgTable("invoice_sequence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  yearMonth: varchar("year_month", { length: 4 }).notNull().unique(),
  lastSequence: integer("last_sequence").default(0).notNull(),
});

// Invoices (monthly per student, billed to parent)
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number", { length: 20 }).notNull().unique(),
  parentId: varchar("parent_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  studentId: varchar("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  billingPeriodStart: timestamp("billing_period_start").notNull(),
  billingPeriodEnd: timestamp("billing_period_end").notNull(),
  currency: currencyCodeEnum("currency").default("ZAR").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0").notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default("0").notNull(),
  amountOutstanding: decimal("amount_outstanding", { precision: 10, scale: 2 }).default("0").notNull(),
  status: invoiceStatusEnum("status").default("draft").notNull(),
  dueDate: timestamp("due_date"),
  pdfUrl: varchar("pdf_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoice Line Items (one per subject/course)
export const invoiceLineItems = pgTable("invoice_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  courseId: varchar("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 255 }).notNull(),
  hours: decimal("hours", { precision: 6, scale: 2 }).notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  minutesToAdd: integer("minutes_to_add").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoice Payments (proof of payment uploads)
export const invoicePayments = pgTable("invoice_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: currencyCodeEnum("currency").default("ZAR").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentReference: varchar("payment_reference", { length: 100 }),
  proofAssetUrl: varchar("proof_asset_url"),
  verificationStatus: paymentVerificationStatusEnum("verification_status").default("pending").notNull(),
  verifiedById: varchar("verified_by_id").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  rejectionReason: text("rejection_reason"),
  receivedAt: timestamp("received_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wallet Transactions (audit log for wallet changes)
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id")
    .notNull()
    .references(() => hourWallets.id, { onDelete: "cascade" }),
  invoiceId: varchar("invoice_id").references(() => invoices.id),
  minutesDelta: integer("minutes_delta").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  performedById: varchar("performed_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// PAYROLL SYSTEM TABLES
// ==========================================

// Payouts (monthly payslips for tutors)
export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tutorId: varchar("tutor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  currency: currencyCodeEnum("currency").default("ZAR").notNull(),
  totalMinutes: integer("total_minutes").default(0).notNull(),
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  deductions: decimal("deductions", { precision: 10, scale: 2 }).default("0").notNull(),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  status: payoutStatusEnum("status").default("draft").notNull(),
  pdfUrl: varchar("pdf_url"),
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payout Line Items (breakdown per student and course)
export const payoutLines = pgTable("payout_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  payoutId: varchar("payout_id")
    .notNull()
    .references(() => payouts.id, { onDelete: "cascade" }),
  studentId: varchar("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: varchar("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").references(() => tutoringSessions.id),
  minutes: integer("minutes").notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payout Flags (warnings when tutor paid for unpaid parent invoices)
export const payoutFlags = pgTable("payout_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  payoutId: varchar("payout_id")
    .notNull()
    .references(() => payouts.id, { onDelete: "cascade" }),
  invoiceId: varchar("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  flagType: varchar("flag_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  isResolved: boolean("is_resolved").default(false).notNull(),
  resolvedById: varchar("resolved_by_id").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
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

export const sessionAttendanceRelations = relations(sessionAttendance, ({ one }) => ({
  session: one(tutoringSessions, {
    fields: [sessionAttendance.sessionId],
    references: [tutoringSessions.id],
  }),
  student: one(users, {
    fields: [sessionAttendance.studentId],
    references: [users.id],
  }),
}));

// Financial system relations
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  parent: one(users, {
    fields: [invoices.parentId],
    references: [users.id],
    relationName: "invoiceParent",
  }),
  student: one(users, {
    fields: [invoices.studentId],
    references: [users.id],
    relationName: "invoiceStudent",
  }),
  lineItems: many(invoiceLineItems),
  payments: many(invoicePayments),
}));

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLineItems.invoiceId],
    references: [invoices.id],
  }),
  course: one(courses, {
    fields: [invoiceLineItems.courseId],
    references: [courses.id],
  }),
}));

export const invoicePaymentsRelations = relations(invoicePayments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoicePayments.invoiceId],
    references: [invoices.id],
  }),
  verifiedBy: one(users, {
    fields: [invoicePayments.verifiedById],
    references: [users.id],
  }),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(hourWallets, {
    fields: [walletTransactions.walletId],
    references: [hourWallets.id],
  }),
  invoice: one(invoices, {
    fields: [walletTransactions.invoiceId],
    references: [invoices.id],
  }),
  performedBy: one(users, {
    fields: [walletTransactions.performedById],
    references: [users.id],
  }),
}));

// Payroll system relations
export const payoutsRelations = relations(payouts, ({ one, many }) => ({
  tutor: one(users, {
    fields: [payouts.tutorId],
    references: [users.id],
    relationName: "payoutTutor",
  }),
  approvedBy: one(users, {
    fields: [payouts.approvedById],
    references: [users.id],
    relationName: "payoutApprover",
  }),
  lines: many(payoutLines),
  flags: many(payoutFlags),
}));

export const payoutLinesRelations = relations(payoutLines, ({ one }) => ({
  payout: one(payouts, {
    fields: [payoutLines.payoutId],
    references: [payouts.id],
  }),
  student: one(users, {
    fields: [payoutLines.studentId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [payoutLines.courseId],
    references: [courses.id],
  }),
  session: one(tutoringSessions, {
    fields: [payoutLines.sessionId],
    references: [tutoringSessions.id],
  }),
}));

export const payoutFlagsRelations = relations(payoutFlags, ({ one }) => ({
  payout: one(payouts, {
    fields: [payoutFlags.payoutId],
    references: [payouts.id],
  }),
  invoice: one(invoices, {
    fields: [payoutFlags.invoiceId],
    references: [invoices.id],
  }),
  resolvedBy: one(users, {
    fields: [payoutFlags.resolvedById],
    references: [users.id],
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

export const insertSessionAttendanceSchema = createInsertSchema(sessionAttendance).omit({
  id: true,
  createdAt: true,
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
export type UserStatus = "active" | "pending" | "rejected" | "suspended";
export type AuthProvider = "replit" | "microsoft" | "phone_otp";

// Staff Role Request types
export const insertStaffRoleRequestSchema = createInsertSchema(staffRoleRequests).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export type StaffRoleRequest = typeof staffRoleRequests.$inferSelect;
export type InsertStaffRoleRequest = z.infer<typeof insertStaffRoleRequestSchema>;

export type StaffRoleRequestWithDetails = StaffRoleRequest & {
  user: User;
  reviewedBy?: User;
};

// Audit Log types
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type AuditLogWithDetails = AuditLog & {
  performedBy: User;
  targetUser?: User;
};

// Scheduling system types
export type TutorAvailability = typeof tutorAvailability.$inferSelect;
export type InsertTutorAvailability = z.infer<typeof insertTutorAvailabilitySchema>;

export type SessionProposal = typeof sessionProposals.$inferSelect;
export type InsertSessionProposal = z.infer<typeof insertSessionProposalSchema>;

export type TutoringSession = typeof tutoringSessions.$inferSelect;
export type InsertTutoringSession = z.infer<typeof insertTutoringSessionSchema>;

export type HourWallet = typeof hourWallets.$inferSelect;
export type InsertHourWallet = z.infer<typeof insertHourWalletSchema>;

export type SessionAttendance = typeof sessionAttendance.$inferSelect;
export type InsertSessionAttendance = z.infer<typeof insertSessionAttendanceSchema>;

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

// Financial system insert schemas
export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).omit({
  id: true,
  createdAt: true,
});

export const insertInvoicePaymentSchema = createInsertSchema(invoicePayments).omit({
  id: true,
  createdAt: true,
  receivedAt: true,
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
});

// Financial system types
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;

export type InvoicePayment = typeof invoicePayments.$inferSelect;
export type InsertInvoicePayment = z.infer<typeof insertInvoicePaymentSchema>;

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;

export type InvoiceStatus = "draft" | "awaiting_payment" | "paid" | "overdue" | "disputed" | "verified";
export type CurrencyCode = "ZAR" | "USD" | "GBP";
export type PaymentVerificationStatus = "pending" | "verified" | "rejected";
export type WalletStatus = "active" | "depleted" | "expired";
export type PayoutStatus = "draft" | "approved" | "paid" | "on_hold";

// Extended types for financial system
export type InvoiceWithDetails = Invoice & {
  parent: User;
  student: User;
  lineItems: (InvoiceLineItem & { course: Course })[];
  payments: InvoicePayment[];
};

export type InvoiceLineItemWithCourse = InvoiceLineItem & {
  course: Course;
};

export type InvoicePaymentWithDetails = InvoicePayment & {
  invoice: Invoice;
  verifiedBy?: User;
};

// Payroll system insert schemas
export const insertPayoutSchema = createInsertSchema(payouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPayoutLineSchema = createInsertSchema(payoutLines).omit({
  id: true,
  createdAt: true,
});

export const insertPayoutFlagSchema = createInsertSchema(payoutFlags).omit({
  id: true,
  createdAt: true,
});

// Payroll system types
export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;

export type PayoutLine = typeof payoutLines.$inferSelect;
export type InsertPayoutLine = z.infer<typeof insertPayoutLineSchema>;

export type PayoutFlag = typeof payoutFlags.$inferSelect;
export type InsertPayoutFlag = z.infer<typeof insertPayoutFlagSchema>;

// Extended types for payroll
export type PayoutWithDetails = Payout & {
  tutor: User;
  approvedBy?: User;
  lines: (PayoutLine & { student: User; course: Course })[];
  flags: PayoutFlag[];
};

export type PayoutLineWithDetails = PayoutLine & {
  student: User;
  course: Course;
  session?: TutoringSession;
};
