"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";
import { StatusPill } from "./StatusPill";
import { PageTransition } from "./PageTransition";
import styles from "./Navigation.module.css";

const navItems = [
  { path: "/", label: "首页" },
  { path: "/home", label: "工作台", authOnly: true },
  { path: "/onboarding", label: "建档" },
  { path: "/analysis", label: "初始分析" },
  { path: "/questionnaire", label: "持续问答" },
  { path: "/profile", label: "动态画像" },
  { path: "/match", label: "历史人物" },
  { path: "/advice", label: "改命建议" },
  { path: "/archive", label: "成长档案" },
  { path: "/create", label: "创作" },
];

const publicNavItems = navItems.filter((i) => !i.authOnly);
const authNavItems = navItems;

function PlanBadge({ plan }: { plan: "free" | "pro" | "master" }) {
  if (plan === "free") {
    return (
      <span className={`${styles.planBadge} ${styles.planBadgeFree}`}>
        免费
      </span>
    );
  }
  if (plan === "pro") {
    return (
      <span className={`${styles.planBadge} ${styles.planBadgePro}`}>PRO</span>
    );
  }
  return (
    <span className={`${styles.planBadge} ${styles.planBadgeMaster}`}>
      MASTER
    </span>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, plan, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [userMenuOpen]);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    router.push("/");
  };

  const firstChar = user?.displayName?.charAt(0) ?? "?";

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link
          href="/"
          className={styles.logo}
          onClick={() => setMobileMenuOpen(false)}
        >
          <span className={styles.logoIcon}>☯</span>
          <span className={styles.logoText}>逆天改命</span>
        </Link>

        <nav
          className={`${styles.nav} ${mobileMenuOpen ? styles.navOpen : ""}`}
        >
          {(isAuthenticated ? authNavItems : publicNavItems).map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.navItem} ${
                pathname === item.path ? styles.active : ""
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <StatusPill />
          {isAuthenticated && user ? (
            <>
              <PlanBadge plan={plan} />
              <div className={styles.navUserMenu} ref={userMenuRef}>
                <button
                  className={styles.navUserButton}
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <span className={styles.navUserAvatar}>{firstChar}</span>
                  <span
                    style={{
                      maxWidth: 80,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.displayName}
                  </span>
                  <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>▾</span>
                </button>
                {userMenuOpen && (
                  <div className={styles.navUserDropdown} role="menu">
                    <Link
                      href="/profile"
                      className={styles.navUserDropdownItem}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      我的画像
                    </Link>
                    <Link
                      href="/pricing"
                      className={styles.navUserDropdownItem}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      升级套餐
                    </Link>
                    <Link
                      href="/create"
                      className={styles.navUserDropdownItem}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      我的创作
                    </Link>
                    <div className={styles.navUserDropdownDivider} />
                    <button
                      className={styles.navUserDropdownItem}
                      onClick={handleLogout}
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`${styles.navItem} ${pathname === "/login" ? styles.active : ""}`}
              >
                登录
              </Link>
              <Link
                href="/signup"
                className="btn btn-primary"
                style={{ padding: "8px 16px", fontSize: "0.88rem" }}
              >
                免费注册
              </Link>
            </>
          )}
          <button
            className={styles.hamburger}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="菜单"
            aria-expanded={mobileMenuOpen}
          >
            <span
              className={`${styles.hamburgerLine} ${mobileMenuOpen ? styles.open : ""}`}
            />
            <span
              className={`${styles.hamburgerLine} ${mobileMenuOpen ? styles.open : ""}`}
            />
            <span
              className={`${styles.hamburgerLine} ${mobileMenuOpen ? styles.open : ""}`}
            />
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className={styles.mobileOverlay}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.appShell}>
      <Navigation />
      <main className={styles.main}>
        <PageTransition>{children}</PageTransition>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <span>逆天改命算命软件 · 原型演示</span>
          <span className={styles.footerDivider}>|</span>
          <span>持续交互演进画像系统</span>
        </div>
      </footer>
    </div>
  );
}
