import Link from "next/link";

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "outline";
  className?: string;
}

export default function Button({ href, children, variant = "primary", className = "" }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-full font-semibold transition-colors cursor-pointer";
  const styles =
    variant === "primary"
      ? "bg-deep-green text-on-primary hover:bg-primary"
      : "border border-hairline text-primary hover:bg-soft-stone";

  return (
    <Link href={href} className={`${base} ${styles} ${className}`}>
      {children}
    </Link>
  );
}
