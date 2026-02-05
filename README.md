# halapi-js

SDK JavaScript/TypeScript pour l'API Halapi avec support du streaming SSE.

## Installation

### Via Git submodule

```bash
# Dans votre projet
git submodule add <repo-url> halapi-js

# Cloner un projet avec le submodule
git clone --recurse-submodules <your-project-url>

# Mettre à jour le submodule
git submodule update --remote halapi-js
```

### Via npm (optionnel)

```bash
npm install halapi-js
# ou
pnpm add halapi-js
```

## Quick Start

```typescript
import { createHalapiClient, adapters } from 'halapi-js'

// Créer un client avec une configuration statique
const client = createHalapiClient(adapters.static({
  apiUrl: 'https://api.example.com',
  apiToken: 'votre-token'
}))

// Envoyer un message en streaming
for await (const event of client.chatStream({ query: 'Bonjour !' })) {
  if (event.type === 'text-delta') {
    process.stdout.write(event.data.delta)
  }
}
```

## Configuration

Le SDK utilise l'injection de dépendances pour la configuration, permettant son utilisation dans n'importe quel environnement JavaScript.

### Adaptateurs pré-configurés

#### Configuration statique

```typescript
const client = createHalapiClient(adapters.static({
  apiUrl: 'https://api.example.com',
  apiToken: 'votre-token'
}))
```

#### Variables d'environnement Node.js

```typescript
// Utilise process.env.HALAPI_URL et process.env.HALAPI_TOKEN
const client = createHalapiClient(adapters.env())

// Ou avec des noms personnalisés
const client = createHalapiClient(adapters.env('MY_API_URL', 'MY_API_TOKEN'))
```

#### Configuration runtime navigateur

```html
<!-- Dans votre HTML (injection Docker) -->
<script>
  window.__HALAPI_CONFIG__ = {
    apiUrl: 'https://api.example.com',
    apiToken: 'votre-token'
  }
</script>
```

```typescript
const client = createHalapiClient(adapters.browser())
```

### Adaptateur personnalisé

Créez votre propre adaptateur pour n'importe quelle source de configuration :

```typescript
import { createHalapiClient, type ConfigProvider } from 'halapi-js'

// Exemple : configuration depuis un fichier
const fileConfigAdapter: ConfigProvider = async () => {
  const config = await fetch('/config.json').then(r => r.json())
  return {
    apiUrl: config.halapiUrl,
    apiToken: config.halapiToken
  }
}

const client = createHalapiClient(fileConfigAdapter)
```

## API Reference

### `createHalapiClient(configProvider)`

Crée une instance du client Halapi.

```typescript
const client = createHalapiClient(configProvider)
```

### `client.chatStream(options)`

Envoie un message et reçoit la réponse en streaming.

```typescript
interface ChatStreamOptions {
  query: string                      // Message de l'utilisateur
  conversationId?: string            // ID de conversation existante
  externalUserId?: string            // Identifiant utilisateur externe
  metadata?: Record<string, unknown> // Métadonnées additionnelles
  signal?: AbortSignal               // Pour annuler la requête
}
```

**Exemple complet :**

```typescript
const abortController = new AbortController()

const stream = client.chatStream({
  query: 'Recommande-moi un livre de science-fiction',
  conversationId: 'conv-123',        // Optionnel
  externalUserId: 'user-456',        // Optionnel
  signal: abortController.signal     // Pour annulation
})

for await (const event of stream) {
  switch (event.type) {
    case 'text-delta':
      // Texte incrémental
      process.stdout.write(event.data.delta)
      break

    case 'tool-call':
      // Un outil a été appelé
      console.log(`Outil appelé: ${event.data.toolName}`)
      break

    case 'tool-result':
      // Résultat d'un outil
      console.log(`Outil terminé: ${event.data.success}`)
      break

    case 'artifacts':
      // Livres et musiques recommandés
      console.log('Livres:', event.data.books)
      console.log('Musique:', event.data.music)
      console.log('Suggestions:', event.data.suggestions)
      break

    case 'cost':
      // Information de coût
      console.log('Coût:', event.data.costSummary)
      break

    case 'done':
      // Stream terminé
      console.log('Terminé !', event.data.messageId)
      break

    case 'error':
      // Erreur
      console.error('Erreur:', event.data.message)
      break
  }
}

// Pour annuler
abortController.abort()
```

### `client.getConversations(externalUserId?, limit?)`

Récupère la liste des conversations.

```typescript
const response = await client.getConversations('user-123', 20)

for (const conv of response.conversations) {
  console.log(`${conv.id}: ${conv.messageCount} messages`)
}
```

### `client.getConversation(conversationId)`

Récupère les détails d'une conversation avec tous ses messages.

```typescript
const response = await client.getConversation('conv-123')

console.log('Conversation:', response.conversation)
for (const msg of response.messages) {
  console.log(`${msg.role}: ${msg.content}`)
}
```

### `client.getBookArtifacts(messageId)`

Récupère les livres recommandés pour un message.

```typescript
const response = await client.getBookArtifacts('msg-123')

for (const book of response.books) {
  console.log(`${book.title} par ${book.author}`)
}
```

### `client.getMusicArtifacts(messageId)`

Récupère les musiques recommandées pour un message.

```typescript
const response = await client.getMusicArtifacts('msg-123')

for (const item of response.music) {
  if (item.type === 'album') {
    console.log(`Album: ${item.title || item.album} - ${item.artist}`)
  } else {
    console.log(`Track: ${item.title} - ${item.artist}`)
  }
}
```

## Types

Tous les types sont exportés et documentés :

```typescript
import type {
  // Configuration
  HalapiConfig,
  ConfigProvider,

  // Client
  HalapiClient,
  ChatStreamOptions,
  ChatStreamResult,

  // Domaine
  Book,
  Music,
  MusicAlbum,
  MusicTrackItem,
  Suggestion,
  Artifacts,
  Message,
  Conversation,
  ToolCall,
  CostSummary,

  // SSE Events
  SSEEvent,
  SSETextDeltaEvent,
  SSEToolCallEvent,
  SSEToolResultEvent,
  SSEArtifactsEvent,
  SSECostEvent,
  SSEDoneEvent,
  SSEErrorEvent,

  // API Responses
  ConversationsListResponse,
  ConversationDetailResponse,
  BookArtifactsResponse,
  MusicArtifactsResponse,
  ApiErrorResponse,
} from 'halapi-js'
```

## Gestion des erreurs

```typescript
import { HalapiError } from 'halapi-js'

try {
  const stream = client.chatStream({ query: 'Hello' })
  for await (const event of stream) {
    // ...
  }
} catch (error) {
  if (error instanceof HalapiError) {
    console.error(`Erreur API (${error.statusCode}): ${error.message}`)
  } else if (error.name === 'AbortError') {
    console.log('Requête annulée')
  } else {
    throw error
  }
}
```

## Intégration avec Vite/React

Pour utiliser le SDK dans une application Vite, créez un adaptateur personnalisé :

```typescript
// src/config/halapi.ts
import { createHalapiClient, type ConfigProvider } from '../halapi-js'

const viteAdapter: ConfigProvider = () => ({
  apiUrl: import.meta.env.VITE_HALAPI_URL || '',
  apiToken: import.meta.env.VITE_HALAPI_TOKEN || '',
})

export const halapiClient = createHalapiClient(viteAdapter)

export const isConfigured = () => Boolean(import.meta.env.VITE_HALAPI_TOKEN)
```

## Utilitaires

### `generateUUID()`

Génère un UUID v4 de manière sécurisée.

```typescript
import { generateUUID } from 'halapi-js'

const id = generateUUID() // "550e8400-e29b-41d4-a716-446655440000"
```

## Build

```bash
# Installer les dépendances
npm install

# Vérifier les types
npm run typecheck

# Build
npm run build
```

## License

MIT
