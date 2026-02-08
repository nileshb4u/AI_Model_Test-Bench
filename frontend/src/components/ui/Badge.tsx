import { clsx } from "clsx";

type BadgeVariant = "success" | "warning" | "error" | "info" | "default";

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-green-500/15 text-green-400 border-green-500/20",
  warning: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  error: "bg-red-500/15 text-red-400 border-red-500/20",
  info: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  default: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

export function Badge({ text, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variantClasses[variant],
        className
      )}
    >
      {text}
    </span>
  );
}
