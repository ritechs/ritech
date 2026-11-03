import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Header band for inner pages: breadcrumb, title and optional description. */
export function PageHeader({
  title,
  description,
  crumbs,
  children,
}: {
  title: string;
  description?: string;
  crumbs: { label: string; href?: string }[];
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-rule bg-paper">
      <div className="container-site py-10 md:py-14">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-faint-ink">
            {crumbs.map((c, i) => (
              <li key={c.label} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3.5" aria-hidden />}
                {c.href ? (
                  <Link href={c.href} className="tap-target rounded-sm hover:text-brand">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-ink">
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="mt-4 max-w-4xl font-serif text-h2 font-normal text-ink [text-wrap:balance]">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-muted-ink">{description}</p>}
        {children}
      </div>
    </div>
  );
}
