/**
 * Event-Driven State Management Store
 * 智阅3.0重构第二阶段：前端事件驱动状态管理
 * 
 * Features:
 * - Redux Toolkit with RTK Query for unified state management
 * - Event-driven state updates via WebSocket
 * - Optimistic updates with rollback
 * - Real-time synchronization
 * - Cache invalidation strategies
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { EventType } from '../types/events'

// Base API configuration
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: [
    'Exam', 
    'Student', 
    'Template', 
    'GradingResult', 
    'ProcessingStatus',
    'Analytics'
  ],
  endpoints: (builder) => ({
    // Exam endpoints
    getExams: builder.query<Exam[], void>({
      query: () => '/exams',
      providesTags: ['Exam'],
    }),
    getExam: builder.query<Exam, string>({
      query: (id) => `/exams/${id}`,
      providesTags: (result, error, id) => [{ type: 'Exam', id }],
    }),
    createExam: builder.mutation<Exam, Partial<Exam>>({
      query: (exam) => ({
        url: '/exams',
        method: 'POST',
        body: exam,
      }),
      invalidatesTags: ['Exam'],
      // Optimistic update
      async onQueryStarted(exam, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          api.util.updateQueryData('getExams', undefined, (draft) => {
            const optimisticExam = {
              id: `temp-${Date.now()}`,
              ...exam,
              status: 'creating',
              created_at: new Date().toISOString(),
            } as Exam
            draft.push(optimisticExam)
          })
        )
        
        try {
          const { data: createdExam } = await queryFulfilled
          // Replace optimistic update with real data
          dispatch(
            api.util.updateQueryData('getExams', undefined, (draft) => {
              const index = draft.findIndex(e => e.id.startsWith('temp-'))
              if (index !== -1) {
                draft[index] = createdExam
              }
            })
          )
        } catch {
          // Rollback on error
          patchResult.undo()
        }
      },
    }),
    updateExam: builder.mutation<Exam, { id: string; updates: Partial<Exam> }>({
      query: ({ id, updates }) => ({
        url: `/exams/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Exam', id }],
    }),
    deleteExam: builder.mutation<void, string>({
      query: (id) => ({
        url: `/exams/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Exam'],
    }),
    
    // Grading endpoints
    getGradingResults: builder.query<GradingResult[], string>({
      query: (examId) => `/exams/${examId}/grading-results`,
      providesTags: (result, error, examId) => [
        { type: 'GradingResult', id: examId },
        ...(result?.map(({ id }) => ({ type: 'GradingResult' as const, id })) ?? [])
      ],
    }),
    startGrading: builder.mutation<void, { examId: string; studentId: string }>({
      query: ({ examId, studentId }) => ({
        url: `/exams/${examId}/grading/${studentId}/start`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { examId }) => [
        { type: 'GradingResult', id: examId }
      ],
    }),
    
    // Processing status endpoints
    getProcessingStatus: builder.query<ProcessingStatus[], string>({
      query: (examId) => `/exams/${examId}/processing-status`,
      providesTags: (result, error, examId) => [
        { type: 'ProcessingStatus', id: examId }
      ],
    }),
    
    // Analytics endpoints
    getAnalytics: builder.query<AnalyticsData, string>({
      query: (examId) => `/analytics/${examId}`,
      providesTags: (result, error, examId) => [
        { type: 'Analytics', id: examId }
      ],
    }),
  }),
})

// Export hooks for use in components
export const {
  useGetExamsQuery,
  useGetExamQuery,
  useCreateExamMutation,
  useUpdateExamMutation,
  useDeleteExamMutation,
  useGetGradingResultsQuery,
  useStartGradingMutation,
  useGetProcessingStatusQuery,
  useGetAnalyticsQuery,
} = api

// Event-driven state slice
interface EventDrivenState {
  // Real-time connection status
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  
  // Real-time events
  recentEvents: EventMessage[]
  eventHistory: EventMessage[]
  
  // Processing states
  processingQueue: ProcessingItem[]
  
  // Notifications
  notifications: Notification[]
  
  // System status
  systemHealth: {
    status: 'healthy' | 'degraded' | 'down'
    lastCheck: string
    services: ServiceStatus[]
  }
  
  // UI state
  ui: {
    activeView: string
    selectedExam: string | null
    filters: Record<string, any>
    sidebarCollapsed: boolean
  }
}

interface EventMessage {
  id: string
  type: EventType
  data: any
  timestamp: string
  source: string
}

interface ProcessingItem {
  id: string
  type: 'ocr' | 'grading' | 'batch'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  examId: string
  studentId?: string
  startedAt: string
  estimatedCompletion?: string
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
  read: boolean
  actions?: Array<{
    label: string
    action: string
  }>
}

interface ServiceStatus {
  name: string
  status: 'up' | 'down' | 'degraded'
  responseTime?: number
  lastCheck: string
}

const initialState: EventDrivenState = {
  connectionStatus: 'disconnected',
  recentEvents: [],
  eventHistory: [],
  processingQueue: [],
  notifications: [],
  systemHealth: {
    status: 'healthy',
    lastCheck: new Date().toISOString(),
    services: []
  },
  ui: {
    activeView: 'dashboard',
    selectedExam: null,
    filters: {},
    sidebarCollapsed: false
  }
}

// Async thunks for WebSocket operations
export const connectWebSocket = createAsyncThunk(
  'eventDriven/connectWebSocket',
  async (_, { dispatch, getState }) => {
    return new Promise<void>((resolve, reject) => {
      const token = (getState() as RootState).auth.token
      const ws = new WebSocket(`ws://localhost:8000/ws?token=${token}`)
      
      ws.onopen = () => {
        dispatch(eventDrivenSlice.actions.setConnectionStatus('connected'))
        resolve()
      }
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        dispatch(eventDrivenSlice.actions.handleWebSocketMessage(message))
      }
      
      ws.onclose = () => {
        dispatch(eventDrivenSlice.actions.setConnectionStatus('disconnected'))
        // Attempt reconnection after delay
        setTimeout(() => {
          dispatch(connectWebSocket())
        }, 5000)
      }
      
      ws.onerror = () => {
        dispatch(eventDrivenSlice.actions.setConnectionStatus('error'))
        reject(new Error('WebSocket connection failed'))
      }
      
      // Store WebSocket instance for later use
      ;(window as any).__zhiyueWebSocket = ws
    })
  }
)

export const sendWebSocketMessage = createAsyncThunk(
  'eventDriven/sendMessage',
  async (message: any) => {
    const ws = (window as any).__zhiyueWebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    } else {
      throw new Error('WebSocket not connected')
    }
  }
)

// Event-driven slice
const eventDrivenSlice = createSlice({
  name: 'eventDriven',
  initialState,
  reducers: {
    // Connection management
    setConnectionStatus: (state, action: PayloadAction<EventDrivenState['connectionStatus']>) => {
      state.connectionStatus = action.payload
    },
    
    // Event handling
    handleWebSocketMessage: (state, action: PayloadAction<EventMessage>) => {
      const message = action.payload
      
      // Add to recent events (keep last 100)
      state.recentEvents.unshift(message)
      if (state.recentEvents.length > 100) {
        state.recentEvents = state.recentEvents.slice(0, 100)
      }
      
      // Add to history (keep last 1000)
      state.eventHistory.unshift(message)
      if (state.eventHistory.length > 1000) {
        state.eventHistory = state.eventHistory.slice(0, 1000)
      }
      
      // Handle specific event types
      switch (message.type) {
        case EventType.EXAM_CREATED:
          // Invalidate exam cache
          // This will be handled by RTK Query cache invalidation
          break
          
        case EventType.OCR_STARTED:
          state.processingQueue.push({
            id: message.data.file_id,
            type: 'ocr',
            status: 'processing',
            progress: 0,
            examId: message.data.exam_id,
            studentId: message.data.student_id,
            startedAt: message.timestamp
          })
          break
          
        case EventType.OCR_COMPLETED:
          const ocrIndex = state.processingQueue.findIndex(
            item => item.id === message.data.file_id
          )
          if (ocrIndex !== -1) {
            state.processingQueue[ocrIndex].status = 'completed'
            state.processingQueue[ocrIndex].progress = 100
          }
          break
          
        case EventType.GRADING_STARTED:
          state.processingQueue.push({
            id: `grading-${message.data.student_id}`,
            type: 'grading',
            status: 'processing',
            progress: 0,
            examId: message.data.exam_id,
            studentId: message.data.student_id,
            startedAt: message.timestamp
          })
          break
          
        case EventType.GRADING_COMPLETED:
          const gradingIndex = state.processingQueue.findIndex(
            item => item.id === `grading-${message.data.student_id}`
          )
          if (gradingIndex !== -1) {
            state.processingQueue[gradingIndex].status = 'completed'
            state.processingQueue[gradingIndex].progress = 100
          }
          
          // Add success notification
          state.notifications.unshift({
            id: `grading-complete-${Date.now()}`,
            type: 'success',
            title: '阅卷完成',
            message: `学生 ${message.data.student_id} 的答卷已完成阅卷，得分：${message.data.score}`,
            timestamp: message.timestamp,
            read: false
          })
          break
          
        case EventType.GRADING_FAILED:
          const failedIndex = state.processingQueue.findIndex(
            item => item.id === `grading-${message.data.student_id}`
          )
          if (failedIndex !== -1) {
            state.processingQueue[failedIndex].status = 'failed'
          }
          
          // Add error notification
          state.notifications.unshift({
            id: `grading-failed-${Date.now()}`,
            type: 'error',
            title: '阅卷失败',
            message: `学生 ${message.data.student_id} 的答卷阅卷失败：${message.data.error}`,
            timestamp: message.timestamp,
            read: false,
            actions: [
              { label: '重试', action: 'retry_grading' },
              { label: '手动阅卷', action: 'manual_grading' }
            ]
          })
          break
      }
    },
    
    // Processing queue management
    updateProcessingProgress: (state, action: PayloadAction<{ id: string; progress: number }>) => {
      const item = state.processingQueue.find(item => item.id === action.payload.id)
      if (item) {
        item.progress = action.payload.progress
      }
    },
    
    removeProcessingItem: (state, action: PayloadAction<string>) => {
      state.processingQueue = state.processingQueue.filter(
        item => item.id !== action.payload
      )
    },
    
    clearCompletedProcessing: (state) => {
      state.processingQueue = state.processingQueue.filter(
        item => item.status !== 'completed'
      )
    },
    
    // Notification management
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'read'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notification-${Date.now()}`,
        timestamp: new Date().toISOString(),
        read: false
      }
      state.notifications.unshift(notification)
      
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50)
      }
    },
    
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload)
      if (notification) {
        notification.read = true
      }
    },
    
    markAllNotificationsRead: (state) => {
      state.notifications.forEach(n => n.read = true)
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload)
    },
    
    clearNotifications: (state) => {
      state.notifications = []
    },
    
    // System health
    updateSystemHealth: (state, action: PayloadAction<Partial<EventDrivenState['systemHealth']>>) => {
      Object.assign(state.systemHealth, action.payload)
    },
    
    // UI state management
    setActiveView: (state, action: PayloadAction<string>) => {
      state.ui.activeView = action.payload
    },
    
    setSelectedExam: (state, action: PayloadAction<string | null>) => {
      state.ui.selectedExam = action.payload
    },
    
    updateFilters: (state, action: PayloadAction<Record<string, any>>) => {
      Object.assign(state.ui.filters, action.payload)
    },
    
    clearFilters: (state) => {
      state.ui.filters = {}
    },
    
    toggleSidebar: (state) => {
      state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed
    },
    
    // Event history management
    clearEventHistory: (state) => {
      state.eventHistory = []
      state.recentEvents = []
    },
  },
  
  extraReducers: (builder) => {
    builder
      .addCase(connectWebSocket.pending, (state) => {
        state.connectionStatus = 'connecting'
      })
      .addCase(connectWebSocket.fulfilled, (state) => {
        state.connectionStatus = 'connected'
      })
      .addCase(connectWebSocket.rejected, (state) => {
        state.connectionStatus = 'error'
      })
  }
})

export const {
  setConnectionStatus,
  handleWebSocketMessage,
  updateProcessingProgress,
  removeProcessingItem,
  clearCompletedProcessing,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotification,
  clearNotifications,
  updateSystemHealth,
  setActiveView,
  setSelectedExam,
  updateFilters,
  clearFilters,
  toggleSidebar,
  clearEventHistory,
} = eventDrivenSlice.actions

export default eventDrivenSlice.reducer

// Selectors
export const selectConnectionStatus = (state: RootState) => state.eventDriven.connectionStatus
export const selectRecentEvents = (state: RootState) => state.eventDriven.recentEvents
export const selectProcessingQueue = (state: RootState) => state.eventDriven.processingQueue
export const selectUnreadNotifications = (state: RootState) => 
  state.eventDriven.notifications.filter(n => !n.read)
export const selectAllNotifications = (state: RootState) => state.eventDriven.notifications
export const selectSystemHealth = (state: RootState) => state.eventDriven.systemHealth
export const selectUIState = (state: RootState) => state.eventDriven.ui

// Advanced selectors
export const selectProcessingByExam = (examId: string) => (state: RootState) =>
  state.eventDriven.processingQueue.filter(item => item.examId === examId)

export const selectEventsByType = (eventType: EventType) => (state: RootState) =>
  state.eventDriven.eventHistory.filter(event => event.type === eventType)

export const selectProcessingStats = (state: RootState) => {
  const queue = state.eventDriven.processingQueue
  return {
    total: queue.length,
    pending: queue.filter(item => item.status === 'pending').length,
    processing: queue.filter(item => item.status === 'processing').length,
    completed: queue.filter(item => item.status === 'completed').length,
    failed: queue.filter(item => item.status === 'failed').length,
  }
}

// Type definitions for TypeScript
export interface RootState {
  eventDriven: EventDrivenState
  auth: any // Define proper auth state type
  api: any // RTK Query state
}

export interface Exam {
  id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'completed' | 'archived'
  created_at: string
  updated_at: string
  creator_id: string
  student_count?: number
  graded_count?: number
}

export interface GradingResult {
  id: string
  exam_id: string
  student_id: string
  score: number
  max_score: number
  status: 'pending' | 'completed' | 'reviewed'
  graded_at?: string
  reviewer_id?: string
}

export interface ProcessingStatus {
  id: string
  type: 'ocr' | 'grading' | 'analysis'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  message?: string
  started_at: string
  completed_at?: string
}

export interface AnalyticsData {
  exam_id: string
  student_count: number
  completion_rate: number
  average_score: number
  score_distribution: Array<{
    range: string
    count: number
  }>
  processing_metrics: {
    total_processed: number
    success_rate: number
    average_processing_time: number
  }
}