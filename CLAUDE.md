@AGENTS.md

## Dev server

After a long session with edits to Payload config files (collections, globals,
anything in payload.config.ts's import graph) or a `git stash` / restore,
restart the dev server (stop it by port 3000, then `npm run dev`) before
trusting a bisect or an unexplained e2e failure. A dev server that has
hot-reloaded for hours can throw Payload errors that aren't in the code
(e.g. "Cannot destructure property 'config'"); a fresh one doesn't. For full
server stack traces instead of "at ignore-listed frames", start it with
`__NEXT_SHOW_IGNORE_LISTED=true npm run dev`.
