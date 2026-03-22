/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROJECT?: string;
  readonly VITE_IMPLEMENTATION?: string;
  readonly VITE_ENABLE_THEATRE_STUDIO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __EXPLAINER_SET_PHASE?: (nextPhase: number | null) => void;
  __EXPLAINER_STAGE_COUNT?: number;
}
