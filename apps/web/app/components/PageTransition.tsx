"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./PageTransition.module.css";

/**
 * Wraps page content with a smooth fade-in on route change.
 * Uses pathname as key to trigger re-animation on navigation.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <div
      className={`${styles.wrapper} ${visible ? styles.visible : ""}`}
      key={pathname}
    >
      {children}
    </div>
  );
}
