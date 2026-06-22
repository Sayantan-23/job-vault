// A minted extension token as shown in Settings → Connected apps. Dates arrive
// as ISO strings over JSON.
export interface ConnectedApp {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  createdAt: string
}

// Returned exactly once, at creation — `rawKey` is never retrievable again.
export interface CreatedApiKey extends ConnectedApp {
  rawKey: string
}
