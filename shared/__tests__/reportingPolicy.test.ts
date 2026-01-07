import { describe, expect, it } from "vitest";
import {
  canApproveReport,
  canEditReport,
  canResolveDispute,
  canSubmitReport,
  canViewReport,
} from "../reportingPolicy";

describe("reportingPolicy", () => {
  it("allows admins and managers to view any report", () => {
    expect(canViewReport({ role: "admin", reportType: "monthly", isOwner: false, isStudent: false, isParent: false }))
      .toBe(true);
    expect(canViewReport({ role: "manager", reportType: "session", isOwner: false, isStudent: false, isParent: false }))
      .toBe(true);
  });

  it("allows tutors to view their own reports only", () => {
    expect(canViewReport({ role: "tutor", reportType: "monthly", isOwner: true, isStudent: false, isParent: false }))
      .toBe(true);
    expect(canViewReport({ role: "tutor", reportType: "session", isOwner: false, isStudent: false, isParent: false }))
      .toBe(false);
  });

  it("allows students and parents to view session reports tied to them", () => {
    expect(canViewReport({ role: "student", reportType: "session", isOwner: false, isStudent: true, isParent: false }))
      .toBe(true);
    expect(canViewReport({ role: "parent", reportType: "session", isOwner: false, isStudent: false, isParent: true }))
      .toBe(true);
    expect(canViewReport({ role: "parent", reportType: "monthly", isOwner: false, isStudent: false, isParent: true }))
      .toBe(false);
  });

  it("handles report transitions", () => {
    expect(canSubmitReport("draft")).toBe(true);
    expect(canSubmitReport("rejected")).toBe(true);
    expect(canSubmitReport("approved")).toBe(false);
    expect(canApproveReport("submitted")).toBe(true);
    expect(canApproveReport("draft")).toBe(false);
    expect(canEditReport("draft")).toBe(true);
    expect(canEditReport("approved")).toBe(false);
  });

  it("allows resolving open or under review disputes only", () => {
    expect(canResolveDispute("open")).toBe(true);
    expect(canResolveDispute("under_review")).toBe(true);
    expect(canResolveDispute("resolved")).toBe(false);
  });
});
