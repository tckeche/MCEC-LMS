import { subMonths } from "date-fns";
import type { UserRole } from "./schema";

export const MESSAGING_RETENTION_MONTHS = 12;

export type MessagingRelationshipSet = {
  allUserIds?: string[];
  staffIds: string[];
  tutorIds: string[];
  studentIds: string[];
  parentIds: string[];
  childIds: string[];
};

export function resolveMessagingRecipientIds(
  role: UserRole,
  relationships: MessagingRelationshipSet,
): string[] {
  switch (role) {
    case "admin":
    case "manager":
      return relationships.allUserIds ?? [];
    case "tutor":
      return [...relationships.studentIds, ...relationships.parentIds, ...relationships.staffIds];
    case "student":
      return [...relationships.tutorIds, ...relationships.staffIds];
    case "parent":
      return [...relationships.childIds, ...relationships.tutorIds, ...relationships.staffIds];
    default:
      return [];
  }
}

export function getMessagingRetentionCutoff(
  referenceDate: Date = new Date(),
  retentionMonths: number = MESSAGING_RETENTION_MONTHS,
): Date {
  return subMonths(referenceDate, retentionMonths);
}
