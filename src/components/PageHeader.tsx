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
        <p className="font-hand text-clay text-[18px] mb-2">~ {kicker} ~</p>
        <h1 className="font-hand text-[2.5rem] sm:text-[3rem] leading-[0.95] text-ink mb-2">
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
