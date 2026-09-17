// Single source for the app's own origin — used by payload.config.ts (Live
// Preview URLs), Payload globals that need to build their own Live Preview
// URL override (e.g. Hero), and the client components that call
// useLivePreview()/RefreshRouteOnSave(). Globals can't import this value
// from payload.config.ts directly (payload.config.ts imports the globals,
// so that would be circular), hence the shared standalone module.
export const serverURL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
