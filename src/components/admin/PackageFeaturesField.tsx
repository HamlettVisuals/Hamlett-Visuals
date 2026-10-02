"use client";

import type { ArrayFieldClientComponent } from "payload";
import { FEATURE_MAX, FEATURES_MAX } from "@/lib/package-limits";
import LinkRowsEditor from "@/components/admin/LinkRowsEditor";

// A package's features (collections/PricingRows.ts → features): the same
// compact rows as Header/Nav's links (LinkRowsEditor), one capped text
// box per feature that wraps long text onto more lines (so nothing is cut
// off on a phone) while staying one line of text. They show as the ticked list behind the package's
// "Show details" button on the homepage.
const TEXT_FIELDS = [{ name: "text", placeholder: "e.g. Up to 8 hours of coverage", max: FEATURE_MAX, multiline: true }];

const PackageFeaturesField: ArrayFieldClientComponent = (props) => (
  <LinkRowsEditor
    fieldProps={props}
    className="nav-links--features"
    title="Features"
    intro="What's included, shown as a ticked list under Show details on your homepage. Drag to reorder."
    textFields={TEXT_FIELDS}
    maxRows={FEATURES_MAX}
    addLabel="Add feature"
    capHint={`${FEATURES_MAX} features is the most that read well on a phone. Remove one to add another.`}
    summarize={(row) => row.text?.trim() || "Empty feature"}
  />
);

export default PackageFeaturesField;
