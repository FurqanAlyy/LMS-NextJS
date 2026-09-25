export function AdminHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow mb-2">LEARNX WORKSPACE</p>
        <h1 className="heading">{title}</h1>
        <p className="mt-3 text-sm text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
