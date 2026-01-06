# MCEC LMS API Documentation

**Version:** 1.0  
**Base URL:** `/api`  
**Authentication:** Session-based (Passport.js)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Staff Proposals](#staff-proposals)
3. [User Management](#user-management)
4. [Super Admin](#super-admin)
5. [Courses](#courses)
6. [Enrollments](#enrollments)
7. [Students](#students)
8. [Assignments](#assignments)
9. [Submissions](#submissions)
10. [Grades](#grades)
11. [Announcements](#announcements)
12. [Notifications](#notifications)
13. [Parent-Child Relationships](#parent-child-relationships)
14. [Tutor Availability](#tutor-availability)
15. [Session Proposals](#session-proposals)
16. [Tutoring Sessions](#tutoring-sessions)
17. [Hours Wallet (Billing)](#hours-wallet-billing)
18. [Invoices](#invoices)
19. [Payments](#payments)
20. [Account Standing](#account-standing)
21. [Tutor Payouts](#tutor-payouts)
22. [Dashboard Stats](#dashboard-stats)
23. [Debug Endpoints](#debug-endpoints)

---

## Access Levels

| Level | Description |
|-------|-------------|
| Public | No authentication required |
| Authenticated | Any logged-in user |
| Student | Users with student role |
| Parent | Users with parent role |
| Tutor | Users with tutor role |
| Manager | Users with manager role |
| Admin | Users with admin role |
| Super Admin | Users with isSuperAdmin flag |

---

## Authentication

### Get Current User
```
GET /api/auth/user
```
**Access:** Authenticated  
**Description:** Returns the currently logged-in user's information.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student",
  "isActive": true,
  "isSuperAdmin": false
}
```

---

## Staff Proposals

### Submit Staff Registration Proposal
```
POST /api/staff/proposals
```
**Access:** Authenticated  
**Description:** Submit a proposal to become a staff member (tutor/manager).

**Request Body:**
```json
{
  "requestedRole": "tutor",
  "reason": "I have 5 years of teaching experience..."
}
```

### Get My Proposals
```
GET /api/staff/proposals/me
```
**Access:** Authenticated  
**Description:** Get all proposals submitted by the current user.

### List All Staff Proposals
```
GET /api/staff/proposals
```
**Access:** Admin  
**Description:** Get all pending staff proposals for review.

### Approve Staff Proposal
```
POST /api/staff/proposals/:id/approve
```
**Access:** Admin  
**Description:** Approve a staff proposal and update user role.

### Reject Staff Proposal
```
POST /api/staff/proposals/:id/reject
```
**Access:** Admin  
**Description:** Reject a staff proposal with optional reason.

**Request Body:**
```json
{
  "rejectionReason": "Insufficient qualifications"
}
```

---

## User Management

### List All Users
```
GET /api/users
```
**Access:** Admin  
**Description:** Get all registered users.

### Get Users by Role
```
GET /api/users/role/:role
```
**Access:** Admin, Manager  
**Description:** Get users filtered by role (student, parent, tutor, manager, admin).

### Change User Role
```
PATCH /api/users/:id/role
```
**Access:** Admin  
**Description:** Update a user's role.

**Request Body:**
```json
{
  "role": "tutor"
}
```

### Activate/Deactivate User
```
PATCH /api/users/:id/status
```
**Access:** Admin  
**Description:** Toggle user's active status.

**Request Body:**
```json
{
  "isActive": false
}
```

---

## Super Admin

### List All Users (Extended)
```
GET /api/super-admin/users
```
**Access:** Super Admin  
**Description:** Get all users with admin-level details.

### Change Admin Level
```
PATCH /api/super-admin/users/:id/admin-level
```
**Access:** Super Admin  
**Description:** Update a user's admin level (1-3).

### Grant/Revoke Super Admin
```
PATCH /api/super-admin/users/:id/super-admin
```
**Access:** Super Admin  
**Description:** Toggle super admin status for a user.

### Update User Details
```
PATCH /api/super-admin/users/:id
```
**Access:** Super Admin  
**Description:** Update any user's profile information.

### Get Audit Logs
```
GET /api/super-admin/audit-logs
```
**Access:** Super Admin  
**Description:** Get all system audit logs.

### Get User Audit Logs
```
GET /api/super-admin/audit-logs/user/:userId
```
**Access:** Super Admin  
**Description:** Get audit logs for a specific user.

---

## Courses

### List All Courses
```
GET /api/courses
```
**Access:** Authenticated  
**Description:** Get all available courses.

### Get Course Details
```
GET /api/courses/:id
```
**Access:** Authenticated  
**Description:** Get details of a specific course.

### Get Tutor's Courses
```
GET /api/tutor/courses
```
**Access:** Tutor  
**Description:** Get courses taught by the current tutor.

### Create Course
```
POST /api/courses
```
**Access:** Tutor, Admin, Manager  
**Description:** Create a new course.

**Request Body:**
```json
{
  "title": "Mathematics 101",
  "description": "Introduction to algebra",
  "tutorId": "uuid",
  "schedule": "Mon/Wed 10:00 AM",
  "hourlyRate": 50.00
}
```

### Update Course
```
PATCH /api/courses/:id
```
**Access:** Tutor, Admin, Manager  
**Description:** Update course information.

### Delete Course
```
DELETE /api/courses/:id
```
**Access:** Admin, Manager  
**Description:** Delete a course.

---

## Enrollments

### Get My Enrollments
```
GET /api/enrollments/student
```
**Access:** Student  
**Description:** Get current user's course enrollments.

### Get Course Enrollments
```
GET /api/courses/:courseId/enrollments
```
**Access:** Tutor, Admin, Manager  
**Description:** Get all enrollments for a course.

### Create Enrollment
```
POST /api/enrollments
```
**Access:** Admin, Manager, Tutor  
**Description:** Enroll a student in a course.

**Request Body:**
```json
{
  "studentId": "uuid",
  "courseId": "uuid"
}
```

### Update Enrollment Status
```
PATCH /api/enrollments/:id/status
```
**Access:** Admin, Manager, Tutor  
**Description:** Update enrollment status (active, completed, withdrawn).

---

## Students

### List Active Students
```
GET /api/students/active
```
**Access:** Tutor, Admin, Manager  
**Description:** Get all active students in the system.

### Get Student Rollover Hours
```
GET /api/students/:studentId/rollover
```
**Access:** Tutor, Admin, Manager  
**Description:** Get unused hours that rolled over from previous periods.

### Get Student's Enrolled Courses
```
GET /api/students/:studentId/enrolled-courses
```
**Access:** Tutor, Admin, Manager  
**Description:** Get all courses a student is enrolled in.

### Get Tutor's Active Students
```
GET /api/tutor/active-students
```
**Access:** Tutor, Admin, Manager  
**Description:** Get all active students available for tutor enrollment.

### Get All Students for Tutor
```
GET /api/tutor/students
```
**Access:** Tutor  
**Description:** Get all students (current and past) for the tutor.

---

## Assignments

### Get My Assignments
```
GET /api/assignments/student
```
**Access:** Student  
**Description:** Get all assignments for enrolled courses.

### Get Assignment Details
```
GET /api/assignments/:id
```
**Access:** Authenticated  
**Description:** Get details of a specific assignment.

### Get Course Assignments
```
GET /api/courses/:courseId/assignments
```
**Access:** Authenticated  
**Description:** Get all assignments for a course.

### Create Assignment
```
POST /api/assignments
```
**Access:** Tutor, Admin, Manager  
**Description:** Create a new assignment.

**Request Body:**
```json
{
  "courseId": "uuid",
  "title": "Homework 1",
  "description": "Complete exercises 1-10",
  "dueDate": "2024-12-31T23:59:59Z",
  "pointsPossible": 100
}
```

### Update Assignment
```
PATCH /api/assignments/:id
```
**Access:** Tutor, Admin, Manager  
**Description:** Update assignment details.

### Delete Assignment
```
DELETE /api/assignments/:id
```
**Access:** Tutor, Admin, Manager  
**Description:** Delete an assignment.

---

## Submissions

### Get My Submissions
```
GET /api/submissions/student
```
**Access:** Student  
**Description:** Get all submissions by the current student.

### Get Assignment Submissions
```
GET /api/assignments/:assignmentId/submissions
```
**Access:** Tutor, Admin, Manager  
**Description:** Get all submissions for an assignment.

### Submit Assignment
```
POST /api/submissions
```
**Access:** Student  
**Description:** Submit an assignment.

**Request Body:**
```json
{
  "assignmentId": "uuid",
  "content": "My submission content...",
  "attachmentUrl": "https://..."
}
```

### Grade Submission
```
PATCH /api/submissions/:id
```
**Access:** Tutor, Admin, Manager  
**Description:** Update/grade a submission.

**Request Body:**
```json
{
  "points": 95,
  "feedback": "Excellent work!"
}
```

---

## Grades

### Get My Grades
```
GET /api/grades/student
GET /api/student/grades
```
**Access:** Student  
**Description:** Get all grades for the current student.

### Get Grades for Tutor's Students
```
GET /api/grades/tutor
```
**Access:** Tutor  
**Description:** Get all grades assigned by the tutor.

### Create Grade
```
POST /api/grades
```
**Access:** Tutor, Admin, Manager  
**Description:** Create a new grade entry.

### Update Grade
```
PATCH /api/grades/:id
```
**Access:** Tutor, Admin, Manager  
**Description:** Update an existing grade.

---

## Announcements

### Get All Announcements
```
GET /api/announcements
```
**Access:** Authenticated  
**Description:** Get all announcements visible to the user.

**Response:**
```json
{
  "announcements": [],
  "courses": []
}
```

### Get Course Announcements
```
GET /api/courses/:courseId/announcements
```
**Access:** Authenticated  
**Description:** Get announcements for a specific course.

### Create Announcement
```
POST /api/announcements
```
**Access:** Tutor, Admin, Manager  
**Description:** Create a new announcement.

**Request Body:**
```json
{
  "courseId": "uuid",
  "title": "Important Update",
  "content": "Class cancelled tomorrow..."
}
```

### Update Announcement
```
PATCH /api/announcements/:id
```
**Access:** Tutor, Admin, Manager  
**Description:** Update an announcement.

### Delete Announcement
```
DELETE /api/announcements/:id
```
**Access:** Tutor, Admin, Manager  
**Description:** Delete an announcement.

---

## Notifications

### Get My Notifications
```
GET /api/notifications
```
**Access:** Authenticated  
**Description:** Get all notifications for the current user.

### Get Unread Count
```
GET /api/notifications/unread-count
```
**Access:** Authenticated  
**Description:** Get count of unread notifications.

### Mark as Read
```
PATCH /api/notifications/:id/read
```
**Access:** Authenticated  
**Description:** Mark a notification as read.

### Mark All as Read
```
PATCH /api/notifications/read-all
```
**Access:** Authenticated  
**Description:** Mark all notifications as read.

### Delete Notification
```
DELETE /api/notifications/:id
```
**Access:** Authenticated  
**Description:** Delete a notification.

---

## Parent-Child Relationships

### Get My Children
```
GET /api/parent/children
```
**Access:** Parent  
**Description:** Get all children linked to the parent account.

### Get Child's Sessions
```
GET /api/parent/children/:childId/sessions
```
**Access:** Parent  
**Description:** Get tutoring sessions for a specific child.

### Link Parent to Child
```
POST /api/parent-children
```
**Access:** Admin, Manager  
**Description:** Create a parent-child relationship.

**Request Body:**
```json
{
  "parentId": "uuid",
  "childId": "uuid"
}
```

### Remove Parent-Child Link
```
DELETE /api/parent-children/:id
```
**Access:** Admin, Manager  
**Description:** Remove a parent-child relationship.

---

## Tutor Availability

### Get My Availability
```
GET /api/tutor/availability
```
**Access:** Tutor  
**Description:** Get current tutor's availability slots.

### Get Tutor's Availability
```
GET /api/tutors/:tutorId/availability
```
**Access:** Authenticated  
**Description:** Get a specific tutor's availability.

### Create Availability Slot
```
POST /api/tutor/availability
```
**Access:** Tutor  
**Description:** Add a new availability slot.

**Request Body:**
```json
{
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "12:00"
}
```

### Update Availability
```
PATCH /api/tutor/availability/:id
```
**Access:** Tutor  
**Description:** Update an availability slot.

### Delete Availability
```
DELETE /api/tutor/availability/:id
```
**Access:** Tutor  
**Description:** Remove an availability slot.

---

## Session Proposals

### Get My Session Proposals
```
GET /api/session-proposals/student
```
**Access:** Student  
**Description:** Get session proposals submitted by the student.

### Get Proposals for My Sessions
```
GET /api/session-proposals/tutor
```
**Access:** Tutor  
**Description:** Get pending proposals for tutor's sessions.

### Create Session Proposal
```
POST /api/session-proposals
```
**Access:** Student  
**Description:** Propose a tutoring session.

**Request Body:**
```json
{
  "tutorId": "uuid",
  "courseId": "uuid",
  "proposedDate": "2024-12-15",
  "proposedTime": "14:00",
  "duration": 60,
  "notes": "Need help with chapter 5"
}
```

### Approve Proposal
```
PATCH /api/session-proposals/:id/approve
```
**Access:** Tutor  
**Description:** Approve a session proposal.

### Reject Proposal
```
PATCH /api/session-proposals/:id/reject
```
**Access:** Tutor  
**Description:** Reject a session proposal.

---

## Tutoring Sessions

### Get All Sessions
```
GET /api/tutoring-sessions
```
**Access:** Authenticated  
**Description:** Get sessions filtered by user role.

### Get Session Details
```
GET /api/tutoring-sessions/:id
```
**Access:** Authenticated  
**Description:** Get details of a specific session.

### Get My Tutoring Sessions
```
GET /api/tutor/sessions
```
**Access:** Tutor  
**Description:** Get all sessions for the current tutor.

### Join Session
```
POST /api/tutoring-sessions/:id/join
```
**Access:** Authenticated  
**Description:** Join an active tutoring session.

### End Session
```
POST /api/tutoring-sessions/:id/end
```
**Access:** Tutor  
**Description:** End a tutoring session and record duration.

### Postpone Session
```
PATCH /api/tutoring-sessions/:id/postpone
```
**Access:** Authenticated  
**Description:** Postpone a scheduled session.

**Request Body:**
```json
{
  "newDate": "2024-12-20",
  "newTime": "15:00",
  "reason": "Schedule conflict"
}
```

### Cancel Session
```
PATCH /api/tutoring-sessions/:id/cancel
```
**Access:** Authenticated  
**Description:** Cancel a scheduled session.

---

## Hours Wallet (Billing)

### Get All Hour Wallets
```
GET /api/hour-wallets
```
**Access:** Admin, Manager  
**Description:** Get all hour wallets in the system.

### Get My Hour Wallets
```
GET /api/hour-wallets/student
```
**Access:** Student  
**Description:** Get hour wallets for the current student.

### Get Specific Wallet
```
GET /api/hour-wallets/:studentId/:courseId
```
**Access:** Manager, Admin, Tutor  
**Description:** Get a specific student-course wallet.

### Get Wallets by Course
```
GET /api/hour-wallets/course/:courseId
```
**Access:** Manager, Admin, Tutor  
**Description:** Get all wallets for a course.

### Create Hour Wallet
```
POST /api/hour-wallets
```
**Access:** Manager, Admin  
**Description:** Create a new hour wallet.

**Request Body:**
```json
{
  "studentId": "uuid",
  "courseId": "uuid",
  "purchasedMinutes": 600
}
```

### Top Up Wallet
```
POST /api/hour-wallets/top-up
```
**Access:** Admin, Manager, Tutor  
**Description:** Add minutes to an existing wallet.

**Request Body:**
```json
{
  "studentId": "uuid",
  "courseId": "uuid",
  "minutes": 120,
  "reason": "Monthly allocation"
}
```

### Allocate Monthly Hours
```
POST /api/wallets/allocate-month
```
**Access:** Tutor, Admin, Manager  
**Description:** Allocate monthly hours to student wallets.

---

## Invoices

### List Invoices
```
GET /api/invoices
```
**Access:** Admin, Manager, Parent  
**Description:** Get invoices (filtered by role).

### Get Invoice Details
```
GET /api/invoices/:id
```
**Access:** Authenticated  
**Description:** Get details of a specific invoice.

### Get Invoice Line Items
```
GET /api/invoices/:id/line-items
```
**Access:** Authenticated  
**Description:** Get line items for an invoice.

### Download Invoice PDF
```
GET /api/invoices/:id/pdf
```
**Access:** Authenticated  
**Description:** Download invoice as PDF.

### Get Invoices for Student
```
GET /api/invoices/student/:studentId
```
**Access:** Authenticated  
**Description:** Get all invoices for a student.

### Create Invoice
```
POST /api/invoices
```
**Access:** Admin, Manager  
**Description:** Create a new invoice.

### Update Invoice
```
PATCH /api/invoices/:id
```
**Access:** Admin, Manager  
**Description:** Update invoice details.

### Send Invoice
```
POST /api/invoices/:id/send
```
**Access:** Admin, Manager  
**Description:** Send invoice to parent via email.

---

## Payments

### Get Pending Payments
```
GET /api/payments/pending
```
**Access:** Admin, Manager  
**Description:** Get all pending payment verifications.

### Get Payment Details
```
GET /api/payments/:id
```
**Access:** Authenticated  
**Description:** Get details of a specific payment.

### Get Invoice Payments
```
GET /api/invoices/:id/payments
```
**Access:** Authenticated  
**Description:** Get all payments for an invoice.

### Submit Payment
```
POST /api/invoices/:id/payments
```
**Access:** Parent  
**Description:** Submit a payment for an invoice.

**Request Body:**
```json
{
  "amount": 500.00,
  "paymentMethod": "bank_transfer",
  "reference": "TXN123456",
  "proofUrl": "https://..."
}
```

### Verify Payment
```
PATCH /api/payments/:id/verify
```
**Access:** Admin, Manager  
**Description:** Verify and approve a payment.

### Reject Payment
```
PATCH /api/payments/:id/reject
```
**Access:** Admin, Manager  
**Description:** Reject a payment with reason.

---

## Account Standing

### Get My Account Standing
```
GET /api/account/standing
```
**Access:** Authenticated  
**Description:** Get current user's account standing.

### Get Parent Account Standing
```
GET /api/account/standing/:parentId
```
**Access:** Admin, Manager  
**Description:** Get a specific parent's account standing.

---

## Tutor Payouts

### List All Payouts
```
GET /api/payouts
```
**Access:** Admin, Manager  
**Description:** Get all tutor payouts.

### Get My Payouts
```
GET /api/tutor/payouts
```
**Access:** Tutor  
**Description:** Get payouts for the current tutor.

### Get Payout Details
```
GET /api/payouts/:id
```
**Access:** Authenticated  
**Description:** Get details of a specific payout.

### Get Payout Line Items
```
GET /api/payouts/:id/lines
```
**Access:** Authenticated  
**Description:** Get line items for a payout.

### Download Payslip PDF
```
GET /api/payouts/:id/pdf
```
**Access:** Authenticated  
**Description:** Download payout as PDF payslip.

### Create Payout
```
POST /api/payouts
```
**Access:** Admin, Manager  
**Description:** Create a new payout record.

### Update Payout
```
PATCH /api/payouts/:id
```
**Access:** Admin, Manager  
**Description:** Update payout details.

### Add Payout Line Item
```
POST /api/payouts/:id/lines
```
**Access:** Admin, Manager  
**Description:** Add a line item to a payout.

### Add Payout Flag
```
POST /api/payouts/:id/flags
```
**Access:** Admin, Manager  
**Description:** Add a flag/warning to a payout.

### Update Payout Flag
```
PATCH /api/payouts/:payoutId/flags/:flagId
```
**Access:** Admin, Manager  
**Description:** Update or resolve a payout flag.

---

## Dashboard Stats

### Admin Dashboard
```
GET /api/stats/admin
GET /api/admin/dashboard
```
**Access:** Admin  
**Description:** Get admin dashboard statistics.

### Manager Dashboard
```
GET /api/stats/manager
GET /api/manager/dashboard
```
**Access:** Manager  
**Description:** Get manager dashboard statistics.

### Tutor Dashboard
```
GET /api/stats/tutor
GET /api/tutor/dashboard
```
**Access:** Tutor  
**Description:** Get tutor dashboard statistics.

### Student Dashboard
```
GET /api/stats/student
GET /api/student/dashboard
```
**Access:** Student  
**Description:** Get student dashboard statistics.

### Parent Dashboard
```
GET /api/parent/dashboard
```
**Access:** Parent  
**Description:** Get parent dashboard statistics.

---

## Debug Endpoints

### Course Consistency Check
```
GET /api/debug/courses
```
**Access:** Admin  
**Description:** Check course data consistency for debugging.

### Download API Documentation
```
GET /api/docs/pdf
```
**Access:** Public  
**Description:** Download this API documentation as PDF.

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "message": "Error description"
}
```

### Common Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not logged in |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Notes

1. All timestamps are in ISO 8601 format
2. All IDs are UUIDs
3. Course lookups support both ID and title (case-insensitive fallback)
4. Session cookies are HttpOnly and expire after 7 days
5. File uploads should be handled via multipart/form-data

---

**Total Endpoints:** 121

*Generated for MCEC Learning Management System*
