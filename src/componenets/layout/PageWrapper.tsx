import clsx from "clsx";

interface PageWrapperProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

const widths = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-full",
};

export default function PageWrapper({
  children,
  maxWidth = "lg",
  className,
}: PageWrapperProps) {
  return (
    <div className={clsx("mx-auto w-full", widths[maxWidth], className)}>
      {children}
    </div>
  );
}
