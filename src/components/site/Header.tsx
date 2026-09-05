"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, X, LayoutDashboard, LogOut, User as UserIcon, Car, Shield } from "lucide-react";

import { Logo } from "@/components/Logo";
import { LocaleSwitcher } from "@/components/site/LocaleSwitcher";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { cn, initials } from "@/lib/utils";
import type { UserRole } from "@/db/schema";

export type HeaderUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
};

export function Header({ user }: { user: HeaderUser | null }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // The header starts transparent over the hero and gains a solid backing
  // once the page moves, so the wordmark never sits on busy imagery.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Any navigation closes the mobile drawer.
  useEffect(() => setOpen(false), [pathname]);

  // While the drawer is open the page behind it must not scroll.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { href: "/", label: t.nav.home },
    { href: "/fleet", label: t.nav.fleet },
    { href: "/about", label: t.nav.about },
    { href: "/contact", label: t.nav.contact },
  ];

  const areaLink =
    user?.role === "admin"
      ? { href: "/admin", label: t.nav.adminPanel, icon: Shield }
      : user?.role === "driver"
        ? { href: "/driver", label: t.nav.driverArea, icon: Car }
        : user
          ? { href: "/account", label: t.nav.myAccount, icon: LayoutDashboard }
          : null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        scrolled || open
          ? "border-b border-ink-700/80 bg-ink-950/92 backdrop-blur-xl"
          : "border-b border-transparent bg-gradient-to-b from-ink-950/80 to-transparent",
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-5 lg:px-8">
        <Link href="/" aria-label={t.common.brand}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-9 lg:flex" aria-label={t.nav.menu}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative py-1 text-[0.8rem] uppercase tracking-[0.16em] transition-colors",
                isActive(link.href) ? "text-gold-300" : "text-ink-200 hover:text-gold-200",
              )}
            >
              {link.label}
              {isActive(link.href) ? (
                <span className="absolute -bottom-0.5 left-0 h-px w-full bg-gold-500" />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <LocaleSwitcher />
          <span className="h-5 w-px bg-ink-700" aria-hidden />

          {user ? (
            <div className="flex items-center gap-3">
              {areaLink ? (
                <Link
                  href={areaLink.href}
                  className="flex items-center gap-2 text-xs uppercase tracking-widest text-ink-200 transition-colors hover:text-gold-200"
                >
                  <areaLink.icon className="size-3.5" aria-hidden />
                  {areaLink.label}
                </Link>
              ) : null}
              <span
                className="grid size-9 place-items-center rounded-full border border-gold-600/40 bg-ink-800 text-xs text-gold-200"
                title={user.email ?? undefined}
              >
                {initials(user.name ?? user.email)}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-ink-400 transition-colors hover:text-danger"
                aria-label={t.nav.logout}
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs uppercase tracking-widest text-ink-200 transition-colors hover:text-gold-200"
            >
              {t.nav.login}
            </Link>
          )}

          <Button asChild size="sm">
            <Link href="/booking">{t.common.book}</Link>
          </Button>
        </div>

        <button
          type="button"
          className="grid size-10 place-items-center text-ink-100 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={t.nav.menu}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-menu"
        hidden={!open}
        className="border-t border-ink-800 bg-ink-950/98 backdrop-blur-xl lg:hidden"
      >
        <nav className="mx-auto flex max-w-7xl flex-col px-5 py-6" aria-label={t.nav.menu}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "border-b border-ink-800/80 py-4 text-sm uppercase tracking-[0.16em]",
                isActive(link.href) ? "text-gold-300" : "text-ink-200",
              )}
            >
              {link.label}
            </Link>
          ))}

          {user ? (
            <>
              {areaLink ? (
                <Link
                  href={areaLink.href}
                  className="flex items-center gap-2 border-b border-ink-800/80 py-4 text-sm uppercase tracking-[0.16em] text-ink-200"
                >
                  <areaLink.icon className="size-4" aria-hidden />
                  {areaLink.label}
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-2 border-b border-ink-800/80 py-4 text-left text-sm uppercase tracking-[0.16em] text-ink-300"
              >
                <LogOut className="size-4" aria-hidden />
                {t.nav.logout}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 border-b border-ink-800/80 py-4 text-sm uppercase tracking-[0.16em] text-ink-200"
            >
              <UserIcon className="size-4" aria-hidden />
              {t.nav.login}
            </Link>
          )}

          <div className="mt-6 flex items-center justify-between">
            <LocaleSwitcher />
            <Button asChild size="sm">
              <Link href="/booking">{t.common.book}</Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
