import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { PageBody, SectionNav } from "@/components/page/content";
import { employees } from "@/lib/content/organisation";
import { sectionLinks } from "@/lib/site";
import { initials } from "@/lib/utils";

const designedMetadata: Metadata = { title: "Employees", description: "The RiTECHS team." };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("employees", designedMetadata);
}

export default async function EmployeesPage() {
  const edited = await getManagedPage("employees");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "About", href: "/aboutus" }, { label: "Employees" }]} aside={<SectionNav title="About" links={sectionLinks("About")} current="/employees" />} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Employees" crumbs={[{ label: "Home", href: "/" }, { label: "About", href: "/aboutus" }, { label: "Employees" }]} />
      <PageBody aside={<SectionNav title="About" links={sectionLinks("About")} current="/employees" />}>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {employees.map((e) => (
            <li key={e.name} className="flex items-center gap-4 rounded-lg border border-rule bg-surface p-5">
              <span aria-hidden className="inline-flex size-14 shrink-0 items-center justify-center rounded-md bg-brand-wash font-serif text-xl text-brand">
                {initials(e.name)}
              </span>
              <div>
                <h2 className="font-serif text-lg text-ink">{e.name}</h2>
                <p className="text-sm text-ink/85">{e.role}</p>
                <p className="text-[0.8125rem] text-faint-ink">{e.since}</p>
              </div>
            </li>
          ))}
        </ul>
      </PageBody>
    </main>
  );
}
