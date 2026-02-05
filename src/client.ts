/**
 * Halapi API Client
 *
 * Provides methods to interact with the Halapi API including
 * streaming chat, conversations management, and artifacts retrieval.
 */

import type { ConfigProvider, HalapiConfig } from './config'
import { isConfigValid } from './config'
import type {
  BookArtifactsResponse,
  BookPresentationsResponse,
  ConversationDetailResponse,
  ConversationsListResponse,
  MusicArtifactsResponse,
  SSEEvent,
} from './types'

/**
 * Options for the chat stream
 */
export interface ChatStreamOptions {
  /** The user's query/message */
  query: string
  /** Optional conversation ID to continue an existing conversation */
  conversationId?: string
  /** External user identifier for tracking */
  externalUserId?: string
  /** Additional metadata to attach to the request */
  metadata?: Record<string, unknown>
  /** AbortSignal for cancelling the stream */
  signal?: AbortSignal
}

/**
 * Result returned when the chat stream completes
 */
export interface ChatStreamResult {
  /** The conversation ID (new or existing) */
  conversationId: string | null
  /** The message ID of the assistant's response */
  messageId: string | null
}

/**
 * Custom error class for API errors
 */
export class HalapiError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'HalapiError'
  }
}

/**
 * Options for customizing the Halapi client behavior
 */
export interface HalapiClientOptions {
  /**
   * Custom fetch function for making HTTP requests.
   * Use this to inject custom headers, interceptors, or use a different HTTP client.
   *
   * @example
   * ```typescript
   * const client = createHalapiClient(configProvider, {
   *   customFetch: (input, init) => {
   *     const headers = new Headers(init?.headers)
   *     headers.set('X-Custom-Header', 'value')
   *     return fetch(input, { ...init, headers })
   *   }
   * })
   * ```
   */
  customFetch?: typeof fetch
}

/**
 * Creates a Halapi API client with the given configuration provider
 *
 * @param getConfig - Function that returns the API configuration
 * @param options - Optional client configuration
 * @returns An object with methods to interact with the Halapi API
 *
 * @example
 * ```typescript
 * import { createHalapiClient, adapters } from 'halapi-js'
 *
 * // Using static configuration
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
 *
 * // Using custom fetch for header injection
 * const proxyClient = createHalapiClient(configProvider, {
 *   customFetch: (input, init) => {
 *     const headers = new Headers(init?.headers)
 *     headers.set('X-Token-Hash', 'abc123')
 *     return fetch(input, { ...init, headers })
 *   }
 * })
 * ```
 */
export function createHalapiClient(getConfig: ConfigProvider, options: HalapiClientOptions = {}) {
  const fetchFn = options.customFetch ?? fetch
  async function resolveConfig(): Promise<HalapiConfig> {
    const config = await getConfig()
    if (!isConfigValid(config)) {
      throw new HalapiError('API token not configured')
    }
    return config
  }

  function getAuthHeaders(config: HalapiConfig): HeadersInit {
    return {
      Authorization: `Bearer ${config.apiToken}`,
    }
  }

  function getApiUrl(config: HalapiConfig, path: string): string {
    return `${config.apiUrl}${path}`
  }

  async function handleErrorResponse(response: Response, context: string): Promise<never> {
    let errorMessage = `${context}: HTTP ${response.status}`
    try {
      const errorData = await response.json()
      if (errorData.error?.message) {
        errorMessage = `${context}: ${errorData.error.message}`
      }
    } catch {
      // Keep default error message if JSON parsing fails
    }
    throw new HalapiError(errorMessage, response.status)
  }

  /**
   * Stream a chat message and receive real-time SSE events
   *
   * @param options - Chat stream options
   * @yields SSE events as they arrive
   * @returns The conversation and message IDs when complete
   *
   * @example
   * ```typescript
   * const stream = client.chatStream({ query: 'Tell me a story' })
   *
   * for await (const event of stream) {
   *   switch (event.type) {
   *     case 'text-delta':
   *       process.stdout.write(event.data.delta)
   *       break
   *     case 'tool-call':
   *       console.log('Tool called:', event.data.toolName)
   *       break
   *     case 'artifacts':
   *       console.log('Books:', event.data.books)
   *       console.log('Music:', event.data.music)
   *       break
   *     case 'done':
   *       console.log('Complete!')
   *       break
   *     case 'error':
   *       console.error('Error:', event.data.message)
   *       break
   *   }
   * }
   * ```
   */
  async function* chatStream(
    options: ChatStreamOptions
  ): AsyncGenerator<SSEEvent, ChatStreamResult, undefined> {
    const config = await resolveConfig()
    const headers = getAuthHeaders(config)
    const url = getApiUrl(config, '/api/halap/chat/stream')

    const response = await fetchFn(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: options.query,
        conversationId: options.conversationId,
        externalUserId: options.externalUserId ?? 'sdk-user',
        metadata: options.metadata,
      }),
      signal: options.signal,
    })

    if (!response.ok) {
      await handleErrorResponse(response, 'Chat stream failed')
    }

    const conversationId = response.headers.get('X-Conversation-Id')
    const messageId = response.headers.get('X-Message-Id')

    const reader = response.body?.getReader()
    if (!reader) {
      throw new HalapiError('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6)) as SSEEvent
              yield event
            } catch {
              console.warn('[halapi-js] Failed to parse SSE event:', line)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return { conversationId, messageId }
  }

  /**
   * Get a list of conversations
   *
   * @param externalUserId - Optional filter by external user ID
   * @param limit - Maximum number of conversations to return (default: 20)
   * @returns List of conversations with metadata
   */
  async function getConversations(
    externalUserId?: string,
    limit = 20
  ): Promise<ConversationsListResponse> {
    const config = await resolveConfig()
    const headers = getAuthHeaders(config)
    const params = new URLSearchParams({ limit: String(limit) })
    if (externalUserId) {
      params.set('externalUserId', externalUserId)
    }

    const response = await fetchFn(getApiUrl(config, `/api/halap/conversations?${params}`), {
      headers,
    })

    if (!response.ok) {
      await handleErrorResponse(response, 'Failed to fetch conversations')
    }

    // Handle empty response (no conversations yet)
    const text = await response.text()
    if (!text || text.trim() === '') {
      return {
        success: true,
        conversations: [],
        metadata: {
          requestId: '',
          timestamp: new Date().toISOString(),
          count: 0,
          hasMore: false,
        },
      }
    }

    try {
      return JSON.parse(text) as ConversationsListResponse
    } catch (parseError) {
      console.error('Failed to parse conversations response:', text.substring(0, 200))
      throw new Error(`Invalid JSON response from API: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`)
    }
  }

  /**
   * Get details of a specific conversation including all messages
   *
   * @param conversationId - The conversation ID
   * @returns Conversation details with full message history
   */
  async function getConversation(conversationId: string): Promise<ConversationDetailResponse> {
    const config = await resolveConfig()
    const headers = getAuthHeaders(config)

    const response = await fetchFn(getApiUrl(config, `/api/halap/conversations/${conversationId}`), {
      headers,
    })

    if (!response.ok) {
      await handleErrorResponse(response, 'Failed to fetch conversation')
    }

    const text = await response.text()
    try {
      return JSON.parse(text) as ConversationDetailResponse
    } catch (parseError) {
      console.error('Failed to parse conversation response:', text.substring(0, 200))
      throw new Error(`Invalid JSON response from API: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`)
    }
  }

  /**
   * Get book artifacts for a specific message
   *
   * @param messageId - The message ID
   * @returns Book artifacts associated with the message
   */
  async function getBookArtifacts(messageId: string): Promise<BookArtifactsResponse> {
    const config = await resolveConfig()
    const headers = getAuthHeaders(config)

    const response = await fetchFn(getApiUrl(config, `/api/halap/artifacts/books/${messageId}`), {
      headers,
    })

    if (!response.ok) {
      await handleErrorResponse(response, 'Failed to fetch book artifacts')
    }

    return response.json() as Promise<BookArtifactsResponse>
  }

  /**
   * Get music artifacts for a specific message
   *
   * @param messageId - The message ID
   * @returns Music artifacts associated with the message
   */
  async function getMusicArtifacts(messageId: string): Promise<MusicArtifactsResponse> {
    const config = await resolveConfig()
    const headers = getAuthHeaders(config)

    const response = await fetchFn(getApiUrl(config, `/api/halap/artifacts/music/${messageId}`), {
      headers,
    })

    if (!response.ok) {
      await handleErrorResponse(response, 'Failed to fetch music artifacts')
    }

    return response.json() as Promise<MusicArtifactsResponse>
  }

  /**
   * Get presentations for multiple books by ISBN-13
   *
   * @param isbn13s - Array of ISBN-13 strings (1-100 items)
   * @returns Book presentations with success/not-found status for each ISBN
   */
  async function getBookPresentations(isbn13s: string[]): Promise<BookPresentationsResponse> {
    if (!isbn13s || isbn13s.length === 0) {
      throw new HalapiError('At least one ISBN-13 is required')
    }
    if (isbn13s.length > 100) {
      throw new HalapiError('Maximum 100 ISBN-13s allowed per request')
    }

    const config = await resolveConfig()
    const headers = getAuthHeaders(config)

    const response = await fetchFn(getApiUrl(config, '/api/halap/books/presentations'), {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isbn13s }),
    })

    if (!response.ok) {
      await handleErrorResponse(response, 'Failed to fetch book presentations')
    }

    return response.json() as Promise<BookPresentationsResponse>
  }

  return {
    chatStream,
    getConversations,
    getConversation,
    getBookArtifacts,
    getMusicArtifacts,
    getBookPresentations,
  }
}

/**
 * Type representing the Halapi client instance
 */
export type HalapiClient = ReturnType<typeof createHalapiClient>
