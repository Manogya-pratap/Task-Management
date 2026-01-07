import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

// Custom hook for API calls with loading, error, and retry functionality
export const useApi = (url, options = {}) => {
  const {
    method = 'GET',
    params = {},
    data = null,
    immediate = true,
    onSuccess = null,
    onError = null,
    dependencies = []
  } = options;

  const [state, setState] = useState({
    data: null,
    loading: immediate,
    error: null,
    lastFetch: null
  });

  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const execute = useCallback(async (overrideOptions = {}) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    const finalOptions = {
      method,
      params: { ...params, ...overrideOptions.params },
      data: overrideOptions.data || data,
      signal: abortControllerRef.current.signal
    };

    try {
      if (isMountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          loading: true, 
          error: null 
        }));
      }

      let response;
      
      switch (method.toUpperCase()) {
        case 'GET':
          response = await api.get(url, { 
            params: finalOptions.params,
            signal: finalOptions.signal 
          });
          break;
        case 'POST':
          response = await api.post(url, finalOptions.data, { 
            params: finalOptions.params,
            signal: finalOptions.signal 
          });
          break;
        case 'PUT':
          response = await api.put(url, finalOptions.data, { 
            params: finalOptions.params,
            signal: finalOptions.signal 
          });
          break;
        case 'PATCH':
          response = await api.patch(url, finalOptions.data, { 
            params: finalOptions.params,
            signal: finalOptions.signal 
          });
          break;
        case 'DELETE':
          response = await api.delete(url, { 
            params: finalOptions.params,
            signal: finalOptions.signal 
          });
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      if (isMountedRef.current) {
        const responseData = response.data?.data || response.data;
        
        setState({
          data: responseData,
          loading: false,
          error: null,
          lastFetch: new Date()
        });

        if (onSuccess) {
          onSuccess(responseData, response);
        }

        return { success: true, data: responseData };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // Request was cancelled, don't update state
        return { success: false, cancelled: true };
      }

      if (isMountedRef.current) {
        const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
        
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }));

        if (onError) {
          onError(error);
        }

        return { success: false, error: errorMessage };
      }
    }

    return { success: false };
  }, [url, method, params, data, onSuccess, onError]);

  // Auto-execute on mount and dependency changes
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute, ...dependencies]);

  const retry = useCallback(() => {
    return execute();
  }, [execute]);

  const refetch = useCallback((newOptions = {}) => {
    return execute(newOptions);
  }, [execute]);

  return {
    ...state,
    execute,
    retry,
    refetch,
    isLoading: state.loading,
    hasError: !!state.error
  };
};

// Hook for paginated API calls
export const usePaginatedApi = (url, options = {}) => {
  const {
    pageSize = 10,
    initialPage = 1,
    ...apiOptions
  } = options;

  const [pagination, setPagination] = useState({
    page: initialPage,
    pageSize,
    total: 0,
    totalPages: 0
  });

  const apiCall = useApi(url, {
    ...apiOptions,
    params: {
      ...apiOptions.params,
      page: pagination.page,
      limit: pagination.pageSize
    },
    onSuccess: (data) => {
      if (data.pagination) {
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
        }));
      }
      if (apiOptions.onSuccess) {
        apiOptions.onSuccess(data);
      }
    }
  });

  const goToPage = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const nextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      goToPage(pagination.page + 1);
    }
  }, [pagination.page, pagination.totalPages, goToPage]);

  const prevPage = useCallback(() => {
    if (pagination.page > 1) {
      goToPage(pagination.page - 1);
    }
  }, [pagination.page, goToPage]);

  return {
    ...apiCall,
    pagination,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: pagination.page < pagination.totalPages,
    hasPrevPage: pagination.page > 1
  };
};

// Hook for real-time data with polling
export const usePollingApi = (url, options = {}) => {
  const {
    interval = 30000, // 30 seconds default
    enabled = true,
    ...apiOptions
  } = options;

  const intervalRef = useRef(null);
  const apiCall = useApi(url, { ...apiOptions, immediate: enabled });

  useEffect(() => {
    if (enabled && interval > 0) {
      intervalRef.current = setInterval(() => {
        apiCall.refetch();
      }, interval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [enabled, interval, apiCall.refetch]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      apiCall.refetch();
    }, interval);
  }, [interval, apiCall.refetch]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return {
    ...apiCall,
    startPolling,
    stopPolling,
    isPolling: !!intervalRef.current
  };
};

// Hook for optimistic updates
export const useOptimisticApi = (url, options = {}) => {
  const [optimisticData, setOptimisticData] = useState(null);
  const apiCall = useApi(url, options);

  const executeOptimistic = useCallback(async (optimisticUpdate, requestOptions = {}) => {
    // Apply optimistic update
    setOptimisticData(optimisticUpdate);

    try {
      const result = await apiCall.execute(requestOptions);
      
      if (result.success) {
        // Clear optimistic data on success
        setOptimisticData(null);
      } else {
        // Revert optimistic update on failure
        setOptimisticData(null);
      }

      return result;
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticData(null);
      throw error;
    }
  }, [apiCall.execute]);

  return {
    ...apiCall,
    data: optimisticData || apiCall.data,
    executeOptimistic,
    hasOptimisticUpdate: !!optimisticData
  };
};

export default useApi;