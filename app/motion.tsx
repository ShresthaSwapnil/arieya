"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis } from "lenis/react";
import { motion, useReducedMotion } from "motion/react";

export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/merchant") || pathname?.startsWith("/stylist") || pathname?.startsWith("/e/");
  if (reduced || isDashboard) return <>{children}</>;
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        anchors: true,
        autoRaf: true,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.0,
      }}
    >
      {children}
    </ReactLenis>
  );
}

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 32 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
