/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly ELEVENLABS_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
