/// <reference types="vite/client" />
/// <reference types="chrome" />

// crxjs virtual imports: resolve to the built script's runtime path (string),
// used for on-demand chrome.scripting.executeScript injection.
declare module '*?iife' {
  const src: string
  export default src
}
declare module '*?script' {
  const src: string
  export default src
}
