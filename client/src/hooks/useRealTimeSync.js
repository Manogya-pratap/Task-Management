import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../contexts/AppContext";

// Synchronization configuration
const SYNC_INTERVAL = 30000; // 30 seconds
const CACHE_DURATION = 300000; // 5 minutes
const RETRY_DELAY = 5000; // 5 seconds

export const useRealTimeSync = (dataType = "all", autoSync = true) => {
  const {
    fetchAllData,
    fetchTasks,
    fetchProjects,
    loading,
    errors,
    tasks,
    projects,
  } = useApp();

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, success, error
  const [retryCount, setRetryCount] = useState(0);

  const syncIntervalRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const lastSyncRef = useRef(null);

  // Calculate progress based on task and project data
  const calculateProgress = useCallback(() => {
    if (!tasks || !projects || tasks.length === 0 || projects.length === 0) {
      return {
        overall: 0,
        byProject: {},
        byStatus: {
          new: 0,
          scheduled: 0,
          in_progress: 0,
          completed: 0,
        },
      };
    }

    // Calculate overall completion
    const completedTasks = tasks.filter(
      (task) => task.status === "completed"
    ).length;
    const totalTasks = tasks.length;
    const overall =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate progress by project
    const byProject = {};
    projects.forEach((project) => {
      const projectTasks = tasks.filter(
        (task) => task.projectId === project._id
      );
      const completedProjectTasks = projectTasks.filter(
        (task) => task.status === "completed"
      ).length;
      const totalProjectTasks = projectTasks.length;
      byProject[project._id] =
        totalProjectTasks > 0
          ? Math.round((completedProjectTasks / totalProjectTasks) * 100)
          : 0;
    });

    // Calculate progress by status
    const byStatus = {
      new: tasks.filter((task) => task.status === "new").length,
      scheduled: tasks.filter((task) => task.status === "scheduled").length,
      in_progress: tasks.filter((task) => task.status === "in_progress").length,
      completed: completedTasks,
    };

    return {
      overall,
      byProject,
      byStatus,
      totalTasks,
      completedTasks,
    };
  }, [tasks, projects]);

  // Sync function with retry logic
  const syncData = useCallback(
    async (force = false) => {
      if (isSyncing) return;

      // Check if we need to sync (cache validation)
      if (
        !force &&
        lastSyncRef.current &&
        Date.now() - lastSyncRef.current < CACHE_DURATION
      ) {
        return;
      }

      setIsSyncing(true);
      setSyncStatus("syncing");

      try {
        console.log(`🔄 Real-time sync: Syncing ${dataType} data...`);

        // Sync based on data type
        if (dataType === "tasks" || dataType === "all") {
          await fetchTasks(force);
        }

        if (dataType === "projects" || dataType === "all") {
          await fetchProjects(force);
        }

        if (dataType === "all") {
          await fetchAllData(force);
        }

        lastSyncRef.current = Date.now();
        setLastSyncTime(new Date());
        setSyncStatus("success");
        setRetryCount(0);

        console.log(`✅ Real-time sync: Successfully synced ${dataType} data`);
      } catch (error) {
        console.error(
          `❌ Real-time sync: Failed to sync ${dataType} data:`,
          error
        );
        setSyncStatus("error");

        // Retry logic
        if (retryCount < 3) {
          console.log(
            `🔄 Real-time sync: Retrying in ${RETRY_DELAY / 1000} seconds...`
          );
          retryTimeoutRef.current = setTimeout(() => {
            setRetryCount((prev) => prev + 1);
            syncData(force);
          }, RETRY_DELAY);
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [dataType, fetchTasks, fetchProjects, fetchAllData, isSyncing, retryCount]
  );

  // Auto-sync setup
  useEffect(() => {
    if (!autoSync) return;

    // Initial sync
    syncData(true);

    // Set up interval sync
    syncIntervalRef.current = setInterval(() => {
      syncData();
    }, SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [autoSync, syncData]);

  // Manual sync trigger
  const manualSync = useCallback(() => {
    console.log("🔄 Real-time sync: Manual sync triggered");
    syncData(true);
  }, [syncData]);

  // Get sync status text
  const getSyncStatusText = useCallback(() => {
    switch (syncStatus) {
      case "syncing":
        return "Syncing...";
      case "success":
        return lastSyncTime
          ? `Last sync: ${lastSyncTime.toLocaleTimeString()}`
          : "Synced";
      case "error":
        return retryCount > 0 ? `Retry ${retryCount}/3` : "Sync failed";
      default:
        return "Idle";
    }
  }, [syncStatus, lastSyncTime, retryCount]);

  // Check if data is fresh
  const isDataFresh = useCallback(() => {
    return (
      lastSyncRef.current && Date.now() - lastSyncRef.current < CACHE_DURATION
    );
  }, []);

  return {
    // Sync state
    isSyncing,
    syncStatus,
    lastSyncTime,
    getSyncStatusText,
    isDataFresh,

    // Progress data
    progress: calculateProgress(),

    // Actions
    manualSync,
    syncData,

    // Loading and error states
    loading,
    errors,
  };
};
