import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { Check, X } from "lucide-react";
import { PageHeader } from "@/components/page/page-header";
import { PageBody, Prose, SectionNav } from "@/components/page/content";
import { subscription } from "@/lib/content/organisation";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Subscription", description: subscription.intro };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("subscription", designedMetadata);
}

export default async function SubscriptionPage() {
  const edited = await getManagedPage("subscription");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Membership", href: "/membership" }, { label: "Subscription" }]} aside={<SectionNav title="Membership" links={sectionLinks("Membership")} current="/subscription" />} />;

  const lists = [
    { title: "Recommended uses", items: subscription.recommended, Icon: Check, tone: "text-[#2f8a57]" },
    { title: "Prohibited uses", items: subscription.prohibited, Icon: X, tone: "text-destructive" },
  ];
  return (
    <main id="main" className="flex-1">
      <PageHeader title="Subscription" crumbs={[{ label: "Home", href: "/" }, { label: "Membership", href: "/membership" }, { label: "Subscription" }]} />
      <PageBody aside={<SectionNav title="Membership" links={sectionLinks("Membership")} current="/subscription" />}>
        <Prose paragraphs={[subscription.intro]} />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {lists.map(({ title, items, Icon, tone }) => (
            <section key={title} className="rounded-lg border border-rule bg-surface p-6">
              <h2 className="font-serif text-xl text-ink">{title}</h2>
              <ul className="mt-4 space-y-3">
                {items.map((t) => (
                  <li key={t} className="flex gap-3 text-[0.9375rem] leading-relaxed text-ink/90">
                    <Icon className={`mt-1 size-4 shrink-0 ${tone}`} aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </PageBody>
    </main>
  );
}
