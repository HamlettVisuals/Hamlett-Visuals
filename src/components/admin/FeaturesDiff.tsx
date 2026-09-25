"use client";

import { makeLinkListDiff } from "@/components/admin/LinkListDiff";

// History's comparison for a package's features (collections/PricingRows.ts
// → features): one line per feature.
const FeaturesDiff = makeLinkListDiff((row) => row.text ?? "", "(no features)");

export default FeaturesDiff;
