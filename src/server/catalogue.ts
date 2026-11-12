import { createServerFn } from "@tanstack/react-start";
import { catalogue } from "~/data/catalogue";

// The catalogue and its gaps, worked out on the server for the day of the request.
export const getCatalogue = createServerFn({ method: "GET" }).handler(
  async () => ({
    problems: catalogue.problems,
    apps: catalogue.apps,
    gaps: catalogue.gaps(new Date()),
    staleDays: catalogue.STALE_DAYS,
    costly: catalogue.COSTLY,
  }),
);
