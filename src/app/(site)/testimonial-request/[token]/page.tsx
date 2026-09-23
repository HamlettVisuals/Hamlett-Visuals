import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import TestimonialRequestForm from "@/components/testimonial-request/TestimonialRequestForm";

// The public form a client lands on from the "Request a testimonial" email
// (see the Inquiries banner / /api/inquiries/[id]/testimonial-request).
// Token validation happens here, server-side, against
// Inquiries.testimonialRequestToken — overrideAccess is used deliberately:
// Inquiries' own read access is admin-only, and the unguessable token is
// what stands in for auth on this one public lookup, same reasoning as the
// public write paths under src/app/api/. Not found / already used (the
// route that handles submission clears the token on success) both render
// the same friendly invalid-link state — no need to distinguish reasons for
// a stranger visiting a stale link.

export const metadata = {
  title: "Share your testimonial — Hamlett Visuals",
};

export default async function TestimonialRequestPage({
  params,
}: PageProps<"/testimonial-request/[token]">) {
  const { token } = await params;
  const payload = await getPayload({ config });

  const { docs } = await payload.find({
    collection: "inquiries",
    where: { testimonialRequestToken: { equals: token } },
    limit: 1,
    overrideAccess: true,
  });
  const inquiry = docs[0];

  const siteSettings = await payload.findGlobal({ slug: "site-settings" });
  const ownerLabel = siteSettings.siteName || "Hamlett Visuals";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-gutter py-section">
      {!inquiry ? (
        <section className="py-16 text-center">
          <h1 className="font-display text-heading text-ink">
            This link isn&rsquo;t valid
          </h1>
          <p className="mx-auto mt-3 max-w-measure text-body text-muted">
            It may have already been used, or the link may have expired. If
            you&rsquo;d like to leave a testimonial, just reach out and{" "}
            {ownerLabel} can send you a fresh link.
          </p>
        </section>
      ) : (
        <>
          <div>
            <h1 className="font-display text-page text-ink">
              Share your testimonial
            </h1>
            <dl className="mt-4 flex flex-col gap-1 text-caption text-muted">
              <div>
                <dt className="inline font-medium text-ink">Name: </dt>
                <dd className="inline">{inquiry.name}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-ink">Email: </dt>
                <dd className="inline">{inquiry.email}</dd>
              </div>
              {typeof inquiry.event === "object" && inquiry.event && (
                <div>
                  <dt className="inline font-medium text-ink">Shoot: </dt>
                  <dd className="inline">{inquiry.event.title}</dd>
                </div>
              )}
              {typeof inquiry.event === "object" &&
                inquiry.event &&
                typeof inquiry.event.category === "object" &&
                inquiry.event.category && (
                  <div>
                    <dt className="inline font-medium text-ink">Category: </dt>
                    <dd className="inline">{inquiry.event.category.name}</dd>
                  </div>
                )}
            </dl>
          </div>

          <div className="mt-8">
            <TestimonialRequestForm
              token={token}
              name={inquiry.name}
              ownerLabel={ownerLabel}
            />
          </div>
        </>
      )}

      <p className="mt-16">
        <Link href="/" className="link text-ink">
          Back to home
        </Link>
      </p>
    </div>
  );
}
