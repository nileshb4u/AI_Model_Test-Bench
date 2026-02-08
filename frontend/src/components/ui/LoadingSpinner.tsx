import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export function LoadingSpinner({
  text,
  size = "md",
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-3 py-12",
        className
      )}
    >
      <Loader2 className={clsx("animate-spin text-primary-500", sizeClasses[size])} />
      {text && <p className="text-sm text-zinc-500">{text}</p>}
    </div>
  );
}
