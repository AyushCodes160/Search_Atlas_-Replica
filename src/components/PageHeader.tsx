export function PageHeader({
  kicker,
  title,
  subtitle,
  right,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-6 flex-wrap mb-10">
      <div className="max-w-2xl">
        <p className="font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-dark/80 mb-2">{kicker}</p>
        <h1 className="font-hand font-bold text-[2.25rem] sm:text-[2.75rem] leading-tight text-ink mb-2 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="font-sans text-[14px] text-ink-soft leading-relaxed">{subtitle}</p>
        )}
      </div>
      {right}
    </header>
  );
}
