// History's comparison for internal fields (slugs, locked links, sort keys):
// shows nothing. Attached by lib/hide-internal-history.ts to every field
// that's hidden in the editor, so the comparison only lists what she can
// actually see and edit. Restoring still restores these fields; they just
// aren't listed. The empty row this leaves is hidden in admin-overrides.css.
export default function HiddenDiff() {
  return null;
}
