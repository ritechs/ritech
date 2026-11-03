"use client";

import { createContext, useCallback, useContext, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { BookOpen, Building2, FileText, CalendarDays, ChevronDown, CircleUser, ExternalLink, Images, Inbox, LayoutDashboard, ListChecks, LogOut, Mail, Menu, Mic, Newspaper, Presentation, ShieldCheck, Tags, Ticket, UserCog, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Notice } from "@/components/auth/field";
import { TwoFactorEnableFlow } from "@/components/auth/two-factor-enable";
import { Loading, ToastProvider } from "@/components/admin/ui";
import { apiRaw } from "@/lib/api/client";
import { signOut } from "@/lib/auth/client";
import { routes, siteConfig } from "@/lib/site";
import { cn, initials } from "@/lib/utils";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "user";
  twoFactorEnabled: boolean | null;
  /** True only when the server is set to require two-step verification for this account (REQUIRE_STAFF_2FA). */
  twoFactorRequired?: boolean;
}

const AdminCtx = createContext<AdminUser | null>(null);
/** The signed-in staff member (available inside the admin area). */
export const useAdmin = () => useContext(AdminCtx)!;

type Badge = "pending" | "inbox" | "changes";
interface NavItem { href: string; label: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>; adminOnly?: boolean; badge?: Badge }
const NAV: { group: string; items: NavItem[] }[] = [
  { group: "", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    group: "Community",
    items: [
      { href: "/admin/members", label: "Members", icon: Users, badge: "pending" },
      { href: "/admin/inbox", label: "Inbox", icon: Inbox, badge: "inbox" },
      { href: "/admin/mailing", label: "Mailing", icon: Mail },
    ],
  },
  {
    group: "Programme",
    items: [
      { href: "/admin/conferences", label: "Conferences", icon: Presentation },
      { href: "/admin/events", label: "Events", icon: CalendarDays },
      { href: "/admin/registrations", label: "Registrations", icon: Ticket },
      { href: "/admin/speakers", label: "Speakers", icon: Mic },
      { href: "/admin/organisations", label: "Sponsors & Partners", icon: Building2 },
    ],
  },
  {
    group: "Content",
    items: [
      { href: "/admin/news", label: "News", icon: Newspaper },
      { href: "/admin/publications", label: "Publications", icon: BookOpen },
      { href: "/admin/gallery", label: "Gallery", icon: Images },
      { href: "/admin/pages", label: "Website Pages", icon: FileText },
    ],
  },
  {
    group: "Settings",
    items: [
      { href: "/admin/expertise", label: "Expertise Topics", icon: Tags },
      { href: "/admin/lists", label: "Form Lists", icon: ListChecks },
      { href: "/admin/staff", label: "Staff", icon: UserCog, adminOnly: true },
      { href: "/admin/security", label: "Security", icon: ShieldCheck, adminOnly: true },
    ],
  },
];

interface Counts { pending: number; inbox: number; changes: number }

/** Items that need attention, shown as counts beside the menu entries. */
function useCounts(enabled: boolean) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const path = usePathname();
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void apiRaw<{ members: { status: string; n: number }[]; newQuotes: number; newMessages: number; pendingMembershipChanges: number }>("/admin/dashboard").then((r) => {
      if (!live || !r.ok) return;
      const pending = r.data.members.filter((m) => m.status === "pending").reduce((n, m) => n + m.n, 0);
      setCounts({ pending: pending + r.data.pendingMembershipChanges, inbox: r.data.newQuotes + r.data.newMessages, changes: r.data.pendingMembershipChanges });
    });
    return () => {
      live = false;
    };
    // Refresh when moving between sections, so the counts follow what was just reviewed.
  }, [enabled, path]);
  return counts;
}

function Nav({ role, counts, onNavigate }: { role: AdminUser["role"]; counts: Counts | null; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="space-y-6">
      {NAV.map(({ group, items }) => {
        const visible = items.filter((n) => !n.adminOnly || role === "admin");
        if (!visible.length) return null;
        return (
          <div key={group || "home"}>
            {group && <p className="px-3 pb-1.5 text-xs font-medium text-white/50">{group}</p>}
            <ul className="space-y-0.5">
              {visible.map(({ href, label, icon: Icon, badge }) => {
                const active = href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`);
                const n = badge && counts ? counts[badge] : 0;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.9375rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:min-h-10",
                        active ? "bg-white/12 font-medium text-white" : "text-white/75 hover:bg-white/6 hover:text-white",
                      )}
                    >
                      {active && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-white" />}
                      <Icon className={cn("size-4 shrink-0", active ? "text-white" : "text-white/55")} aria-hidden />
                      <span className="flex-1 truncate">{label}</span>
                      {n > 0 && (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-brand-deep numerals-tabular">
                          {n > 99 ? "99+" : n}
                          <span className="sr-only"> waiting</span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/admin" className="inline-flex items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
      <Image src={dark ? siteConfig.logo.onDark : siteConfig.logo.onLight} alt="RiTECHS" width={siteConfig.logo.width} height={siteConfig.logo.height} className="h-9 w-auto" priority />
      <span className={cn("rounded-sm px-1.5 py-0.5 text-xs font-medium", dark ? "bg-white/12 text-white/85" : "bg-brand-wash text-brand")}>Admin</span>
    </Link>
  );
}

function AccountMenu({ user, onSignOut, signingOut }: { user: AdminUser; onSignOut: () => void; signingOut: boolean }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="inline-flex min-h-11 items-center gap-2.5 rounded-md py-1 pr-2 pl-1 text-left transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" aria-label={`Account menu for ${user.name}`}>
          <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-full bg-brand text-sm font-medium text-white">
            {initials(user.name)}
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block max-w-40 truncate text-sm font-medium text-ink">{user.name}</span>
            <span className="block text-xs text-faint-ink capitalize">{user.role}</span>
          </span>
          <ChevronDown className="hidden size-4 text-faint-ink sm:block" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 w-64 rounded-lg border border-rule bg-surface p-1.5 shadow-[0_16px_40px_-20px_rgba(32,33,36,0.45)]">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-xs text-faint-ink">{user.email}</p>
            <p className="mt-1.5 text-xs text-muted-ink">
              Two-step verification: <span className={user.twoFactorEnabled ? "text-success" : "text-muted-ink"}>{user.twoFactorEnabled ? "on" : "off (optional)"}</span>
            </p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-rule" />
          {[
            { href: routes.account, label: "My Account and Security", icon: CircleUser },
            { href: "/", label: "View Website", icon: ExternalLink, external: true },
          ].map(({ href, label, icon: Icon, external }) => (
            <DropdownMenu.Item key={href} asChild>
              <Link href={href} {...(external ? { target: "_blank", rel: "noopener" } : {})} className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm text-ink outline-none data-[highlighted]:bg-paper">
                <Icon className="size-4 text-faint-ink" aria-hidden />
                {label}
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-rule" />
          <DropdownMenu.Item
            disabled={signingOut}
            onSelect={(e) => {
              e.preventDefault();
              onSignOut();
            }}
            className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm text-destructive outline-none data-[highlighted]:bg-destructive-wash"
          >
            {signingOut ? <Spinner /> : <LogOut className="size-4" aria-hidden />}
            {signingOut ? "Signing Out…" : "Sign Out"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/* ------------------------------ two-factor setup ------------------------------ */

function TwoFactorSetup({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <Logo />
      <h1 className="mt-8 font-serif text-3xl text-ink">Turn On Two-Step Verification</h1>
      <p className="mt-2 text-[0.9375rem] text-muted-ink">
        Administrator accounts must use a code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…) as well as a
        password. This keeps the admin area safe even if a password leaks.
      </p>
      <TwoFactorEnableFlow email={user.email} onDone={onDone} />
    </main>
  );
}

/* ---------------------------------- shell --------------------------------- */

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "needs-2fa" | "error">("loading");
  const [menu, setMenu] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const counts = useCounts(state === "ready");
  const [today] = useState(() => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()));

  const load = useCallback(async () => {
    const res = await apiRaw<{ user: AdminUser }>("/me");
    if (!res.ok) {
      if (res.status === 401) router.replace(`${routes.login}?next=${encodeURIComponent(path)}`);
      else setState("error");
      return;
    }
    const u = res.data.user;
    setUser(u);
    if (u.role !== "admin" && u.role !== "editor") setState("forbidden");
    // Mandatory for admins only; editors may turn it on in My Account.
    else if (u.twoFactorRequired && !u.twoFactorEnabled) setState("needs-2fa");
    else setState("ready");
  }, [router, path]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(raf);
  }, [load]);

  if (state === "loading")
    return (
      <main id="main" className="flex flex-1 items-center justify-center px-4">
        <Loading label="Checking your access…" />
      </main>
    );
  if (state === "error")
    return (
      <main id="main" className="mx-auto max-w-lg flex-1 px-4 py-16">
        <Notice tone="error">The admin area could not be loaded. Check your connection and refresh the page.</Notice>
      </main>
    );
  if (state === "forbidden")
    return (
      <main id="main" className="mx-auto max-w-lg flex-1 px-4 py-16">
        <h1 className="font-serif text-3xl text-ink">Staff Only</h1>
        <p className="mt-3 text-muted-ink">Your account does not have access to the admin area.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href={routes.account}>Go to My Account</Link>
        </Button>
      </main>
    );
  if (state === "needs-2fa" && user) return <TwoFactorSetup user={user} onDone={() => void load()} />;

  const signOutNow = () =>
    startSignOut(async () => {
      await signOut();
      router.replace(routes.login);
    });

  return (
    <AdminCtx.Provider value={user}>
      <ToastProvider>
        <div className="flex min-h-dvh flex-1 bg-paper">
          <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-brand-deep px-3 py-5 text-white lg:flex">
            <div className="px-2">
              <Logo dark />
            </div>
            <div className="mt-8 flex-1 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin]">
              <Nav role={user!.role} counts={counts} />
            </div>
            <Link href="/" target="_blank" rel="noopener" className="mt-4 flex min-h-10 items-center gap-2.5 rounded-md border-t border-white/10 px-3 pt-4 text-sm text-white/70 hover:text-white">
              <ExternalLink className="size-4" aria-hidden /> View Website
            </Link>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-rule bg-surface/95 px-4 backdrop-blur-sm sm:px-6">
              <div className="flex items-center gap-2 lg:hidden">
                <Sheet open={menu} onOpenChange={setMenu}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Open admin menu">
                      <Menu aria-hidden />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 overflow-y-auto bg-brand-deep px-3 py-5 text-white [&>button:last-child]:text-white [&>button:last-child]:hover:bg-white/10">
                    <SheetTitle className="sr-only">Admin menu</SheetTitle>
                    <div className="px-2">
                      <Logo dark />
                    </div>
                    <div className="mt-8">
                      <Nav role={user!.role} counts={counts} onNavigate={() => setMenu(false)} />
                    </div>
                  </SheetContent>
                </Sheet>
                <Logo />
              </div>
              <p className="hidden text-sm text-muted-ink lg:block">{today}</p>
              <AccountMenu user={user!} onSignOut={signOutNow} signingOut={signingOut} />
            </header>
            <main id="main" className="flex-1">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </AdminCtx.Provider>
  );
}
