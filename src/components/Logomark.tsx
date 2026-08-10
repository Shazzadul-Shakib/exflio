import { cx } from "@/components/ui";

export function Logomark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const dims =
    size === "sm" ? "h-9 w-9 rounded-lg" : "h-11 w-11 rounded-[10px]";
  return (
    <div
      className={cx(
        "flex shrink-0 items-center justify-center bg-brand text-brand-contrast",
        dims,
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className={size === "sm" ? "h-[18px] w-[18px]" : "h-[22px] w-[22px]"}
        fill="none"
      >
        <path
          d="M5 17 L10.5 9.5 L14.5 14 L19 6"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 6 L19 10.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 6 L14.5 6"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
