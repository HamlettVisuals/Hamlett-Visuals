import type { PayloadRequest } from "payload";
import { isolateObjectProperty } from "payload";

// The request for a save on another upload collection made from inside
// this one's save (a Backstage video's thumbnail, an album video's
// automatic poster): same transaction, but its own file and context.
// Payload's Local API puts the nested save's file on `req.file`, and the
// storage plugin remembers "this request's file" in `req.context` the
// first time it sees one, so on the shared request the outer upload would
// be stored with the nested one's bytes.
//
// Part of payload.config.ts's module graph, so no "@/…" imports.
export function nestedUploadReq(req: PayloadRequest): PayloadRequest {
  const isolated = isolateObjectProperty(req, ["file", "payloadUploadSizes", "context"]);
  isolated.file = undefined;
  isolated.payloadUploadSizes = undefined;
  isolated.context = {};
  return isolated;
}
