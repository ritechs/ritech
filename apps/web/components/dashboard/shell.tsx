"use client";

import { createContext, useCallback, useContext, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import {
  BookOpenCheck,
  ChevronDown,
  ExternalLink,
  FolderKanban,
  Handshake,
  Inbox,
  Landmark,
  LayoutDashboard,
  Library,
  LogOut,
  FileText,
  GraduationCap,
  Mail,
  Menu,
  MessagesSquare,
  Settings,
  Tags,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Notice } from "@/components/auth/field";
import { Loading, ToastProvider } from "@/components/admin/ui";
import { apiRaw } from "@/lib/api/client";
import { signOut } from "@/lib/auth/client";
import { routes, siteConfig } from "@/lib/site";
import { cn, initials } from "@/lib/utils";

export interface MemberProfile {
  userId: string;
  type: "mentor" | "mentee";
  status: "pending" | "approved" | "rejected" | "suspended";
  slug: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  phoneE164: string | null;
  position: string;
  qualification: string | null;
  affiliation: string;
  country: string | null;
  city: string | null;
  bio: string;
  researchField: string | null;
  citations: number | null;
  links: Record<string, string>;
  projects: { title: string; topic?: string; collaborators?: string; year?: string }[];
  showInDirectory: boolean;
  photoUrl: string | null;
  expertise: { id: string; name: string }[];
}
export interface MemberMe {
  user: { id: string; name: string; email: string; role: string; twoFactorEnabled: boolean | null; twoFactorRequired?: boolean };
  profile: MemberProfile;
  pendingMembershipChange: { toType: string; createdAt: string } | null;
}
export interface Counts {
  pendingRequests: number;
  unreadMessages: number;
}

interface Ctx {
  me: MemberMe;
  /** Re-reads the profile (after a save) so the sidebar and every page stay in step. */
  refresh: () => Promise<void>;
  counts: Counts | null;
  refreshCounts: () => void;
}
const MemberCtx = createContext<Ctx | null>(null);
export const useMember = () => useContext(MemberCtx)!;
export const isMentor = (me: MemberMe) => me.profile.type === "mentor";

type Badge = keyof Counts;
interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  badge?: Badge;
}
function nav(mentor: boolean): { group: string; items: NavItem[] }[] {
  const profile: NavItem[] = [
    { href: "/dashboard/profile", label: "Basic Info", icon: UserRound },
    { href: "/dashboard/biography", label: "Biography", icon: FileText },
    { href: "/dashboard/scholar", label: "Scholar ID", icon: GraduationCap },
    { href: "/dashboard/expertise", label: "Expertise", icon: Tags },
    { href: "/dashboard/projects", label: mentor ? "Research Projects" : "Projects", icon: FolderKanban },
  ];
  if (mentor)
    return [
      { group: "", items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }] },
      { group: "My Profile", items: [...profile, { href: "/dashboard/resources", label: "Resources", icon: Library }] },
      {
        group: "Mentoring",
        items: [
          { href: "/dashboard/people", label: "My Mentees", icon: Users },
          { href: "/dashboard/requests", label: "Requests", icon: Inbox, badge: "pendingRequests" },
          { href: "/dashboard/messages", label: "Messages", icon: MessagesSquare, badge: "unreadMessages" },
          { href: "/dashboard/mail", label: "Mail RiTECHS", icon: Mail },
        ],
      },
      {
        group: "Opportunities",
        items: [
          { href: "/dashboard/courses", label: "My Courses", icon: BookOpenCheck },
          { href: "/dashboard/funding", label: "Funding & Grants", icon: Landmark },
        ],
      },
      { group: "Account", items: [{ href: "/dashboard/settings", label: "Settings & Security", icon: Settings }] },
    ];
  return [
    { group: "", items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }] },
    { group: "My Profile", items: profile },
    {
      group: "Mentoring",
      items: [
        { href: "/dashboard/people", label: "My Mentors", icon: Users },
        { href: "/dashboard/messages", label: "Messages", icon: MessagesSquare, badge: "unreadMessages" },
        { href: "/dashboard/mail", label: "Mail", icon: Mail },
        { href: "/dashboard/requests?box=out", label: "My Requests", icon: Inbox },
      ],
    },
    { group: "Account", items: [{ href: "/dashboard/settings", label: "Settings & Security", icon: Settings }] },
  ];
}

function Nav({ mentor, counts, onNavigate }: { mentor: boolean; counts: Counts | null; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="space-y-5">
      {nav(mentor).map(({ group, items }) => {
        const visible = items;
        if (!visible.length) return null;
        return (
          <div key={group || "home"}>
            {group && <p className="px-3 pb-1.5 text-xs font-medium text-faint-ink">{group}</p>}
            <ul className="space-y-0.5">
              {visible.map(({ href, label, icon: Icon, badge }) => {
                const base = href.split("?")[0]!;
                const active = base === "/dashboard" ? path === base : path === base || path.startsWith(`${base}/`);
                const n = badge && counts ? counts[badge] : 0;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.9375rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:min-h-10",
                        active ? "bg-brand-wash font-medium text-brand" : "text-ink/80 hover:bg-paper hover:text-ink",
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", active ? "text-brand" : "text-faint-ink")} aria-hidden />
                      <span className="flex-1 truncate">{label}</span>
                      {n > 0 && (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-white numerals-tabular">
                          {n > 99 ? "99+" : n}
                          <span className="sr-only"> new</span>
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

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- member photos come from the API's storage or the old site
    <img src={src} alt="" className={cn("shrink-0 rounded-full bg-paper object-cover", className)} />
  ) : (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-brand-wash font-medium text-brand", className)}>
      {initials(name)}
    </span>
  );
}

const STATUS: Record<MemberProfile["status"], { text: string; tone: string }> = {
  approved: { text: "Approved", tone: "text-success" },
  pending: { text: "Awaiting approval", tone: "text-warning" },
  rejected: { text: "Not approved", tone: "text-destructive" },
  suspended: { text: "Suspended", tone: "text-destructive" },
};

function ProfileCard({ me }: { me: MemberMe }) {
  const p = me.profile;
  const name = `${p.firstName} ${p.lastName}`.trim();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-rule bg-paper/60 p-3">
      <Avatar name={name} src={p.photoUrl} className="size-12 text-base" />
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{name}</p>
        <p className="text-xs text-muted-ink capitalize">
          {p.type} · <span className={STATUS[p.status].tone}>{STATUS[p.status].text}</span>
        </p>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <Link href="/dashboard" className="inline-flex items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
      <Image src={siteConfig.logo.onLight} alt="RiTECHS" width={siteConfig.logo.width} height={siteConfig.logo.height} className="h-9 w-auto" priority />
    </Link>
  );
}

function AccountMenu({ me, onSignOut, signingOut }: { me: MemberMe; onSignOut: () => void; signingOut: boolean }) {
  const p = me.profile;
  const name = `${p.firstName} ${p.lastName}`.trim();
  const items = [
    ...(p.type === "mentor" && p.status === "approved" ? [{ href: routes.mentor(p.slug), label: "View My Public Profile", icon: ExternalLink, external: true }] : []),
    { href: "/dashboard/settings", label: "Settings & Security", icon: Settings },
    { href: "/", label: "Back to Website", icon: Handshake },
  ];
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="inline-flex min-h-11 items-center gap-2.5 rounded-md py-1 pr-2 pl-1 text-left transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" aria-label={`Account menu for ${name}`}>
          <Avatar name={name} src={p.photoUrl} className="size-9 text-sm" />
          <span className="hidden min-w-0 sm:block">
            <span className="block max-w-40 truncate text-sm font-medium text-ink">{name}</span>
            <span className="block text-xs text-faint-ink capitalize">{p.type}</span>
          </span>
          <ChevronDown className="hidden size-4 text-faint-ink sm:block" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 w-64 rounded-lg border border-rule bg-surface p-1.5 shadow-[0_16px_40px_-20px_rgba(32,33,36,0.45)]">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-ink">{name}</p>
            <p className="truncate text-xs text-faint-ink">{me.user.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-rule" />
          {items.map(({ href, label, icon: Icon, external }) => (
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

export function MemberShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<MemberMe | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "no-profile" | "error">("loading");
  const [counts, setCounts] = useState<Counts | null>(null);
  const [menu, setMenu] = useState(false);
  const [signingOut, startSignOut] = useTransition();

  const load = useCallback(async () => {
    const res = await apiRaw<MemberMe & { profile: MemberProfile | null }>("/me");
    if (!res.ok) {
      if (res.status === 401) router.replace(`${routes.login}?next=${encodeURIComponent(path)}`);
      else setState("error");
      return;
    }
    if (!res.data.profile) {
      setMe(null);
      setState("no-profile");
      return;
    }
    setMe(res.data as MemberMe);
    setState("ready");
  }, [router, path]);

  const loadCounts = useCallback(() => {
    void apiRaw<{ counts: Counts }>("/me/workspace").then((r) => r.ok && setCounts({ pendingRequests: r.data.counts.pendingRequests, unreadMessages: r.data.counts.unreadMessages }));
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(raf);
    // Only on first load; pages call refresh() after saving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (state !== "ready") return;
    const raf = requestAnimationFrame(loadCounts);
    return () => cancelAnimationFrame(raf);
  }, [state, path, loadCounts]);

  if (state === "loading")
    return (
      <main id="main" className="flex min-h-dvh flex-1 items-center justify-center px-4">
        <Loading label="Opening your dashboard…" />
      </main>
    );
  if (state === "error")
    return (
      <main id="main" className="mx-auto max-w-lg flex-1 px-4 py-16">
        <Notice tone="error">Your dashboard could not be loaded. Check your connection and refresh the page.</Notice>
      </main>
    );
  if (state === "no-profile" || !me)
    return (
      <main id="main" className="mx-auto max-w-lg flex-1 px-4 py-16">
        <Logo />
        <h1 className="mt-8 font-serif text-3xl text-ink">Member Dashboard</h1>
        <p className="mt-3 text-muted-ink">This dashboard is for RiTECHS mentors and mentees. Your account does not have a membership profile.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={routes.register}>Become a Member</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={routes.account}>My Account</Link>
          </Button>
        </div>
      </main>
    );

  const mentor = isMentor(me);
  const signOutNow = () =>
    startSignOut(async () => {
      await signOut();
      router.replace(routes.login);
    });

  return (
    <MemberCtx.Provider value={{ me, refresh: load, counts, refreshCounts: loadCounts }}>
      <ToastProvider>
        <div className="flex min-h-dvh flex-1 bg-paper">
          <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-rule bg-surface px-4 py-5 lg:flex">
            <div className="px-1">
              <Logo />
            </div>
            <div className="mt-6">
              <ProfileCard me={me} />
            </div>
            <div className="mt-6 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
              <Nav mentor={mentor} counts={counts} />
            </div>
            <Link href="/" className="mt-4 flex min-h-10 items-center gap-2.5 rounded-md border-t border-rule px-3 pt-4 text-sm text-muted-ink hover:text-ink">
              <ExternalLink className="size-4" aria-hidden /> Back to Website
            </Link>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-rule bg-surface/95 px-4 backdrop-blur-sm sm:px-6">
              <div className="flex items-center gap-2 lg:hidden">
                <Sheet open={menu} onOpenChange={setMenu}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Open dashboard menu">
                      <Menu aria-hidden />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[19rem] overflow-y-auto px-4 py-5">
                    <SheetTitle className="sr-only">Dashboard menu</SheetTitle>
                    <div className="px-1">
                      <Logo />
                    </div>
                    <div className="mt-6">
                      <ProfileCard me={me} />
                    </div>
                    <div className="mt-6">
                      <Nav mentor={mentor} counts={counts} onNavigate={() => setMenu(false)} />
                    </div>
                  </SheetContent>
                </Sheet>
                <Logo />
              </div>
              <p className="hidden text-sm text-muted-ink lg:block">
                {mentor ? "Mentor" : "Mentee"} Dashboard
              </p>
              <AccountMenu me={me} onSignOut={signOutNow} signingOut={signingOut} />
            </header>
            <main id="main" className="flex-1">
              {me.profile.status !== "approved" && <StatusBanner status={me.profile.status} />}
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </MemberCtx.Provider>
  );
}

function StatusBanner({ status }: { status: MemberProfile["status"] }) {
  const text: Record<string, string> = {
    pending: "Your membership is being reviewed. You can complete your profile now; requests and messages open once you are approved.",
    rejected: "Your application was not approved. Contact info@ritechs.org if you have questions.",
    suspended: "Your membership is suspended, so changes are paused. Contact info@ritechs.org.",
  };
  return (
    <div className="border-b border-warning/25 bg-warning-wash px-4 py-3 text-sm text-ink sm:px-6 lg:px-8" role="status">
      {text[status]}
    </div>
  );
}
