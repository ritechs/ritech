"use client";

import { useEffect, useState } from "react";
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
 * On the home page the header floats over the full-width hero: transparent
 * with white text at the top, turning solid as soon as the page scrolls.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const home = usePathname() === "/";
  const overlay = home && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > (home ? 24 : 4));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [home]);

  return (
    <header
      data-overlay={overlay || undefined}
      className={cn(
        "top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300",
        home ? "fixed inset-x-0" : "sticky",
        overlay
          ? "border-white/15 bg-transparent"
          : cn("bg-surface/[0.98]", scrolled ? "border-rule shadow-[0_8px_24px_-20px_rgba(32,33,36,0.5)]" : "border-transparent"),
      )}
    >
      <div className="container-site flex h-16 items-center gap-4 md:h-[4.5rem] xl:gap-6">
        <Logo priority tone={overlay ? "white" : "brand"} className="h-11 md:h-12" />

        <DesktopNav overlay={overlay} />

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <SearchDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search"
                aria-keyshortcuts="/ Control+K Meta+K"
                className={overlay ? "text-white hover:bg-white/10" : undefined}
              >
                <Search className="size-[1.125rem]" aria-hidden />
              </Button>
            }
          />
          <AccountNav overlay={overlay} />
          <MobileMenu overlay={overlay} />
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

function DesktopNav({ overlay = false }: { overlay?: boolean }) {
  const isActive = useIsActive();
  const itemClass = cn(
    "relative inline-flex h-10 items-center gap-1 rounded-md px-2.5 text-[0.9375rem] whitespace-nowrap transition-colors 2xl:px-3",
    overlay
      ? "text-white/90 hover:bg-white/10 hover:text-white data-[state=open]:bg-white/15 data-[state=open]:text-white"
      : "text-ink/80 hover:bg-ink/[0.04] hover:text-ink data-[state=open]:bg-brand-wash data-[state=open]:text-brand",
  );
  const activeClass = cn(
    "font-medium after:absolute after:inset-x-2.5 after:-bottom-[15px] after:h-0.5 2xl:after:inset-x-3",
    overlay ? "text-white after:bg-highlight" : "text-brand after:bg-brand",
  );
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
                  className={cn(
                    "size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180",
                    overlay ? "text-white/70 group-data-[state=open]:text-white" : "text-faint-ink group-data-[state=open]:text-brand",
                  )}
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

function MobileMenu({ overlay = false }: { overlay?: boolean }) {
  const isActive = useIsActive();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("xl:hidden", overlay && "text-white hover:bg-white/10")} aria-label="Open menu">
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
