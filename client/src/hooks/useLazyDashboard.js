import { useState, useCallback, useRef } from "react";
import { useApp } from "../contexts/AppContext";

// Lazy loading configuration
const LAZY_LOAD_DELAY = 100; // 100ms delay between loads
const PRIORITY_LEVELS = {
  CRITICAL: 1, // Projects - needed for dashboard layout
  HIGH: 2, // Teams - needed for user assignments
  MEDIUM: 3, // Tasks - heavy data, load last
  LOW: 4, // Users - admin only, least critical
};

export const useLazyDashboard = () => {
  const {
    projects,
    tasks,
    teams,
    users,
    loading,
    fetchProjects,
    fetchTasks,
    fetchTeams,
    fetchUsers,
    user,
  } = useApp();

  const [lazyLoading, setLazyLoading] = useState({
    projects: false,
    tasks: false,
    teams: false,
    users: false,
  });

  const loadedSectionsRef = useRef({
    projects: false,
    tasks: false,
    teams: false,
    users: false,
    initialized: false, // ✅ Add initialization flag
  });

  const [loadedSections, setLoadedSections] = useState({
    projects: false,
    tasks: false,
    teams: false,
    users: false,
  });

  // Load data with priority and delay
  const loadSection = useCallback(
    async (section, priority = PRIORITY_LEVELS.MEDIUM) => {
      // Check if already loaded or loading
      if (loadedSectionsRef.current[section] || lazyLoading[section]) {
        console.log(`Section ${section} already loaded or loading, skipping`);
        return;
      }

      console.log(`Loading section: ${section} with priority: ${priority}`);
      setLazyLoading((prev) => ({ ...prev, [section]: true }));

      try {
        // Add delay based on priority to prevent server overload
        const delay = priority * LAZY_LOAD_DELAY;
        await new Promise((resolve) => setTimeout(resolve, delay));

        switch (section) {
          case "projects":
            await fetchProjects(false);
            break;
          case "tasks":
            try {
              await fetchTasks(false);
            } catch (error) {
              console.error(`Failed to load tasks, marking as loaded to prevent retry loop:`, error);
              // Mark as loaded even on error to prevent infinite retry
            }
            break;
          case "teams":
            await fetchTeams(false);
            break;
          case "users":
            if (user && ["managing_director", "it_admin"].includes(user.role)) {
              await fetchUsers(false);
            }
            break;
          default:
            console.warn(`Unknown section: ${section}`);
            break;
        }

        loadedSectionsRef.current[section] = true;
        setLoadedSections((prev) => ({ ...prev, [section]: true }));
        console.log(`Section ${section} loaded successfully`);
      } catch (error) {
        console.error(`Failed to load ${section}:`, error);
        // Mark as loaded even on error to prevent infinite retry loop
        loadedSectionsRef.current[section] = true;
        setLoadedSections((prev) => ({ ...prev, [section]: true }));
      } finally {
        setLazyLoading((prev) => ({ ...prev, [section]: false }));
      }
    },
    [
      fetchProjects,
      fetchTasks,
      fetchTeams,
      fetchUsers,
      user,
      lazyLoading
    ]
  );

  // ✅ FIX 4: Initialize lazy loading with proper memoization
  const initializeDashboard = useCallback(async () => {
    // Prevent multiple initializations
    if (loadedSectionsRef.current.initialized) {
      console.log('Dashboard already initialized, skipping');
      return;
    }
    
    console.log('initializeDashboard called');
    loadedSectionsRef.current.initialized = true;
    
    // Load critical data first
    if (!loadedSectionsRef.current.projects) {
      await loadSection("projects", PRIORITY_LEVELS.CRITICAL);
    }

    // Load high priority data
    if (!loadedSectionsRef.current.teams) {
      await loadSection("teams", PRIORITY_LEVELS.HIGH);
    }

    // Load medium priority data with delay
    setTimeout(() => {
      if (!loadedSectionsRef.current.tasks) {
        loadSection("tasks", PRIORITY_LEVELS.MEDIUM);
      }
    }, 500);

    // Load low priority data last
    setTimeout(() => {
      if (!loadedSectionsRef.current.users && user && ["managing_director", "it_admin"].includes(user.role)) {
        loadSection("users", PRIORITY_LEVELS.LOW);
      }
    }, 1000);
  }, [loadSection, user]);

  // Check if dashboard is ready
  const isDashboardReady = useCallback(() => {
    return (
      projects &&
      projects.length > 0 &&
      !loading.projects &&
      !lazyLoading.projects
    );
  }, [projects, loading.projects, lazyLoading.projects]);

  // ✅ FIX 5: Improved loading status - treat empty arrays as valid data
  const getLoadingStatus = useCallback(() => {
    const sections = ["projects", "teams", "tasks", "users"];
    const isLoading = sections.some(
      (section) => loading[section] || lazyLoading[section]
    );
    
    // ✅ For MD users, empty data is valid - don't treat as "no data"
    const hasData = loadedSectionsRef.current.projects || loadedSectionsRef.current.teams || loadedSectionsRef.current.tasks;
    const criticalLoaded = loadedSectionsRef.current.projects;

    return {
      isLoading,
      hasData,
      isPartiallyLoaded: hasData && isLoading,
      criticalLoaded,
      sections: {
        projects: loading.projects || lazyLoading.projects,
        teams: loading.teams || lazyLoading.teams,
        tasks: loading.tasks || lazyLoading.tasks,
        users: loading.users || lazyLoading.users,
      },
    };
  }, [loading, lazyLoading]);

  // Force reload specific section
  const reloadSection = useCallback(
    async (section) => {
      loadedSectionsRef.current[section] = false;
      setLoadedSections((prev) => ({ ...prev, [section]: false }));
      await loadSection(section, PRIORITY_LEVELS.CRITICAL);
    },
    [loadSection]
  );

  return {
    // Data
    projects,
    tasks,
    teams,
    users,

    // Loading states
    lazyLoading,
    loadedSections,
    loadingStatus: getLoadingStatus(),

    // Methods
    initializeDashboard,
    loadSection,
    reloadSection,
    isDashboardReady,
  };
};
