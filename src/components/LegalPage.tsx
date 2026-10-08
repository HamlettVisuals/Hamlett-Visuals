"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { SerializedLinkNode } from "@payloadcms/richtext-lexical";
import { RichText, type JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";
import { formatLastUpdated, hasText, type LegalSlug } from "@/lib/legal-pages";
import { serverURL } from "@/lib/server-url";
import { useScopedLivePreview } from "@/lib/use-scoped-live-preview";
import type { PrivacyPolicy, Term } from "@/payload-types";

// The Privacy Policy and Terms pages (app/(site)/privacy-policy, terms):
// her title, "Last updated" date and text from the page's global
// (globals/LegalPages.ts), following the form as she types in Live Preview.
// The text is styled with the site's own type: H2 as the section headings
// elsewhere, H3 a step smaller, paragraphs and lists in the body style,
// links with .link.

type LegalDoc = Pick<PrivacyPolicy | Term, "title" | "body" | "lastUpdated">;

// Internal links point at a portfolio category (globals/LegalPages.ts).
function internalHref(node: SerializedLinkNode): string {
  const value = node.fields.doc?.value;
  const slug = typeof value === "object" && value !== null && "slug" in value ? value.slug : null;
  return typeof slug === "string" && slug ? `/portfolio/${slug}` : "/#categories";
}

function TextLink({ href, newTab, children }: { href: string; newTab?: boolean; children: ReactNode }) {
  const external = { target: newTab ? "_blank" : undefined, rel: newTab ? "noopener noreferrer" : undefined };
  return href.startsWith("/") || href.startsWith("#") ? (
    <Link href={href} className="link text-ink" {...external}>
      {children}
    </Link>
  ) : (
    <a href={href} className="link text-ink" {...external}>
      {children}
    </a>
  );
}

const converters: JSXConvertersFunction = ({ defaultConverters }) => {
  return {
    ...defaultConverters,
    heading: ({ node, nodesToJSX }) => {
      const children = nodesToJSX({ nodes: node.children });
      return node.tag === "h2" ? (
        <h2 className="mt-10 font-display text-heading text-ink">{children}</h2>
      ) : (
        <h3 className="mt-8 font-display text-title text-ink">{children}</h3>
      );
    },
    paragraph: ({ node, nodesToJSX }) => {
      const children = nodesToJSX({ nodes: node.children });
      return <p className="mt-3 max-w-measure text-body text-muted">{children.length ? children : <br />}</p>;
    },
    list: ({ node, nodesToJSX }) => {
      const children = nodesToJSX({ nodes: node.children });
      const className = "mt-3 flex max-w-measure flex-col gap-1.5 pl-5 text-body text-muted";
      return node.tag === "ol" ? (
        <ol className={`list-decimal ${className}`}>{children}</ol>
      ) : (
        <ul className={`list-disc ${className}`}>{children}</ul>
      );
    },
    listitem: ({ node, nodesToJSX }) => {
      const nested = node.children.some((child) => child.type === "list");
      return (
        <li value={node.value} className={nested ? "list-none" : undefined}>
          {nodesToJSX({ nodes: node.children })}
        </li>
      );
    },
    link: ({ node, nodesToJSX }) => (
      <TextLink
        href={node.fields.linkType === "internal" ? internalHref(node) : (node.fields.url ?? "")}
        newTab={node.fields.newTab}
      >
        {nodesToJSX({ nodes: node.children })}
      </TextLink>
    ),
    autolink: ({ node, nodesToJSX }) => (
      <TextLink href={node.fields.url ?? ""} newTab={node.fields.newTab}>
        {nodesToJSX({ nodes: node.children })}
      </TextLink>
    ),
  };
};

export default function LegalPage({
  slug,
  doc,
  fallbackTitle,
  preview,
}: {
  slug: LegalSlug;
  doc: LegalDoc;
  fallbackTitle: string;
  /** A signed-in admin's preview of a page that may have no text yet. */
  preview: boolean;
}) {
  // depth 1: an internal link's category comes back with its slug.
  const { data } = useScopedLivePreview<LegalDoc>({
    initialData: doc,
    serverURL,
    globalSlug: slug,
    apiRoute: "/hv-studio/api",
    depth: 1,
  });
  const lastUpdated = formatLastUpdated(data.lastUpdated);
  const empty = !hasText(data.body);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-gutter py-section">
      <header>
        <h1 className="font-display text-page text-ink">{data.title?.trim() || fallbackTitle}</h1>
        {lastUpdated && <p className="mt-3 text-caption text-muted">Last updated {lastUpdated}</p>}
      </header>

      {empty ? (
        preview && (
          <p className="mt-12 text-body text-muted">
            Nothing written yet. This page and its footer link stay hidden until you publish some text.
          </p>
        )
      ) : (
        <RichText data={data.body!} converters={converters} className="mt-10 [&>:first-child]:mt-0" />
      )}

      <p className="mt-16">
        <Link href="/" className="link text-ink">
          Back to home
        </Link>
      </p>
    </div>
  );
}
