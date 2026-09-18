import Link from "next/link";
import { getSiteSettings } from "@/lib/site-settings";

// Privacy Policy — standalone page. Placeholder content only; real policy
// copy comes later. Structure and section headings are final; the paragraph
// copy under each is believable placeholder text, not lorem ipsum, so the
// page reads naturally before real copy lands.
//
// Terms & Conditions used to live here as a second #terms section; it now has
// its own page at src/app/terms/page.tsx, which mirrors this page's shell so
// the two documents read as siblings.
//
// Contact details come from Site Settings — same source as the Footer and
// Booking CTA — but this page isn't part of the homepage Live Preview, so
// there's no useLivePreview here: it just reads the current published/draft
// value at request time, same as any other server-rendered page.

export const metadata = {
  title: "Privacy Policy — Hamlett Visuals",
};

// TODO: placeholder "last updated" date — swap for the real date whenever
// the wording is next revised.
const PRIVACY_LAST_UPDATED = "September 15, 2026";

export default async function PrivacyPolicyPage() {
  const { contact } = await getSiteSettings();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-gutter py-section">
      <header>
        <h1 className="font-display text-page text-ink">Privacy policy</h1>
        <p className="mt-3 text-caption text-muted">
          Placeholder copy — final wording pending.
        </p>
        <p className="mt-2 text-caption text-muted">
          Last updated: {PRIVACY_LAST_UPDATED}
        </p>
      </header>

      <div className="mt-12 flex flex-col gap-10">
        <section>
          <h2 className="font-display text-heading text-ink">
            Information We Collect
          </h2>
          <p className="mt-3 max-w-measure text-body text-muted">
            When you reach out through a booking inquiry or contact form, we
            collect the details you provide, such as your name, email
            address, phone number, and information about the shoot
            you&rsquo;re planning. Basic usage data, like which pages are
            visited and how long a session lasts, may also be collected
            automatically while you browse the site.
          </p>
        </section>

        <section>
          <h2 className="font-display text-heading text-ink">
            How We Use It
          </h2>
          <p className="mt-3 max-w-measure text-body text-muted">
            Information you share is used to respond to inquiries, schedule
            and prepare for sessions, and communicate with you about your
            booking. Usage data helps us understand how the site is used so
            we can keep it fast and easy to navigate. We do not sell your
            information to third parties.
          </p>
        </section>

        <section>
          <h2 className="font-display text-heading text-ink">
            Cookies &amp; Analytics
          </h2>
          <p className="mt-3 max-w-measure text-body text-muted">
            This site may use cookies and lightweight analytics tools to
            understand which pages get visited and how people find their way
            around. These tools collect aggregate, non-identifying usage
            patterns rather than anything tied to you personally. You can
            disable cookies in your browser settings if you&rsquo;d prefer not
            to be included.
          </p>
        </section>

        <section>
          <h2 className="font-display text-heading text-ink">
            Third-Party Services
          </h2>
          <p className="mt-3 max-w-measure text-body text-muted">
            A handful of trusted third-party services help run this site and
            business behind the scenes, such as booking and scheduling tools,
            gallery hosting for delivered photos, and email delivery for
            inquiries and confirmations. Each is chosen with care and only
            receives the information it needs to do its job.
          </p>
        </section>

        <section>
          <h2 className="font-display text-heading text-ink">Contact</h2>
          <p className="mt-3 max-w-measure text-body text-muted">
            Questions about this policy or how your information is handled
            are welcome any time.
          </p>
          <div className="mt-4 flex flex-col gap-1.5 text-caption text-muted">
            <a href={`mailto:${contact.email}`} className="link text-ink">
              {contact.email}
            </a>
            <a href={contact.phoneHref} className="link text-ink">
              {contact.phoneDisplay}
            </a>
          </div>
        </section>
      </div>

      <p className="mt-16">
        <Link href="/" className="link text-ink">
          Back to home
        </Link>
      </p>
    </div>
  );
}
