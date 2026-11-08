/**
 * True in the dev server and in builds made for previews. It is replaced by a constant when the app
 * is bundled, so a production build contains none of the test tools.
 */
export const TEST_TOOLS: boolean = import.meta.env.VITE_TEST_TOOLS === 'true'
