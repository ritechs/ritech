"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavigationMenu } from "radix-ui";
import { ChevronDown, Menu, Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AccountNav, MobileAccountNav } from "@/components/layout/account-nav";
import { SearchDialog } from "@/components/layout/search-dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { navItemLinks, primaryNav, siteConfig, type NavItem, type NavLink } from "@/lib/site";
import { cn } from "@/lib/utils";

function useIsActive() {
  const pathname = usePathname();
  const matches = (href: string) => {
    const path = href.split("?")[0];
    if (path === "/") return pathname === "/";
    if (path.startsWith("/#")) return false;
    return pathname === path || pathname.startsWith(`${path}/`);
  };
  return (item: NavItem) => navItemLinks(item).some((l) => matches(l.href));
}

/**
 * One compact sticky row. Full navigation with dropdowns from 1280px;
 * below that, a slide-out menu. Search is a dialog available everywhere.
 *
 * On pages with a full-width hero (the home page) the header floats over it:
 * transparent with white text at the top, solid once the page scrolls. That is
 * decided in CSS (the home / over-hero variants in globals.css), not from the
 * URL, so the first paint is already right on every host.
 */
export function SiteHeader() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      if (window.scrollY > 24) el.setAttribute("data-scrolled", "");
      else el.removeAttribute("data-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      ref={ref}
      data-site-header
      className={cn(
        "sticky top-0 z-40 border-b border-transparent bg-surface/[0.98] transition-[background-color,border-color,box-shadow] duration-300",
        "data-[scrolled]:border-rule data-[scrolled]:shadow-[0_8px_24px_-20px_rgba(32,33,36,0.5)]",
        "home:fixed home:inset-x-0",
        "over-hero-self:border-white/15 over-hero-self:bg-transparent",
      )}
    >
      <div className="container-site flex h-16 items-center gap-4 md:h-[4.5rem] xl:gap-6">
        <Logo priority className="h-11 over-hero:hidden md:h-12" />
        <Logo priority tone="white" className="hidden h-11 over-hero:inline-flex md:h-12" />

        <DesktopNav />

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <SearchDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search"
                aria-keyshortcuts="/ Control+K Meta+K"
                className="over-hero:text-white over-hero:hover:bg-white/10"
              >
                <Search className="size-[1.125rem]" aria-hidden />
              </Button>
            }
          />
          <AccountNav />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

function DropdownLink({ link }: { link: NavLink }) {
  return (
    <NavigationMenu.Link asChild>
      <Link href={link.href} className="block rounded-md px-3 py-2 transition-colors hover:bg-brand-wash focus-visible:bg-brand-wash">
        <span className="block text-[0.9375rem] font-medium text-ink">{link.label}</span>
        {link.description && <span className="mt-0.5 block text-[0.8125rem] text-muted-ink">{link.description}</span>}
      </Link>
    </NavigationMenu.Link>
  );
}

function DesktopNav() {
  const isActive = useIsActive();
  const itemClass = cn(
    "relative inline-flex h-10 items-center gap-1 rounded-md px-2.5 text-[0.9375rem] whitespace-nowrap transition-colors 2xl:px-3",
    "text-ink/80 hover:bg-ink/[0.04] hover:text-ink data-[state=open]:bg-brand-wash data-[state=open]:text-brand",
    "over-hero:text-white/90 over-hero:hover:bg-white/10 over-hero:hover:text-white over-hero:data-[state=open]:bg-white/15 over-hero:data-[state=open]:text-white",
  );
  const activeClass =
    "font-medium text-brand after:absolute after:inset-x-2.5 after:-bottom-[15px] after:h-0.5 after:bg-brand over-hero:text-white over-hero:after:bg-highlight 2xl:after:inset-x-3";
  const panelClass =
    "absolute top-[calc(100%+0.75rem)] left-0 z-50 rounded-lg border border-rule bg-surface p-2 shadow-[0_20px_44px_-20px_rgba(32,33,36,0.35)] data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out";

  return (
    <NavigationMenu.Root aria-label="Main" className="relative hidden xl:block" delayDuration={80}>
      <NavigationMenu.List className="flex items-center">
        {primaryNav.map((item) => {
          const active = isActive(item);
          const hasMenu = !!(item.children || item.groups);

          if (!hasMenu) {
            return (
              <NavigationMenu.Item key={item.label}>
                <NavigationMenu.Link asChild active={active}>
                  <Link href={item.href} aria-current={active ? "page" : undefined} className={cn(itemClass, active && activeClass)}>
                    {item.label}
                  </Link>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
            );
          }

          return (
            <NavigationMenu.Item key={item.label} className="relative">
              <NavigationMenu.Trigger className={cn(itemClass, "group", active && activeClass)}>
                {item.label}
                <ChevronDown
                  className="size-3.5 text-faint-ink transition-transform duration-200 group-data-[state=open]:rotate-180 group-data-[state=open]:text-brand over-hero:text-white/70 over-hero:group-data-[state=open]:text-white"
                  aria-hidden
                />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className={cn(panelClass, item.groups ? "w-[34rem]" : "w-64")}>
                {item.groups ? (
                  <div className="grid grid-cols-2 gap-2">
                    {item.groups.map((group, gi) => (
                      <div key={group.heading} className={cn("p-1", gi > 0 && "border-l border-rule pl-3")}>
                        <p className="px-3 pt-1 pb-2 text-xs font-semibold text-brand">{group.heading}</p>
                        <ul>
                          {group.links.map((l) => (
                            <li key={l.label}>
                              <DropdownLink link={l} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul>
                    {item.children!.map((l) => (
                      <li key={l.label}>
                        <DropdownLink link={l} />
                      </li>
                    ))}
                  </ul>
                )}
              </NavigationMenu.Content>
            </NavigationMenu.Item>
          );
        })}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}

function MobileSubLink({ link }: { link: NavLink }) {
  return (
    <SheetClose asChild>
      <Link
        href={link.href}
        className="flex min-h-11 items-center rounded-md px-3 text-[0.9375rem] text-muted-ink hover:bg-brand-wash hover:text-ink"
      >
        {link.label}
      </Link>
    </SheetClose>
  );
}

function MobileMenu() {
  const isActive = useIsActive();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="xl:hidden over-hero:text-white over-hero:hover:bg-white/10" aria-label="Open menu">
          <Menu className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" aria-describedby={undefined} className="w-[min(24rem,90vw)] bg-surface">
        <div className="flex h-16 items-center border-b border-rule px-5 pr-16">
          <SheetTitle className="sr-only">{siteConfig.shortName} menu</SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
          <Logo className="h-11" />
        </div>

        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-3">
          <ul>
            {primaryNav.map((item) => {
              const active = isActive(item);
              const rowClass = cn(
                "flex min-h-12 w-full items-center justify-between rounded-md px-3 text-left text-[1.0625rem] transition-colors hover:bg-brand-wash",
                active ? "font-medium text-brand" : "text-ink",
              );
              if (!item.children && !item.groups) {
                return (
                  <li key={item.label}>
                    <SheetClose asChild>
                      <Link href={item.href} aria-current={active ? "page" : undefined} className={rowClass}>
                        {item.label}
                      </Link>
                    </SheetClose>
                  </li>
                );
              }
              return (
                <li key={item.label}>
                  <Collapsible defaultOpen={active}>
                    <CollapsibleTrigger className={cn(rowClass, "group")}>
                      {item.label}
                      <ChevronDown
                        className="size-4 text-faint-ink transition-transform duration-200 group-data-[state=open]:rotate-180"
                        aria-hidden
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                      <div className="mt-1 mb-2 ml-3 border-l border-brand-tint pl-2">
                        {item.groups ? (
                          item.groups.map((g) => (
                            <div key={g.heading} className="pb-1">
                              <p className="px-3 pt-2 pb-1 text-xs font-semibold text-brand">{g.heading}</p>
                              <ul>
                                {g.links.map((l) => (
                                  <li key={l.label}>
                                    <MobileSubLink link={l} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))
                        ) : (
                          <ul>
                            {item.children!.map((l) => (
                              <li key={l.label}>
                                <MobileSubLink link={l} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              );
            })}
          </ul>
        </nav>

        <MobileAccountNav />
      </SheetContent>
    </Sheet>
  );
}
