/// <reference types="vite/client" />

/**
 * Vite environment variables type definitions
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // Add more environment variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
