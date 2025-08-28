/**
 * React Query Cache Integration - L1 Frontend Cache
 * 智阅3.0重构第二阶段：前端React Query缓存集成
 * 
 * Features:
 * - Query client configuration with smart defaults
 * - Cache key factories for consistent naming
 * - Optimistic updates with rollback
 * - Background refetching strategies
 * - Cache invalidation patterns
 * - Performance monitoring
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { compress, decompress } from 'lz-string'

// Cache configuration types
export interface CacheConfig {
  defaultStaleTime: number
  defaultCacheTime: number
  maxRetries: number
  retryDelay: (attemptIndex: number) => number
  enablePersistence: boolean
  persistenceKey: string
  compressionThreshold: number
}

// Cache metrics tracking
interface CacheMetrics {
  hits: number
  misses: number
  mutations: number
  errors: number
  invalidations: number
  persistenceSize: number
}

// Query key factories for consistent cache key generation
export const queryKeys = {
  // Exam related queries
  exams: {
    all: ['exams'] as const,
    lists: () => [...queryKeys.exams.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.exams.lists(), filters] as const,
    details: () => [...queryKeys.exams.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.exams.details(), id] as const,
    status: (id: string) => [...queryKeys.exams.detail(id), 'status'] as const,
    students: (id: string) => [...queryKeys.exams.detail(id), 'students'] as const,
    templates: (id: string) => [...queryKeys.exams.detail(id), 'templates'] as const,
  },

  // Student related queries
  students: {
    all: ['students'] as const,
    lists: () => [...queryKeys.students.all, 'list'] as const,
    list: (examId?: string, filters?: Record<string, any>) => 
      [...queryKeys.students.lists(), examId, filters] as const,
    details: () => [...queryKeys.students.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.students.details(), id] as const,
    results: (studentId: string, examId: string) => 
      [...queryKeys.students.detail(studentId), 'results', examId] as const,
  },

  // Grading related queries
  grading: {
    all: ['grading'] as const,
    results: () => [...queryKeys.grading.all, 'results'] as const,
    result: (examId: string, studentId: string) => 
      [...queryKeys.grading.results(), examId, studentId] as const,
    progress: () => [...queryKeys.grading.all, 'progress'] as const,
    examProgress: (examId: string) => [...queryKeys.grading.progress(), examId] as const,
    reviews: () => [...queryKeys.grading.all, 'reviews'] as const,
    review: (gradingId: string) => [...queryKeys.grading.reviews(), gradingId] as const,
  },

  // Template related queries
  templates: {
    all: ['templates'] as const,
    lists: () => [...queryKeys.templates.all, 'list'] as const,
    list: (type?: string) => [...queryKeys.templates.lists(), type] as const,
    details: () => [...queryKeys.templates.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.templates.details(), id] as const,
    backgrounds: () => [...queryKeys.templates.all, 'backgrounds'] as const,
  },

  // Processing related queries
  processing: {
    all: ['processing'] as const,
    queue: () => [...queryKeys.processing.all, 'queue'] as const,
    status: (examId: string) => [...queryKeys.processing.all, 'status', examId] as const,
    batch: (batchId: string) => [...queryKeys.processing.all, 'batch', batchId] as const,
    history: () => [...queryKeys.processing.all, 'history'] as const,
  },

  // Analytics related queries
  analytics: {
    all: ['analytics'] as const,
    exam: (examId: string) => [...queryKeys.analytics.all, 'exam', examId] as const,
    dashboard: () => [...queryKeys.analytics.all, 'dashboard'] as const,
    performance: () => [...queryKeys.analytics.all, 'performance'] as const,
    reports: () => [...queryKeys.analytics.all, 'reports'] as const,
    report: (reportId: string) => [...queryKeys.analytics.reports(), reportId] as const,
  },

  // System related queries
  system: {
    all: ['system'] as const,
    config: () => [...queryKeys.system.all, 'config'] as const,
    health: () => [...queryKeys.system.all, 'health'] as const,
    metrics: () => [...queryKeys.system.all, 'metrics'] as const,
    status: () => [...queryKeys.system.all, 'status'] as const,
  },

  // User related queries
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    preferences: () => [...queryKeys.user.all, 'preferences'] as const,
    permissions: () => [...queryKeys.user.all, 'permissions'] as const,
  }
}

// Cache metrics instance
const cacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  mutations: 0,
  errors: 0,
  invalidations: 0,
  persistenceSize: 0
}

// Custom compression for persistence
const compressionConfig = {
  threshold: 1024, // Compress data larger than 1KB
}

const compressData = (data: string): string => {
  if (data.length > compressionConfig.threshold) {
    try {
      const compressed = compress(data)
      return compressed.length < data.length ? `COMPRESSED:${compressed}` : data
    } catch {
      return data
    }
  }
  return data
}

const decompressData = (data: string): string => {
  if (data.startsWith('COMPRESSED:')) {
    try {
      return decompress(data.substring(11)) || data
    } catch {
      return data
    }
  }
  return data
}

// Create persister for offline caching
const createPersister = (key: string) => {
  return createSyncStoragePersister({
    storage: {
      getItem: (key: string) => {
        const item = localStorage.getItem(key)
        if (!item) return null
        
        try {
          const decompressed = decompressData(item)
          cacheMetrics.persistenceSize = item.length
          return decompressed
        } catch {
          return item
        }
      },
      setItem: (key: string, value: string) => {
        try {
          const compressed = compressData(value)
          localStorage.setItem(key, compressed)
          cacheMetrics.persistenceSize = compressed.length
        } catch (error) {
          console.warn('Failed to persist cache:', error)
        }
      },
      removeItem: (key: string) => localStorage.removeItem(key)
    },
    key,
    throttleTime: 1000, // Throttle persistence to every 1 second
  })
}

// Default cache configuration
const defaultConfig: CacheConfig = {
  defaultStaleTime: 5 * 60 * 1000, // 5 minutes
  defaultCacheTime: 10 * 60 * 1000, // 10 minutes
  maxRetries: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  enablePersistence: true,
  persistenceKey: 'zhiyue-cache-v1',
  compressionThreshold: 1024
}

// Create query cache with performance monitoring
const createQueryCache = () => {
  return new QueryCache({
    onSuccess: (data, query) => {
      cacheMetrics.hits++
      
      // Log cache performance for development
      if (process.env.NODE_ENV === 'development') {
        console.debug('Query cache hit:', query.queryKey, {
          staleTime: query.options.staleTime,
          cacheTime: query.options.cacheTime,
          dataSize: JSON.stringify(data).length
        })
      }
    },
    
    onError: (error, query) => {
      cacheMetrics.errors++
      console.error('Query cache error:', query.queryKey, error)
    }
  })
}

// Create mutation cache with optimistic update tracking
const createMutationCache = () => {
  return new MutationCache({
    onSuccess: (data, variables, context, mutation) => {
      cacheMetrics.mutations++
      
      if (process.env.NODE_ENV === 'development') {
        console.debug('Mutation success:', mutation.options.mutationKey, {
          variables,
          dataSize: JSON.stringify(data).length
        })
      }
    },
    
    onError: (error, variables, context, mutation) => {
      cacheMetrics.errors++
      console.error('Mutation error:', mutation.options.mutationKey, error)
    }
  })
}

// Create optimized query client
export const createQueryClient = (config: Partial<CacheConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config }
  
  const queryCache = createQueryCache()
  const mutationCache = createMutationCache()
  
  const queryClient = new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: {
        staleTime: finalConfig.defaultStaleTime,
        cacheTime: finalConfig.defaultCacheTime,
        retry: finalConfig.maxRetries,
        retryDelay: finalConfig.retryDelay,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        
        // Network mode for better offline experience
        networkMode: 'offlineFirst',
        
        // Structural sharing for performance
        structuralSharing: true,
        
        // Use error boundaries for better UX
        useErrorBoundary: (error: any) => {
          return error?.status >= 500
        }
      },
      
      mutations: {
        retry: (failureCount, error: any) => {
          // Don't retry client errors (4xx)
          if (error?.status >= 400 && error?.status < 500) {
            return false
          }
          return failureCount < 2
        },
        
        useErrorBoundary: false, // Handle mutation errors in components
        
        // Network mode for mutations
        networkMode: 'online'
      }
    }
  })

  // Setup persistence if enabled
  if (finalConfig.enablePersistence) {
    const persister = createPersister(finalConfig.persistenceKey)
    
    persistQueryClient({
      queryClient,
      persister,
      maxAge: finalConfig.defaultCacheTime,
      
      // Only persist successful queries
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          return query.state.status === 'success' && 
                 query.queryKey[0] !== 'system' && // Don't persist system queries
                 !query.queryKey.includes('realtime') // Don't persist real-time data
        }
      }
    })
  }

  return queryClient
}

// Cache invalidation utilities
export const cacheInvalidation = {
  // Invalidate all exam-related data
  invalidateExam: (queryClient: QueryClient, examId: string) => {
    cacheMetrics.invalidations++
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.detail(examId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.examProgress(examId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.processing.status(examId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.exam(examId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.students.list(examId) })
    ])
  },

  // Invalidate student-related data
  invalidateStudent: (queryClient: QueryClient, studentId: string, examId?: string) => {
    cacheMetrics.invalidations++
    const promises = [
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(studentId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() })
    ]
    
    if (examId) {
      promises.push(
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.students.results(studentId, examId) 
        }),
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.grading.result(examId, studentId) 
        })
      )
    }
    
    return Promise.all(promises)
  },

  // Invalidate grading data
  invalidateGrading: (queryClient: QueryClient, examId: string, studentId?: string) => {
    cacheMetrics.invalidations++
    const promises = [
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.examProgress(examId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.exam(examId) })
    ]
    
    if (studentId) {
      promises.push(
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.grading.result(examId, studentId) 
        }),
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.students.results(studentId, examId) 
        })
      )
    }
    
    return Promise.all(promises)
  },

  // Invalidate processing status
  invalidateProcessing: (queryClient: QueryClient, examId?: string) => {
    cacheMetrics.invalidations++
    const promises = [
      queryClient.invalidateQueries({ queryKey: queryKeys.processing.queue() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.processing.history() })
    ]
    
    if (examId) {
      promises.push(
        queryClient.invalidateQueries({ queryKey: queryKeys.processing.status(examId) })
      )
    }
    
    return Promise.all(promises)
  },

  // Invalidate templates
  invalidateTemplates: (queryClient: QueryClient, templateId?: string) => {
    cacheMetrics.invalidations++
    if (templateId) {
      return queryClient.invalidateQueries({ 
        queryKey: queryKeys.templates.detail(templateId) 
      })
    } else {
      return queryClient.invalidateQueries({ queryKey: queryKeys.templates.all })
    }
  },

  // Smart invalidation based on tags
  invalidateByTags: (queryClient: QueryClient, tags: string[]) => {
    cacheMetrics.invalidations++
    const promises: Promise<void>[] = []
    
    tags.forEach(tag => {
      switch (tag) {
        case 'exams':
          promises.push(queryClient.invalidateQueries({ queryKey: queryKeys.exams.all }))
          break
        case 'students':
          promises.push(queryClient.invalidateQueries({ queryKey: queryKeys.students.all }))
          break
        case 'grading':
          promises.push(queryClient.invalidateQueries({ queryKey: queryKeys.grading.all }))
          break
        case 'templates':
          promises.push(queryClient.invalidateQueries({ queryKey: queryKeys.templates.all }))
          break
        case 'processing':
          promises.push(queryClient.invalidateQueries({ queryKey: queryKeys.processing.all }))
          break
        case 'analytics':
          promises.push(queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all }))
          break
        default:
          // Handle exam-specific or student-specific tags
          if (tag.startsWith('exam_')) {
            const examId = tag.substring(5)
            promises.push(...[
              queryClient.invalidateQueries({ queryKey: queryKeys.exams.detail(examId) }),
              queryClient.invalidateQueries({ queryKey: queryKeys.grading.examProgress(examId) }),
              queryClient.invalidateQueries({ queryKey: queryKeys.processing.status(examId) })
            ])
          } else if (tag.startsWith('student_')) {
            const studentId = tag.substring(8)
            promises.push(
              queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(studentId) })
            )
          }
          break
      }
    })
    
    return Promise.all(promises)
  }
}

// Cache warming utilities
export const cacheWarming = {
  // Warm essential data on app startup
  warmEssentialData: async (queryClient: QueryClient) => {
    const promises = [
      // Pre-fetch user profile
      queryClient.prefetchQuery({
        queryKey: queryKeys.user.profile(),
        staleTime: 10 * 60 * 1000, // 10 minutes
      }),
      
      // Pre-fetch system config
      queryClient.prefetchQuery({
        queryKey: queryKeys.system.config(),
        staleTime: 30 * 60 * 1000, // 30 minutes
      }),
      
      // Pre-fetch recent exams
      queryClient.prefetchQuery({
        queryKey: queryKeys.exams.list({ recent: true, limit: 10 }),
        staleTime: 5 * 60 * 1000, // 5 minutes
      })
    ]
    
    try {
      await Promise.allSettled(promises)
      console.log('Cache warming completed')
    } catch (error) {
      console.warn('Cache warming failed:', error)
    }
  },

  // Warm exam-specific data
  warmExamData: async (queryClient: QueryClient, examId: string) => {
    const promises = [
      queryClient.prefetchQuery({
        queryKey: queryKeys.exams.detail(examId),
        staleTime: 10 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.students.list(examId),
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.grading.examProgress(examId),
        staleTime: 2 * 60 * 1000,
      })
    ]
    
    await Promise.allSettled(promises)
  }
}

// Cache monitoring and analytics
export const cacheMonitoring = {
  getMetrics: () => ({ ...cacheMetrics }),
  
  resetMetrics: () => {
    Object.keys(cacheMetrics).forEach(key => {
      (cacheMetrics as any)[key] = 0
    })
  },
  
  getCacheStats: (queryClient: QueryClient) => {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()
    
    return {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      loadingQueries: queries.filter(q => q.state.status === 'loading').length,
      successQueries: queries.filter(q => q.state.status === 'success').length,
      
      // Size estimates
      estimatedMemoryUsage: queries.reduce((total, query) => {
        return total + (query.state.data ? JSON.stringify(query.state.data).length : 0)
      }, 0),
      
      // Performance metrics
      ...cacheMetrics
    }
  },
  
  // Clean up old cache entries
  garbageCollect: (queryClient: QueryClient) => {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()
    
    let removedCount = 0
    queries.forEach(query => {
      // Remove queries that haven't been used for a long time
      const lastUsed = query.state.dataUpdatedAt || query.state.errorUpdatedAt || 0
      const ageInHours = (Date.now() - lastUsed) / (1000 * 60 * 60)
      
      if (ageInHours > 24 && query.getObserversCount() === 0) {
        cache.remove(query)
        removedCount++
      }
    })
    
    console.log(`Garbage collected ${removedCount} stale cache entries`)
    return removedCount
  }
}

// Export default query client instance
export const queryClient = createQueryClient()

// Auto garbage collection every hour
if (typeof window !== 'undefined') {
  setInterval(() => {
    cacheMonitoring.garbageCollect(queryClient)
  }, 60 * 60 * 1000) // 1 hour
}