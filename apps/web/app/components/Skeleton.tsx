"use client";

import styles from "./Skeleton.module.css";

/**
 * Skeleton placeholder component for loading states.
 *
 * Usage:
 *   <Skeleton width="60%" height={20} />
 *   <SkeletonCard /> for pre-composed card skeleton
 */

export function Skeleton({
  width = "100%",
  height = 16,
  radius = 4,
  className = "",
  style,
}: {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`${styles.skeleton} ${className}`}
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({
  lines = 3,
  lastWidth = "70%",
}: {
  lines?: number;
  lastWidth?: string;
}) {
  return (
    <div className={styles.textGroup}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          width={i === lines - 1 ? lastWidth : "100%"}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({
  rows = 3,
  showAvatar = false,
}: {
  rows?: number;
  showAvatar?: boolean;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        {showAvatar && (
          <Skeleton width={40} height={40} radius="50%" />
        )}
        <div style={{ flex: 1 }}>
          <Skeleton width="40%" height={14} />
          <div style={{ height: 6 }} />
          <Skeleton width="25%" height={10} />
        </div>
      </div>
      <SkeletonText lines={rows} />
    </div>
  );
}

export function SkeletonGrid({
  count = 6,
  showAvatar = true,
}: {
  count?: number;
  showAvatar?: boolean;
}) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} showAvatar={showAvatar} />
      ))}
    </div>
  );
}
