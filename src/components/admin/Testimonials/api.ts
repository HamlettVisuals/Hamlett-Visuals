// Small REST helpers for the testimonial edit page's fields.

export async function getJSON<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { credentials: "include" }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json().catch(() => null)) as T | null;
}

export const idOf = (value: unknown): number | null => {
  const id = value && typeof value === "object" ? (value as { id?: unknown }).id : value;
  const n = Number(id);
  return id != null && id !== "" && Number.isFinite(n) ? n : null;
};
