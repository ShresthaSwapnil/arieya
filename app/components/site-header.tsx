"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const smoothScrollTo = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      const headerOffset = 90;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      history.pushState(null, "", `#${targetId}`);
    }
  };

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string,
    isHomeOnly = false
  ) => {
    if (pathname === "/") {
      e.preventDefault();
      smoothScrollTo(targetId);
    }
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      history.pushState(null, "", "/");
    }
  };

  return (
    <header className={`site-header-sticky ${scrolled ? "is-scrolled" : ""}`}>
      <div className="site-header-inner wrap">
        {/* Brand Wordmark */}
        <Link
          href="/"
          onClick={handleLogoClick}
          className="wordmark"
          aria-label="Arieya home"
        >
          ARIEYA
        </Link>

        {/* Decluttered Central Navigation */}
        <nav className="site-header-nav" aria-label="Main navigation">
          {pathname === "/" ? (
            <a
              href="#how-it-works"
              onClick={(e) => handleNavClick(e, "how-it-works")}
            >
              How it works
            </a>
          ) : (
            <Link href="/#how-it-works">How it works</Link>
          )}

          {pathname === "/" ? (
            <a
              href="#pricing"
              onClick={(e) => handleNavClick(e, "pricing")}
            >
              Pricing
            </a>
          ) : (
            <Link
              href="/pricing"
              className={pathname === "/pricing" ? "is-active" : ""}
            >
              Pricing
            </Link>
          )}

          <Link
            href="/guide"
            className={pathname === "/guide" ? "is-active" : ""}
          >
            Guide
          </Link>
        </nav>

        {/* Decluttered Right Action Cluster */}
        <div className="site-header-actions">
          <Link href="/merchant?mode=login" className="site-header-link">
            Sign in
          </Link>

          <Link
            href="/merchant"
            className="button button--small site-header-cta"
          >
            Start free trial <span>↗</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
