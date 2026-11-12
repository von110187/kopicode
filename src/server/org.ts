import { createServerFn } from "@tanstack/react-start";
import { computeOrg } from "~/org/metrics";
import { mockOrg } from "~/org/mock-org";
import { standInValues } from "~/org/stand-in-values";

// The org's metrics, recomputed on the server from the org and people's values.
export const getOrgMetrics = createServerFn({ method: "GET" }).handler(async () => {
  const org = mockOrg();
  return computeOrg(org, standInValues(org));
});
