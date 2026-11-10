/// <reference types="vite/client" />

/** True in the dev server and in preview builds; replaced by a constant at build time. See vite.config.ts. */
declare const __TEST_TOOLS__: boolean

/** Every JSON file of the content folder, as text, keyed `content/<path>`. Provided by vite.config.ts. */
declare module 'virtual:pinpoint-content-seed' {
  const files: Record<string, string>
  export default files
}
