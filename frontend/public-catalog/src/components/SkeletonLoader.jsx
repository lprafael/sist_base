import React from "react";
import "../styles/Skeleton.css";

const SkeletonCard = ({ viewMode }) => {
  if (viewMode === "list") {
    return (
      <div className="skeleton-row">
        <div className="skeleton-thumb" />
        <div className="skeleton-body">
          <div className="skeleton-badge" />
          <div className="skeleton-title" />
          <div className="skeleton-meta" />
        </div>
        <div className="skeleton-side">
          <div className="skeleton-price" />
          <div className="skeleton-btn" />
        </div>
      </div>
    );
  }

  return (
    <div className="skeleton-card">
      <div className="skeleton-img" />
      <div className="skeleton-info">
        <div className="skeleton-title" />
        <div className="skeleton-price" />
        <div className="skeleton-specs" />
      </div>
    </div>
  );
};

const SkeletonLoader = ({ count = 8, viewMode = "grid" }) => {
  return (
    <div className={viewMode === "grid" ? "mc-grid" : "mc-list"}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} viewMode={viewMode} />
      ))}
    </div>
  );
};

export default SkeletonLoader;
