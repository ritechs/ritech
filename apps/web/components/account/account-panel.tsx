"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Notice } from "@/components/auth/field";
import { ChangePasswordCard, TwoFactorCard } from "@/components/account/security-settings";
import { api } from "@/lib/api/client";
import { signOut } from "@/lib/auth/client";
import { routes } from "@/lib/site";

interface Me {
  user: { name: string; email: string; role: string; twoFactorEnabled: boolean | null; twoFactorRequired?: boolean };
  profile: null | { type: "mentor" | "mentee"; status: "pending" | "approved" | "rejected" | "suspended"; affiliation: string; position: string; photoUrl: string | null; slug: string };
}

const STATUS: Record<string, { label: string; text: string }> = {
  pending: { label: "Under review", text: "Our team is reviewing your application. We'll email you when it is approved." },
  approved: { label: "Approved", text: "Your membership is active." },
  rejected: { label: "Not approved", text: "Your application was not approved. Contact info@ritechs.org if you have questions." },
  suspended: { label: "Suspended", text: "Your membership is suspended. Contact info@ritechs.org." },
};

export function AccountPanel() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const load = useCallback(
    () =>
      api<Me>("/me").then((res) => {
        // Members manage everything from their dashboard; My Account remains for staff.
        if (res.ok && res.profile && res.user.role !== "admin" && res.user.role !== "editor") router.replace(`${routes.dashboard}/settings`);
        else if (res.ok) setMe(res);
        else if (res.status === 401) router.replace(`${routes.login}?next=${encodeURIComponent(routes.account)}`);
        else setError(res.message);
      }),
    [router],
  );
  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!me)
    return (
      <p className="mt-8 flex items-center gap-2 text-muted-ink" role="status">
        <Spinner /> Loading your account…
      </p>
    );

  const staff = me.user.role === "admin" || me.user.role === "editor";
  const status = me.profile ? STATUS[me.profile.status] : undefined;
  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-lg border border-rule bg-surface p-6">
        <h2 className="font-serif text-2xl text-ink">{me.user.name}</h2>
        <p className="mt-1 text-sm text-muted-ink">{me.user.email}</p>
        {me.profile && status && (
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-faint-ink">Membership</dt>
              <dd className="mt-1 capitalize text-ink">{me.profile.type}</dd>
            </div>
            <div>
              <dt className="text-sm text-faint-ink">Status</dt>
              <dd className="mt-1 text-ink">{status.label}</dd>
            </div>
          </dl>
        )}
        {status && <p className="mt-4 text-[0.9375rem] text-ink/85">{status.text}</p>}
      </section>

      <TwoFactorCard email={me.user.email} enabled={!!me.user.twoFactorEnabled} required={!!me.user.twoFactorRequired} onChange={() => void load()} />
      <ChangePasswordCard />

      <div className="flex flex-col gap-3 sm:flex-row">
        {staff && (
          <Button asChild>
            <Link href="/admin">
              <LayoutDashboard aria-hidden /> Open Admin Dashboard
            </Link>
          </Button>
        )}
        {me.profile?.status === "approved" && me.profile.type === "mentor" && (
          <Button asChild variant="outline">
            <Link href={routes.mentor(me.profile.slug)}>View My Public Profile</Link>
          </Button>
        )}
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await signOut();
              router.replace(routes.login);
            })
          }
        >
          {pending && <Spinner />}
          {pending ? "Signing Out…" : "Sign Out"}
        </Button>
      </div>
    </div>
  );
}
