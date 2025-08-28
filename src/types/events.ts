/**
 * Event Type Definitions
 * 智阅3.0重构第二阶段：事件类型定义
 * 
 * Centralized event type definitions for type safety
 * across the entire application
 */

// Event Type Enum - must match backend EventType
export enum EventType {
  // Exam Events
  EXAM_CREATED = "exam.created",
  EXAM_UPDATED = "exam.updated", 
  EXAM_DELETED = "exam.deleted",
  
  // Processing Events
  OCR_STARTED = "ocr.started",
  OCR_COMPLETED = "ocr.completed",
  OCR_FAILED = "ocr.failed",
  
  // Grading Events
  GRADING_STARTED = "grading.started",
  GRADING_COMPLETED = "grading.completed",
  GRADING_FAILED = "grading.failed",
  GRADING_REVIEWED = "grading.reviewed",
  
  // Student Events
  STUDENT_CREATED = "student.created",
  STUDENT_UPDATED = "student.updated", 
  STUDENT_BATCH_IMPORTED = "student.batch_imported",
  
  // Template Events
  TEMPLATE_CREATED = "template.created",
  TEMPLATE_UPDATED = "template.updated",
  TEMPLATE_ACTIVATED = "template.activated",
  
  // System Events
  BATCH_PROCESSING_STARTED = "batch.started",
  BATCH_PROCESSING_COMPLETED = "batch.completed",
  SYSTEM_HEALTH_CHECK = "system.health_check"
}

// Event Data Interfaces
export interface EventMetadata {
  event_id: string
  timestamp: number
  source_service: string
  correlation_id?: string
  user_id?: string
  trace_id?: string
}

export interface BaseEvent {
  type: EventType
  data: Record<string, any>
  metadata: EventMetadata
  version: string
}

// Specific Event Data Types
export interface ExamCreatedData {
  exam_id: string
  name: string
  description?: string
  creator_id: string
  created_at: string
  status: string
}

export interface ExamUpdatedData {
  exam_id: string
  name?: string
  description?: string
  status?: string
  updated_at: string
  changes: Record<string, any>
}

export interface ExamDeletedData {
  exam_id: string
  deleted_at: string
  deleted_by: string
}

export interface OCRStartedData {
  file_id: string
  exam_id: string
  student_id?: string
  file_path: string
  processing_priority: 'high' | 'normal' | 'low'
}

export interface OCRCompletedData {
  file_id: string
  exam_id: string
  student_id?: string
  ocr_result: {
    text_content: string
    confidence_score: number
    detected_regions: Array<{
      type: 'text' | 'checkbox' | 'barcode'
      coordinates: { x: number; y: number; width: number; height: number }
      content: string
      confidence: number
    }>
  }
  processing_time: number
  completed_at: string
}

export interface OCRFailedData {
  file_id: string
  exam_id: string
  error: string
  error_code: string
  retry_count: number
  failed_at: string
}

export interface GradingStartedData {
  grading_id: string
  exam_id: string
  student_id: string
  grading_type: 'auto' | 'manual' | 'hybrid'
  started_by: string
  started_at: string
}

export interface GradingCompletedData {
  grading_id: string
  exam_id: string
  student_id: string
  score: number
  max_score: number
  question_scores: Array<{
    question_id: string
    score: number
    max_score: number
    confidence?: number
    comments?: string
  }>
  grading_time: number
  completed_at: string
  grader_type: 'ai' | 'human'
  grader_id?: string
}

export interface GradingFailedData {
  grading_id: string
  exam_id: string
  student_id: string
  error: string
  error_code: string
  retry_count: number
  failed_at: string
  requires_manual_review: boolean
}

export interface GradingReviewedData {
  grading_id: string
  exam_id: string
  student_id: string
  original_score: number
  reviewed_score: number
  reviewer_id: string
  review_comments: string
  reviewed_at: string
  changes_made: Array<{
    question_id: string
    original_score: number
    new_score: number
    reason: string
  }>
}

export interface StudentCreatedData {
  student_id: string
  name: string
  class_id?: string
  student_number?: string
  created_by: string
  created_at: string
}

export interface StudentUpdatedData {
  student_id: string
  name?: string
  class_id?: string
  student_number?: string
  updated_by: string
  updated_at: string
  changes: Record<string, any>
}

export interface StudentBatchImportedData {
  batch_id: string
  imported_count: number
  failed_count: number
  imported_students: Array<{
    student_id: string
    name: string
    student_number?: string
  }>
  failed_records: Array<{
    row_number: number
    data: Record<string, any>
    error: string
  }>
  imported_by: string
  imported_at: string
}

export interface TemplateCreatedData {
  template_id: string
  name: string
  type: 'answer_sheet' | 'question_template'
  created_by: string
  created_at: string
  configuration: Record<string, any>
}

export interface TemplateUpdatedData {
  template_id: string
  name?: string
  configuration?: Record<string, any>
  updated_by: string
  updated_at: string
  changes: Record<string, any>
}

export interface TemplateActivatedData {
  template_id: string
  exam_id?: string
  activated_by: string
  activated_at: string
  previous_template_id?: string
}

export interface BatchProcessingStartedData {
  batch_id: string
  processing_type: 'ocr' | 'grading' | 'export' | 'import'
  exam_id?: string
  total_items: number
  priority: 'high' | 'normal' | 'low'
  started_by: string
  started_at: string
  estimated_completion?: string
}

export interface BatchProcessingCompletedData {
  batch_id: string
  processing_type: 'ocr' | 'grading' | 'export' | 'import'
  exam_id?: string
  total_items: number
  successful_items: number
  failed_items: number
  processing_time: number
  completed_at: string
  results_summary: {
    success_rate: number
    errors: Array<{
      item_id: string
      error: string
    }>
  }
}

export interface SystemHealthCheckData {
  trigger: string
  services: Array<{
    name: string
    status: 'healthy' | 'degraded' | 'down'
    response_time?: number
    error?: string
  }>
  overall_status: 'healthy' | 'degraded' | 'down'
  checked_at: string
}

// Typed Event Interfaces
export interface ExamCreatedEvent extends BaseEvent {
  type: EventType.EXAM_CREATED
  data: ExamCreatedData
}

export interface ExamUpdatedEvent extends BaseEvent {
  type: EventType.EXAM_UPDATED
  data: ExamUpdatedData
}

export interface ExamDeletedEvent extends BaseEvent {
  type: EventType.EXAM_DELETED
  data: ExamDeletedData
}

export interface OCRStartedEvent extends BaseEvent {
  type: EventType.OCR_STARTED
  data: OCRStartedData
}

export interface OCRCompletedEvent extends BaseEvent {
  type: EventType.OCR_COMPLETED
  data: OCRCompletedData
}

export interface OCRFailedEvent extends BaseEvent {
  type: EventType.OCR_FAILED
  data: OCRFailedData
}

export interface GradingStartedEvent extends BaseEvent {
  type: EventType.GRADING_STARTED
  data: GradingStartedData
}

export interface GradingCompletedEvent extends BaseEvent {
  type: EventType.GRADING_COMPLETED
  data: GradingCompletedData
}

export interface GradingFailedEvent extends BaseEvent {
  type: EventType.GRADING_FAILED
  data: GradingFailedData
}

export interface GradingReviewedEvent extends BaseEvent {
  type: EventType.GRADING_REVIEWED
  data: GradingReviewedData
}

export interface StudentCreatedEvent extends BaseEvent {
  type: EventType.STUDENT_CREATED
  data: StudentCreatedData
}

export interface StudentUpdatedEvent extends BaseEvent {
  type: EventType.STUDENT_UPDATED
  data: StudentUpdatedData
}

export interface StudentBatchImportedEvent extends BaseEvent {
  type: EventType.STUDENT_BATCH_IMPORTED
  data: StudentBatchImportedData
}

export interface TemplateCreatedEvent extends BaseEvent {
  type: EventType.TEMPLATE_CREATED
  data: TemplateCreatedData
}

export interface TemplateUpdatedEvent extends BaseEvent {
  type: EventType.TEMPLATE_UPDATED
  data: TemplateUpdatedData
}

export interface TemplateActivatedEvent extends BaseEvent {
  type: EventType.TEMPLATE_ACTIVATED
  data: TemplateActivatedData
}

export interface BatchProcessingStartedEvent extends BaseEvent {
  type: EventType.BATCH_PROCESSING_STARTED
  data: BatchProcessingStartedData
}

export interface BatchProcessingCompletedEvent extends BaseEvent {
  type: EventType.BATCH_PROCESSING_COMPLETED
  data: BatchProcessingCompletedData
}

export interface SystemHealthCheckEvent extends BaseEvent {
  type: EventType.SYSTEM_HEALTH_CHECK
  data: SystemHealthCheckData
}

// Union type for all events
export type EventUnion = 
  | ExamCreatedEvent
  | ExamUpdatedEvent
  | ExamDeletedEvent
  | OCRStartedEvent
  | OCRCompletedEvent
  | OCRFailedEvent
  | GradingStartedEvent
  | GradingCompletedEvent
  | GradingFailedEvent
  | GradingReviewedEvent
  | StudentCreatedEvent
  | StudentUpdatedEvent
  | StudentBatchImportedEvent
  | TemplateCreatedEvent
  | TemplateUpdatedEvent
  | TemplateActivatedEvent
  | BatchProcessingStartedEvent
  | BatchProcessingCompletedEvent
  | SystemHealthCheckEvent

// WebSocket Message Types
export interface WebSocketMessage {
  type: 'event' | 'notification' | 'system' | 'heartbeat'
  payload: any
  timestamp: string
}

export interface EventWebSocketMessage extends WebSocketMessage {
  type: 'event'
  payload: EventUnion
}

export interface NotificationWebSocketMessage extends WebSocketMessage {
  type: 'notification'
  payload: {
    id: string
    title: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    actions?: Array<{
      label: string
      action: string
    }>
  }
}

export interface SystemWebSocketMessage extends WebSocketMessage {
  type: 'system'
  payload: {
    message: string
    level: 'info' | 'warning' | 'error'
    data?: any
  }
}

export interface HeartbeatWebSocketMessage extends WebSocketMessage {
  type: 'heartbeat'
  payload: {
    server_time: string
    connection_id: string
  }
}

// Event Handler Function Types
export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => Promise<void> | void

export type EventSubscriber = {
  id: string
  eventTypes: EventType[]
  handler: EventHandler
  priority?: number
}

// Event Bus Interface
export interface IEventBus {
  subscribe<T extends BaseEvent>(
    eventTypes: EventType | EventType[],
    handler: EventHandler<T>,
    options?: { priority?: number }
  ): string

  unsubscribe(subscriptionId: string): void

  publish(event: BaseEvent): Promise<void>

  getSubscribers(eventType: EventType): EventSubscriber[]

  clear(): void
}

// Real-time Event Context
export interface RealTimeEventContext {
  isConnected: boolean
  connectionId?: string
  lastHeartbeat?: string
  reconnectAttempts: number
  eventQueue: EventUnion[]
  connectionStats: {
    connectedAt?: string
    totalEvents: number
    lastEventAt?: string
  }
}

// Event Metrics
export interface EventMetrics {
  published: Record<EventType, number>
  processed: Record<EventType, number>
  failed: Record<EventType, number>
  averageProcessingTime: Record<EventType, number>
  lastProcessedAt: Record<EventType, string>
}

// Constants
export const EVENT_PRIORITIES = {
  HIGH: 1,
  NORMAL: 5,
  LOW: 10
} as const

export const WEBSOCKET_RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000] as const

export const MAX_EVENT_QUEUE_SIZE = 1000

export const HEARTBEAT_INTERVAL = 30000 // 30 seconds

// Utility Types
export type EventTypeOf<T extends BaseEvent> = T['type']
export type EventDataOf<T extends BaseEvent> = T['data']

// Type Guards
export function isExamEvent(event: BaseEvent): event is ExamCreatedEvent | ExamUpdatedEvent | ExamDeletedEvent {
  return [
    EventType.EXAM_CREATED,
    EventType.EXAM_UPDATED,
    EventType.EXAM_DELETED
  ].includes(event.type)
}

export function isOCREvent(event: BaseEvent): event is OCRStartedEvent | OCRCompletedEvent | OCRFailedEvent {
  return [
    EventType.OCR_STARTED,
    EventType.OCR_COMPLETED,
    EventType.OCR_FAILED
  ].includes(event.type)
}

export function isGradingEvent(event: BaseEvent): event is GradingStartedEvent | GradingCompletedEvent | GradingFailedEvent | GradingReviewedEvent {
  return [
    EventType.GRADING_STARTED,
    EventType.GRADING_COMPLETED,
    EventType.GRADING_FAILED,
    EventType.GRADING_REVIEWED
  ].includes(event.type)
}

export function isStudentEvent(event: BaseEvent): event is StudentCreatedEvent | StudentUpdatedEvent | StudentBatchImportedEvent {
  return [
    EventType.STUDENT_CREATED,
    EventType.STUDENT_UPDATED,
    EventType.STUDENT_BATCH_IMPORTED
  ].includes(event.type)
}

export function isProcessingEvent(event: BaseEvent): event is BatchProcessingStartedEvent | BatchProcessingCompletedEvent {
  return [
    EventType.BATCH_PROCESSING_STARTED,
    EventType.BATCH_PROCESSING_COMPLETED
  ].includes(event.type)
}

// Event Factory Functions
export function createExamCreatedEvent(
  examData: ExamCreatedData,
  metadata: Omit<EventMetadata, 'event_id' | 'timestamp'>
): ExamCreatedEvent {
  return {
    type: EventType.EXAM_CREATED,
    data: examData,
    metadata: {
      ...metadata,
      event_id: crypto.randomUUID(),
      timestamp: Date.now()
    },
    version: '1.0'
  }
}

export function createGradingCompletedEvent(
  gradingData: GradingCompletedData,
  metadata: Omit<EventMetadata, 'event_id' | 'timestamp'>
): GradingCompletedEvent {
  return {
    type: EventType.GRADING_COMPLETED,
    data: gradingData,
    metadata: {
      ...metadata,
      event_id: crypto.randomUUID(),
      timestamp: Date.now()
    },
    version: '1.0'
  }
}

// Export all types
export * from './events'