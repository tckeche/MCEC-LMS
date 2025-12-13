import { db } from "./db";
import {
  users,
  courses,
  enrollments,
  parentChildren,
  hourWallets,
  invoices,
  invoiceLineItems,
} from "@shared/schema";
import { sql } from "drizzle-orm";

async function seedDemo() {
  console.log("Starting demo data seed...");

  // Create demo tutors
  const [tutor1] = await db
    .insert(users)
    .values({
      id: sql`gen_random_uuid()`,
      email: "demo.tutor.maths@mcec.test",
      firstName: "[DEMO] Sarah",
      lastName: "Mathews",
      role: "tutor",
      isActive: true,
    })
    .returning();

  const [tutor2] = await db
    .insert(users)
    .values({
      id: sql`gen_random_uuid()`,
      email: "demo.tutor.physics@mcec.test",
      firstName: "[DEMO] James",
      lastName: "Newton",
      role: "tutor",
      isActive: true,
    })
    .returning();

  console.log("Created tutors:", tutor1.firstName, tutor2.firstName);

  // Create demo students
  const [student1] = await db
    .insert(users)
    .values({
      id: sql`gen_random_uuid()`,
      email: "demo.student1@mcec.test",
      firstName: "[DEMO] Alex",
      lastName: "Johnson",
      role: "student",
      isActive: true,
    })
    .returning();

  const [student2] = await db
    .insert(users)
    .values({
      id: sql`gen_random_uuid()`,
      email: "demo.student2@mcec.test",
      firstName: "[DEMO] Emma",
      lastName: "Johnson",
      role: "student",
      isActive: true,
    })
    .returning();

  console.log("Created students:", student1.firstName, student2.firstName);

  // Create demo parent
  const [parent1] = await db
    .insert(users)
    .values({
      id: sql`gen_random_uuid()`,
      email: "demo.parent@mcec.test",
      firstName: "[DEMO] Michael",
      lastName: "Johnson",
      role: "parent",
      isActive: true,
    })
    .returning();

  console.log("Created parent:", parent1.firstName);

  // Link parent to students
  await db.insert(parentChildren).values([
    { parentId: parent1.id, childId: student1.id },
    { parentId: parent1.id, childId: student2.id },
  ]);

  console.log("Linked parent to students");

  // Create courses
  const [course1] = await db
    .insert(courses)
    .values({
      id: sql`gen_random_uuid()`,
      title: "Mathematics AS Level",
      description: "Advanced Subsidiary Level Mathematics covering Pure Mathematics, Mechanics, and Statistics",
      tutorId: tutor1.id,
      maxEnrollment: 1,
      isActive: true,
    })
    .returning();

  const [course2] = await db
    .insert(courses)
    .values({
      id: sql`gen_random_uuid()`,
      title: "Physics IGCSE",
      description: "International GCSE Physics covering mechanics, waves, electricity, and modern physics",
      tutorId: tutor2.id,
      maxEnrollment: 1,
      isActive: true,
    })
    .returning();

  const [course3] = await db
    .insert(courses)
    .values({
      id: sql`gen_random_uuid()`,
      title: "Mathematics IGCSE Group",
      description: "Group tutoring for IGCSE Mathematics - up to 5 students per session",
      tutorId: tutor1.id,
      maxEnrollment: 5,
      isActive: true,
    })
    .returning();

  console.log("Created courses:", course1.title, course2.title, course3.title);

  // Create enrollments
  await db.insert(enrollments).values([
    { studentId: student1.id, courseId: course1.id, status: "active" },
    { studentId: student1.id, courseId: course3.id, status: "active" },
    { studentId: student2.id, courseId: course2.id, status: "active" },
    { studentId: student2.id, courseId: course3.id, status: "active" },
  ]);

  console.log("Created enrollments");

  // Create hour wallets (5-10 hours = 300-600 minutes)
  await db.insert(hourWallets).values([
    {
      studentId: student1.id,
      courseId: course1.id,
      purchasedMinutes: 480,
      consumedMinutes: 0,
      status: "active",
    },
    {
      studentId: student1.id,
      courseId: course3.id,
      purchasedMinutes: 360,
      consumedMinutes: 0,
      status: "active",
    },
    {
      studentId: student2.id,
      courseId: course2.id,
      purchasedMinutes: 600,
      consumedMinutes: 0,
      status: "active",
    },
    {
      studentId: student2.id,
      courseId: course3.id,
      purchasedMinutes: 300,
      consumedMinutes: 0,
      status: "active",
    },
  ]);

  console.log("Created hour wallets");

  // Create invoices (paid status)
  const billingStart = new Date();
  billingStart.setDate(1);
  billingStart.setHours(0, 0, 0, 0);
  
  const billingEnd = new Date(billingStart);
  billingEnd.setMonth(billingEnd.getMonth() + 1);
  billingEnd.setDate(0);
  billingEnd.setHours(23, 59, 59, 999);

  const dueDate = new Date(billingEnd);
  dueDate.setDate(dueDate.getDate() + 14);

  // Invoice for student 1
  const [invoice1] = await db
    .insert(invoices)
    .values({
      invoiceNumber: "INV-DEMO-001",
      parentId: parent1.id,
      studentId: student1.id,
      billingPeriodStart: billingStart,
      billingPeriodEnd: billingEnd,
      currency: "ZAR",
      subtotal: "4800.00",
      taxAmount: "720.00",
      totalAmount: "5520.00",
      amountPaid: "5520.00",
      amountOutstanding: "0.00",
      status: "paid",
      dueDate: dueDate,
      notes: "[DEMO] Sample paid invoice for testing",
    })
    .returning();

  // Invoice line items for student 1
  await db.insert(invoiceLineItems).values([
    {
      invoiceId: invoice1.id,
      courseId: course1.id,
      description: "Mathematics AS Level - 8 hours",
      hours: "8.00",
      hourlyRate: "400.00",
      amount: "3200.00",
      minutesToAdd: 480,
    },
    {
      invoiceId: invoice1.id,
      courseId: course3.id,
      description: "Mathematics IGCSE Group - 6 hours",
      hours: "6.00",
      hourlyRate: "266.67",
      amount: "1600.00",
      minutesToAdd: 360,
    },
  ]);

  // Invoice for student 2
  const [invoice2] = await db
    .insert(invoices)
    .values({
      invoiceNumber: "INV-DEMO-002",
      parentId: parent1.id,
      studentId: student2.id,
      billingPeriodStart: billingStart,
      billingPeriodEnd: billingEnd,
      currency: "ZAR",
      subtotal: "5500.00",
      taxAmount: "825.00",
      totalAmount: "6325.00",
      amountPaid: "6325.00",
      amountOutstanding: "0.00",
      status: "paid",
      dueDate: dueDate,
      notes: "[DEMO] Sample paid invoice for testing",
    })
    .returning();

  // Invoice line items for student 2
  await db.insert(invoiceLineItems).values([
    {
      invoiceId: invoice2.id,
      courseId: course2.id,
      description: "Physics IGCSE - 10 hours",
      hours: "10.00",
      hourlyRate: "450.00",
      amount: "4500.00",
      minutesToAdd: 600,
    },
    {
      invoiceId: invoice2.id,
      courseId: course3.id,
      description: "Mathematics IGCSE Group - 5 hours",
      hours: "5.00",
      hourlyRate: "200.00",
      amount: "1000.00",
      minutesToAdd: 300,
    },
  ]);

  console.log("Created invoices:", invoice1.invoiceNumber, invoice2.invoiceNumber);

  console.log("\n=== Demo Data Seed Complete ===");
  console.log("Created:");
  console.log("  - 2 Tutors: Sarah Mathews (Maths), James Newton (Physics)");
  console.log("  - 2 Students: Alex Johnson, Emma Johnson");
  console.log("  - 1 Parent: Michael Johnson (linked to both students)");
  console.log("  - 3 Courses: Maths AS, Physics IGCSE, Maths IGCSE Group");
  console.log("  - 4 Enrollments");
  console.log("  - 4 Hour Wallets (5-10 hours each)");
  console.log("  - 2 Paid Invoices");
  console.log("\nAll demo users have [DEMO] prefix and @mcec.test email domain");
}

seedDemo()
  .then(() => {
    console.log("Seed completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
