import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  testId?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  testId,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      data-testid={testId}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <h3 className="mt-4 font-heading text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Button asChild data-testid={`${testId}-action`}>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button onClick={action.onClick} data-testid={`${testId}-action`}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
