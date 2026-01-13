import React, { useMemo } from "react";
import { useRealTimeSync } from "../../hooks/useRealTimeSync";
import "../../styles/progress-animations.css";

const AnimatedProgressBar = ({
  value,
  variant = "success",
  animated = true,
  showLabel = true,
  showSyncStatus = false,
  dataType = "all",
  height = "8px",
  className = "",
  ...props
}) => {
  const { isSyncing, syncStatus, getSyncStatusText } = useRealTimeSync(
    dataType,
    true
  );

  // Determine animation class based on variant and sync status
  const animationClass = useMemo(() => {
    if (!animated) return "";

    const baseClass = "progress-bar-animated";
    const variantClass = variant ? ` bg-${variant}` : "";

    // Add special animation when syncing
    if (isSyncing) {
      return `${baseClass}${variantClass} syncing`;
    }

    return `${baseClass}${variantClass}`;
  }, [animated, variant, isSyncing]);

  // Generate progress bar classes
  const progressClasses = useMemo(() => {
    const classes = ["progress-enhanced"];
    if (className) classes.push(className);
    return classes.join(" ");
  }, [className]);

  const barClasses = useMemo(() => {
    const classes = [animationClass];
    if (isSyncing) classes.push("progress-bar-will-change");
    return classes.join(" ");
  }, [animationClass, isSyncing]);

  return (
    <div className="progress-wrapper">
      {/* Custom Progress Bar */}
      <div className={progressClasses} style={{ height }}>
        <div
          className={`progress-bar ${barClasses}`}
          role="progressbar"
          style={{ width: `${value}%` }}
          aria-valuenow={value}
          aria-valuemin="0"
          aria-valuemax="100"
          {...props}
        >
          {value > 10 && <span className="progress-bar-text">{value}%</span>}
        </div>

        {/* Sync Indicator */}
        {isSyncing && <div className="progress-sync-indicator" />}
      </div>

      {/* Label and Sync Status */}
      {(showLabel || showSyncStatus) && (
        <div className="d-flex justify-content-between align-items-center mt-2">
          {showLabel && <span className="progress-label">{value}%</span>}

          {showSyncStatus && (
            <div className={`sync-status ${syncStatus}`}>
              {getSyncStatusText()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnimatedProgressBar;
