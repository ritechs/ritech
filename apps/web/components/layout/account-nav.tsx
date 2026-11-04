"use client";

import { useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { ChevronDown, CircleUser, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { signOut } from "@/lib/auth/client";
import { isStaff, useSession, type SessionUser } from "@/lib/auth/session";
import { routes } from "@/lib/site";
import { cn, initials } from "@/lib/utils";

function useSignOut() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      await signOut();
      router.replace("/");
      router.refresh();
    });
  return [pending, run] as const;
}

const links = (u: SessionUser) =>
  isStaff(u)
    ? [
        { href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
        { href: routes.account, label: "My Account", icon: CircleUser },
      ]
    : [
        { href: routes.dashboard, label: "My Dashboard", icon: LayoutDashboard },
        { href: `${routes.dashboard}/profile`, label: "Edit My Profile", icon: CircleUser },
      ];

/** Header, wide screens: Login and Register, or the signed-in person's menu. Turns white over the home-page hero (over-hero variant). */
export function AccountNav() {
  const user = useSession();
  const [signingOut, doSignOut] = useSignOut();

  // While checking, keep the space the buttons take so the header doesn't jump.
  if (user === undefined) return <span aria-hidden className="hidden h-10 w-[11.5rem] sm:inline-block" />;

  if (!user)
    return (
      <>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="hidden h-10 px-3 text-[0.9375rem] text-ink sm:inline-flex over-hero:text-white over-hero:hover:bg-white/10"
        >
          <Link href={routes.login}>Login</Link>
        </Button>
        <Button
          asChild
          size="sm"
          className="hidden h-10 px-4 text-[0.9375rem] sm:inline-flex over-hero:bg-white over-hero:text-brand over-hero:hover:bg-brand-wash"
        >
          <Link href={routes.register}>Register</Link>
        </Button>
      </>
    );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${user.name}`}
          className="hidden min-h-11 items-center gap-2 rounded-full py-1 pr-2.5 pl-1 text-left transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:inline-flex over-hero:hover:bg-white/10 over-hero:focus-visible:outline-white"
        >
          <span
            aria-hidden
            className="inline-flex size-9 items-center justify-center rounded-full bg-brand text-sm font-medium text-white over-hero:bg-white over-hero:text-brand"
          >
            {initials(user.name)}
          </span>
          <span className="hidden max-w-36 truncate text-[0.9375rem] font-medium text-ink lg:block over-hero:text-white">{user.name.split(" ")[0]}</span>
          <ChevronDown className="size-4 text-faint-ink over-hero:text-white/75" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-64 rounded-lg border border-rule bg-surface p-1.5 shadow-[0_16px_40px_-20px_rgba(32,33,36,0.45)]">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-xs text-faint-ink">{user.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-rule" />
          {links(user).map(({ href, label, icon: Icon }) => (
            <DropdownMenu.Item key={href} asChild>
              <Link href={href} className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm text-ink outline-none data-[highlighted]:bg-paper">
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
              doSignOut();
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

/** Bottom of the mobile menu: Login and Register, or the account links and Sign Out. */
export function MobileAccountNav() {
  const user = useSession();
  const [signingOut, doSignOut] = useSignOut();

  if (!user)
    return (
      <div className={cn("grid grid-cols-2 gap-2 border-t border-rule p-5", user === undefined && "invisible")}>
        <SheetClose asChild>
          <Button asChild variant="outline" size="lg">
            <Link href={routes.login}>Login</Link>
          </Button>
        </SheetClose>
        <SheetClose asChild>
          <Button asChild size="lg">
            <Link href={routes.register}>Register</Link>
          </Button>
        </SheetClose>
      </div>
    );

  return (
    <div className="border-t border-rule p-5">
      <div className="flex items-center gap-3">
        <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-medium text-white">
          {initials(user.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">{user.name}</span>
          <span className="block truncate text-sm text-muted-ink">{user.email}</span>
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {links(user).map(({ href, label }) => (
          <SheetClose key={href} asChild>
            <Button asChild variant="outline" size="lg" className={links(user).length === 1 ? "col-span-2" : undefined}>
              <Link href={href}>{label}</Link>
            </Button>
          </SheetClose>
        ))}
        <Button variant="ghost" size="lg" className="col-span-2 text-destructive" disabled={signingOut} onClick={doSignOut}>
          {signingOut ? <Spinner /> : <LogOut aria-hidden />}
          {signingOut ? "Signing Out…" : "Sign Out"}
        </Button>
      </div>
    </div>
  );
}

/**
 * On the login and register pages: someone who arrives already signed in is
 * taken on (to ?next=, else the dashboard for staff or My Account). Signing in
 * on the page itself is left to the form.
 */
export function RedirectIfSignedIn() {
  const user = useSession();
  const router = useRouter();
  const first = useRef<SessionUser | null | undefined>(undefined);
  useEffect(() => {
    if (user === undefined || first.current !== undefined) return;
    first.current = user;
    if (!user) return;
    const next = new URLSearchParams(window.location.search).get("next");
    const safe = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
    router.replace(safe ?? (isStaff(user) ? "/admin" : routes.dashboard));
  }, [user, router]);
  return null;
}
