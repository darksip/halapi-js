/**
 * Type definitions for Halapi API
 *
 * These types cover all API responses, SSE events, and domain models
 * used by the Halapi SDK.
 */

// =============================================================================
// Domain Models
// =============================================================================

/**
 * Book recommendation
 */
export interface Book {
  title: string
  author: string
  isbn?: string
  year?: number
  coverUrl?: string
  description?: string
  subjects?: string[]
}

/**
 * Music track within an album
 */
export interface MusicTrack {
  title: string
  duration?: number
}

/**
 * Music album recommendation
 */
export interface MusicAlbum {
  type: 'album'
  cb?: string
  title?: string
  album?: string
  artist?: string
  artist_name?: string
  artiste?: string
  year?: number
  label?: string
  street_date?: string
  coverUrl?: string
  imageUrl?: string
  albumImageUrl?: string
  tracks?: MusicTrack[]
  genres?: string[]
}

/**
 * Individual music track recommendation
 */
export interface MusicTrackItem {
  type: 'track'
  cb?: string
  cb_track_id?: string
  track?: string
  title: string
  artist: string
  artist_name?: string
  artiste?: string
  album?: string
  album_name?: string
  year?: number
  duration?: number
  timing?: number
  num_disc?: number
  num_track?: number
  scoring?: number
  label?: string
  street_date?: string
  coverUrl?: string
  imageUrl?: string
  albumImageUrl?: string
}

/**
 * Music recommendation (either an album or a single track)
 */
export type Music = MusicAlbum | MusicTrackItem

/**
 * Suggested follow-up query
 */
export interface Suggestion {
  query: string
  label: string
  type: 'suggestion'
  icon?: string
}

/**
 * Collection of artifacts returned with a message
 */
export interface Artifacts {
  books: Book[]
  music: Music[]
  suggestions?: Suggestion[]
}

/**
 * Tool call tracking
 */
export interface ToolCall {
  toolCallId: string
  toolName: string
  status: 'pending' | 'success' | 'error'
}

/**
 * Cost breakdown for API usage
 */
export interface CostSummary {
  llm: {
    baseCost: number
    withMargin: number
  }
  total: {
    baseCost: number
    withMargin: number
  }
}

/**
 * Chat message
 */
export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  artifacts?: Artifacts
  createdAt: number
  isStreaming?: boolean
  costSummary?: CostSummary
  agentUsed?: string
  modelUsed?: string
  tokensInput?: number
  tokensOutput?: number
  executionTimeMs?: number
  toolCalls?: ToolCall[]
}

/**
 * Conversation metadata
 */
export interface Conversation {
  id: string
  organizationId?: string
  externalUserId?: string
  metadata?: Record<string, unknown>
  createdAt: number
  updatedAt: number
  messageCount: number
}

// =============================================================================
// SSE Event Types
// =============================================================================

/**
 * Text content being streamed
 */
export interface SSETextDeltaEvent {
  type: 'text-delta'
  data: {
    delta: string
  }
}

/**
 * Tool invocation started
 */
export interface SSEToolCallEvent {
  type: 'tool-call'
  data: {
    toolName: string
    toolCallId: string
    args: Record<string, unknown>
  }
}

/**
 * Tool invocation completed
 */
export interface SSEToolResultEvent {
  type: 'tool-result'
  data: {
    toolCallId: string
    result: unknown
    success: boolean
  }
}

/**
 * Artifacts (books, music, suggestions) available
 */
export interface SSEArtifactsEvent {
  type: 'artifacts'
  data: Artifacts
}

/**
 * Cost information for the request
 */
export interface SSECostEvent {
  type: 'cost'
  data: {
    costSummary: CostSummary
  }
}

/**
 * Stream completed successfully
 */
export interface SSEDoneEvent {
  type: 'done'
  data: {
    messageId: string
    conversationId: string
    totalTokens: {
      input: number
      output: number
    }
    executionTimeMs: number
    agentUsed?: string
    modelUsed?: string
  }
}

/**
 * Error occurred during streaming
 */
export interface SSEErrorEvent {
  type: 'error'
  data: {
    code: string
    message: string
  }
}

/**
 * Union type of all possible SSE events
 */
export type SSEEvent =
  | SSETextDeltaEvent
  | SSEToolCallEvent
  | SSEToolResultEvent
  | SSEArtifactsEvent
  | SSECostEvent
  | SSEDoneEvent
  | SSEErrorEvent

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Response from GET /conversations
 */
export interface ConversationsListResponse {
  success: boolean
  conversations: Conversation[]
  metadata: {
    requestId: string
    timestamp: string
    count: number
    hasMore: boolean
  }
}

/**
 * Response from GET /conversations/:id
 */
export interface ConversationDetailResponse {
  success: boolean
  conversation: Conversation
  messages: Message[]
  metadata: {
    requestId: string
    timestamp: string
  }
}

/**
 * Response from GET /artifacts/books/:messageId
 */
export interface BookArtifactsResponse {
  success: boolean
  messageId: string
  books: Book[]
  metadata: {
    requestId: string
    timestamp: string
    count: number
  }
}

/**
 * Response from GET /artifacts/music/:messageId
 */
export interface MusicArtifactsResponse {
  success: boolean
  messageId: string
  music: Music[]
  metadata: {
    requestId: string
    timestamp: string
    count: number
  }
}

/**
 * Error response from the API
 */
export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    retryAfter?: number
  }
  metadata: {
    requestId: string
    timestamp: string
  }
}
