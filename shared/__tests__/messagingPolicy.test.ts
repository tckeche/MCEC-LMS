import { describe, expect, it } from "vitest";
import { getMessagingRetentionCutoff, resolveMessagingRecipientIds } from "../messagingPolicy";

describe("resolveMessagingRecipientIds", () => {
  const relationships = {
    allUserIds: ["user-a", "user-b"],
    staffIds: ["staff-1"],
    tutorIds: ["tutor-1"],
    studentIds: ["student-1"],
    parentIds: ["parent-1"],
    childIds: ["child-1"],
  };

  it("returns all active users for admin", () => {
    expect(resolveMessagingRecipientIds("admin", relationships)).toEqual(["user-a", "user-b"]);
  });

  it("returns all active users for manager", () => {
    expect(resolveMessagingRecipientIds("manager", relationships)).toEqual(["user-a", "user-b"]);
  });

  it("returns students, parents, and staff for tutors", () => {
    expect(resolveMessagingRecipientIds("tutor", relationships)).toEqual([
      "student-1",
      "parent-1",
      "staff-1",
    ]);
  });

  it("returns tutors and staff for students", () => {
    expect(resolveMessagingRecipientIds("student", relationships)).toEqual(["tutor-1", "staff-1"]);
  });

  it("returns children, tutors, and staff for parents", () => {
    expect(resolveMessagingRecipientIds("parent", relationships)).toEqual([
      "child-1",
      "tutor-1",
      "staff-1",
    ]);
  });
});

describe("getMessagingRetentionCutoff", () => {
  it("returns a cutoff 12 months before the reference date by default", () => {
    const reference = new Date("2025-03-15T00:00:00.000Z");
    const cutoff = getMessagingRetentionCutoff(reference);
    expect(cutoff.toISOString()).toBe("2024-03-15T00:00:00.000Z");
  });

  it("supports custom retention month values", () => {
    const reference = new Date("2025-03-15T00:00:00.000Z");
    const cutoff = getMessagingRetentionCutoff(reference, 6);
    expect(cutoff.toISOString()).toBe("2024-09-15T00:00:00.000Z");
  });
});
