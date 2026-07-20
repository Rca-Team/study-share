type StudyShareLogoProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  compact?: boolean;
};

export function StudyShareLogo({
  className = "",
  iconClassName = "",
  textClassName = "",
  compact = false,
}: StudyShareLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div
        className={`relative grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 ${iconClassName}`.trim()}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.1">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.25v11.5M12 6.25C10.83 5.48 9.25 5 7.5 5S4.17 5.48 3 6.25v11.5C4.17 16.98 5.75 16.5 7.5 16.5s3.33.48 4.5 1.25m0-11.5C13.17 5.48 14.75 5 16.5 5S19.83 5.48 21 6.25v11.5c-1.17-.77-2.75-1.25-4.5-1.25s-3.33.48-4.5 1.25"
          />
        </svg>
      </div>

      {!compact ? (
        <div className={textClassName}>
          <p className="text-2xl font-extrabold tracking-tight text-gradient-brand">StudyShare</p>
          <p className="-mt-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
            Learn • Share • Grow
          </p>
        </div>
      ) : null}
    </div>
  );
}