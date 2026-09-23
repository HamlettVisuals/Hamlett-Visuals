import config from "@payload-config";
import "@payloadcms/next/css";
// Unlayered overrides — see the file's own header comment for why these
// win over Payload's `@layer payload-default` styles without !important.
// Loaded after Payload's own CSS so cascade layer order can't matter
// either way, but the order is kept correct regardless.
import "./admin-overrides.css";
import type { Metadata } from "next";
import type { ServerFunctionClient } from "payload";
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";
import React from "react";
import { importMap } from "./hv-studio/importMap.js";

type Args = {
  children: React.ReactNode;
};

// /hv-studio is an internal admin tool, not a site page — never indexed.
// (Belt-and-braces alongside the /hv-studio Disallow rule in
// src/app/robots.ts, since robots.txt is only a request, not an enforcement.)
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const serverFunction: ServerFunctionClient = async function (args) {
  "use server";
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  });
};

const Layout = ({ children }: Args) => (
  <RootLayout
    config={config}
    importMap={importMap}
    serverFunction={serverFunction}
  >
    {children}
  </RootLayout>
);

export default Layout;
