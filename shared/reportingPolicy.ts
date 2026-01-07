import type {
  DisputeStatus,
  ReportStatus,
  ReportType,
  UserRole,
} from "./schema";

type ReportVisibilityContext = {
  role: UserRole;
  reportType: ReportType;
  isOwner: boolean;
  isStudent: boolean;
  isParent: boolean;
};

export function canViewReport(context: ReportVisibilityContext): boolean {
  const { role, reportType, isOwner, isStudent, isParent } = context;

  if (role === "admin" || role === "manager") return true;

  if (reportType === "monthly") {
    return role === "tutor" && isOwner;
  }

  return (role === "tutor" && isOwner) || (role === "student" && isStudent) || (role === "parent" && isParent);
}

export function canSubmitReport(status: ReportStatus): boolean {
  return status === "draft" || status === "rejected";
}

export function canApproveReport(status: ReportStatus): boolean {
  return status === "submitted";
}

export function canEditReport(status: ReportStatus): boolean {
  return status === "draft" || status === "rejected";
}

export function canResolveDispute(status: DisputeStatus): boolean {
  return status === "open" || status === "under_review";
}
