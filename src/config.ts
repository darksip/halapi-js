/**
 * Configuration management for Halapi SDK
 *
 * The SDK uses dependency injection for configuration, allowing it to work
 * in any JavaScript environment (Node.js, browsers, Vite, etc.)
 */

/**
 * API configuration required to connect to Halapi
 */
export interface HalapiConfig {
  /** Base URL for the API (empty string = use relative URLs / proxy) */
  apiUrl: string
  /** Bearer token for authentication */
  apiToken: string
}

/**
 * Function that provides configuration, can be sync or async
 */
export type ConfigProvider = () => HalapiConfig | Promise<HalapiConfig>

/**
 * Pre-built configuration adapters for common environments
 */
export const adapters = {
  /**
   * Static configuration - provide config values directly
   * @example
   * const client = createHalapiClient(adapters.static({
   *   apiUrl: 'https://api.example.com',
   *   apiToken: 'your-token'
   * }))
   */
  static: (config: HalapiConfig): ConfigProvider => () => config,

  /**
   * Node.js environment variables adapter
   * @param urlVar - Environment variable name for API URL (default: 'HALAPI_URL')
   * @param tokenVar - Environment variable name for API token (default: 'HALAPI_TOKEN')
   * @example
   * const client = createHalapiClient(adapters.env())
   * // Uses process.env.HALAPI_URL and process.env.HALAPI_TOKEN
   */
  env: (urlVar = 'HALAPI_URL', tokenVar = 'HALAPI_TOKEN'): ConfigProvider => () => {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
      ?.env
    return {
      apiUrl: env?.[urlVar] || '',
      apiToken: env?.[tokenVar] || '',
    }
  },

  /**
   * Browser runtime configuration adapter
   * Reads from window.__HALAPI_CONFIG__ object (useful for Docker deployments)
   * @example
   * // In HTML: <script>window.__HALAPI_CONFIG__ = { apiUrl: '...', apiToken: '...' }</script>
   * const client = createHalapiClient(adapters.browser())
   */
  browser: (): ConfigProvider => () => {
    const config = (globalThis as { __HALAPI_CONFIG__?: HalapiConfig }).__HALAPI_CONFIG__
    return {
      apiUrl: config?.apiUrl || '',
      apiToken: config?.apiToken || '',
    }
  },
}

/**
 * Check if the provided configuration is valid (has a token)
 */
export function isConfigValid(config: HalapiConfig): boolean {
  return Boolean(config.apiToken)
}
