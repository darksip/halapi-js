/**
 * Halapi JavaScript SDK
 *
 * A framework-agnostic client for the Halapi API with streaming support.
 *
 * @example
 * ```typescript
 * import { createHalapiClient, adapters } from 'halapi-js'
 *
 * const client = createHalapiClient(adapters.static({
 *   apiUrl: 'https://api.example.com',
 *   apiToken: 'your-token'
 * }))
 *
 * // Stream a chat message
 * for await (const event of client.chatStream({ query: 'Hello!' })) {
 *   if (event.type === 'text-delta') {
 *     process.stdout.write(event.data.delta)
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

// Client
export {
  createHalapiClient,
  HalapiError,
  type HalapiClient,
  type HalapiClientOptions,
  type ChatStreamOptions,
  type ChatStreamResult,
} from './client'

// Configuration
export { adapters, isConfigValid, type HalapiConfig, type ConfigProvider } from './config'

// Types
export type {
  // Domain models
  Book,
  MusicTrack,
  MusicAlbum,
  MusicTrackItem,
  Music,
  Suggestion,
  Artifacts,
  ToolCall,
  CostSummary,
  Message,
  Conversation,
  // SSE events
  SSETextDeltaEvent,
  SSEToolCallEvent,
  SSEToolResultEvent,
  SSEArtifactsEvent,
  SSECostEvent,
  SSEDoneEvent,
  SSEErrorEvent,
  SSEEvent,
  // API responses
  ConversationsListResponse,
  ConversationDetailResponse,
  BookArtifactsResponse,
  MusicArtifactsResponse,
  ApiErrorResponse,
} from './types'

// Utilities
export { generateUUID } from './utils/uuid'
