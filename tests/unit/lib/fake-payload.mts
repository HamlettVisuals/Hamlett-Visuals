// A small in-memory stand-in for Payload's Local API, enough for the
// Instagram video and cleanup code under test: find / create / update /
// delete on plain arrays, with the `where` shapes that code uses
// (equals, not_equals, in, and, or). Records every write.

type Doc = Record<string, unknown> & { id: number };
type Where = Record<string, unknown>;

const valueOf = (doc: Doc, field: string) => {
  const value = doc[field];
  return value && typeof value === "object" && "id" in (value as object) ? (value as { id: unknown }).id : value;
};

function matches(doc: Doc, where: Where | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, condition]) => {
    if (key === "and") return (condition as Where[]).every((w) => matches(doc, w));
    if (key === "or") return (condition as Where[]).some((w) => matches(doc, w));
    const value = valueOf(doc, key);
    const c = condition as Record<string, unknown>;
    if ("equals" in c) return value === c.equals || (c.equals === false && !value);
    if ("not_equals" in c) return value !== c.not_equals;
    if ("in" in c) return (c.in as unknown[]).map(String).includes(String(value));
    throw new Error(`fake payload: unsupported condition ${JSON.stringify(c)}`);
  });
}

export function fakePayload(collections: Record<string, Doc[]>) {
  let nextId = 1000;
  const writes: { op: string; collection: string; ids?: unknown[]; data?: unknown; file?: { name: string; size: number } }[] = [];
  const table = (name: string) => (collections[name] ??= []);
  const payload = {
    logger: { warn() {}, error() {}, info() {} },
    async find({ collection, where }: { collection: string; where?: Where }) {
      return { docs: table(collection).filter((doc) => matches(doc, where)) };
    },
    async create({ collection, data, file }: { collection: string; data: Record<string, unknown>; file?: { name: string; size: number } }) {
      const doc = { id: nextId++, ...data, ...(file ? { filename: file.name, filesize: file.size } : {}) } as Doc;
      table(collection).push(doc);
      writes.push({ op: "create", collection, data, file: file && { name: file.name, size: file.size } });
      return doc;
    },
    async update({ collection, id, data }: { collection: string; id: number; data: Record<string, unknown> }) {
      const doc = table(collection).find((d) => d.id === id);
      if (!doc) throw new Error(`fake payload: no ${collection} ${id}`);
      Object.assign(doc, data);
      writes.push({ op: "update", collection, ids: [id], data });
      return doc;
    },
    async delete({ collection, where }: { collection: string; where: Where }) {
      const gone = table(collection).filter((doc) => matches(doc, where));
      collections[collection] = table(collection).filter((doc) => !gone.includes(doc));
      writes.push({ op: "delete", collection, ids: gone.map((doc) => doc.id) });
      return { docs: gone };
    },
  };
  return { payload, writes, collections };
}
