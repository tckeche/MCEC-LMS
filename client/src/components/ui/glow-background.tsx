import { cn } from "@/lib/utils";

interface GlowBackgroundProps {
  className?: string;
  variant?: "default" | "hero" | "subtle";
  animated?: boolean;
  children?: React.ReactNode;
}

export function GlowBackground({
  className,
  variant = "default",
  animated = true,
  children,
}: GlowBackgroundProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {variant === "hero" && (
          <>
            <div
              className={cn(
                "absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full",
                "bg-gradient-radial from-[hsl(var(--glow-primary)/0.15)] to-transparent",
                "blur-3xl",
                animated && "animate-glow-drift"
              )}
              style={{ animationDelay: "0s" }}
            />
            <div
              className={cn(
                "absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full",
                "bg-gradient-radial from-[hsl(var(--glow-accent)/0.12)] to-transparent",
                "blur-3xl",
                animated && "animate-glow-drift"
              )}
              style={{ animationDelay: "-5s" }}
            />
            <div
              className={cn(
                "absolute top-1/4 right-1/4 w-1/3 h-1/3 rounded-full",
                "bg-gradient-radial from-[hsl(var(--glow-green)/0.08)] to-transparent",
                "blur-3xl",
                animated && "animate-glow-pulse"
              )}
            />
          </>
        )}
        {variant === "default" && (
          <>
            <div
              className={cn(
                "absolute -top-20 -left-20 w-72 h-72 rounded-full",
                "bg-gradient-radial from-[hsl(var(--glow-primary)/0.1)] to-transparent",
                "blur-3xl",
                animated && "animate-glow-drift"
              )}
            />
            <div
              className={cn(
                "absolute -bottom-20 -right-20 w-72 h-72 rounded-full",
                "bg-gradient-radial from-[hsl(var(--glow-accent)/0.08)] to-transparent",
                "blur-3xl",
                animated && "animate-glow-drift"
              )}
              style={{ animationDelay: "-10s" }}
            />
          </>
        )}
        {variant === "subtle" && (
          <>
            <div
              className={cn(
                "absolute -top-10 -left-10 w-48 h-48 rounded-full",
                "bg-gradient-radial from-[hsl(var(--glow-primary)/0.06)] to-transparent",
                "blur-3xl",
                animated && "animate-glow-pulse"
              )}
            />
            <div
              className={cn(
                "absolute -bottom-10 -right-10 w-48 h-48 rounded-full",
                "bg-gradient-radial from-[hsl(var(--glow-accent)/0.05)] to-transparent",
                "blur-3xl",
                animated && "animate-glow-pulse"
              )}
              style={{ animationDelay: "-4s" }}
            />
          </>
        )}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
