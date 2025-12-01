import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook để tự động refresh data theo interval
 * @param fetchFn - Function để fetch data
 * @param intervalMs - Interval time (milliseconds), mặc định 30 giây
 * @param enabled - Có bật auto-refresh không, mặc định true
 * @param immediate - Có gọi fetch ngay lập tức không, mặc định true
 */
export function useAutoRefresh<T = void>(
  fetchFn: () => Promise<T> | void,
  intervalMs: number = 30000, // 30 giây mặc định
  enabled: boolean = true,
  immediate: boolean = true
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const fetchFnRef = useRef(fetchFn)

  // Update ref khi fetchFn thay đổi
  useEffect(() => {
    fetchFnRef.current = fetchFn
  }, [fetchFn])

  const startAutoRefresh = useCallback(() => {
    if (!enabled || intervalMs <= 0) return

    // Clear interval cũ nếu có
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Gọi fetch ngay lập tức nếu cần
    if (immediate) {
      fetchFnRef.current()
    }

    // Setup interval
    intervalRef.current = setInterval(() => {
      fetchFnRef.current()
    }, intervalMs)
  }, [enabled, intervalMs, immediate])

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }

    // Cleanup khi unmount
    return () => {
      stopAutoRefresh()
    }
  }, [enabled, startAutoRefresh, stopAutoRefresh])

  return {
    start: startAutoRefresh,
    stop: stopAutoRefresh,
  }
}

