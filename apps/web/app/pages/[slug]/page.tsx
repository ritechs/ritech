import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContactCard } from "@/components/page/content";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { sitePage } from "@/lib/content/site-pages";
import { getCustomPages, getManagedPage } from "@/lib/server/content";
import { staticSlugs } from "@/lib/utils";

/** Pages created in Admin → Website Pages that are not one of the website's designed pages. */
export async function generateStaticParams() {
  return staticSlugs((await getCustomPages()).map((p) => p.slug));
}

export async function generateMetadata({ params }: PageProps<"/pages/[slug]">): Promise<Metadata> {
  return managedMetadata((await params).slug, { title: "Page not found" });
}

async function CustomPage({ params }: { params: PageProps<"/pages/[slug]">["params"] }) {
  const { slug } = await params;
  // Designed pages live at their own address; their edited text shows there.
  if (sitePage(slug)) notFound();
  const page = await getManagedPage(slug);
  if (!page) notFound();
  return <ManagedPage page={page} crumbs={[{ label: "Home", href: "/" }, { label: page.title }]} aside={<ContactCard heading="Questions?" />} />;
}

export default function Page({ params }: PageProps<"/pages/[slug]">) {
  return (
    <Suspense fallback={<main id="main" className="min-h-[70vh] flex-1 bg-paper" aria-busy="true" />}>
      <CustomPage params={params} />
    </Suspense>
  );
}
