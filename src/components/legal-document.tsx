type LegalDocumentProps = {
  title: string;
  summary: string;
  lastUpdated: string;
  children: React.ReactNode;
};

export function LegalDocument({
  title,
  summary,
  lastUpdated,
  children,
}: LegalDocumentProps) {
  return (
    <main className="py-14">
      <div className="inner">
        <div className="mx-auto max-w-4xl">
          <header className="border-b pb-8">
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              {summary}
            </p>
            <p className="mt-5 text-sm text-muted-foreground">
              Last updated {lastUpdated}
            </p>
          </header>

          <article className="prose prose-zinc mt-10 max-w-none prose-headings:tracking-tight prose-a:text-primary prose-strong:text-foreground dark:prose-invert">
            {children}
          </article>
        </div>
      </div>
    </main>
  );
}
