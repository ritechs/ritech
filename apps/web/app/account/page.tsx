import type { Metadata } from "next";
import { AccountPanel } from "@/components/account/account-panel";
import { PageHeader } from "@/components/page/page-header";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default function AccountPage() {
  return (
    <main id="main" className="flex-1">
      <PageHeader title="My Account" crumbs={[{ label: "Home", href: "/" }, { label: "My Account" }]} />
      <div className="container-site max-w-3xl py-10 md:py-14">
        <AccountPanel />
      </div>
    </main>
  );
}
