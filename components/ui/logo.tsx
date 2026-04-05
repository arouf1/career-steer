import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";

const sizeClasses: Record<LogoSize, string> = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
};

interface LogoProps {
  size?: LogoSize;
  className?: string;
}

export function Logo({ size = "md", className }: LogoProps) {
  return (
    <span
      className={cn(
        "font-logo tracking-tight select-none",
        sizeClasses[size],
        className,
      )}
    >
      Career Steer
    </span>
  );
}
