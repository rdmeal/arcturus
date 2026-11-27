import type { ProblemDetails } from "@arcturus/service-runtime";
import { Factory } from "fishery";

/** A neighbour's problem-details answer, for faking a failed call. */
export const problemDetailsFactory = Factory.define<ProblemDetails>(() => ({
  type: "about:blank",
  title: "Unprocessable Content",
  status: 422,
  detail: "The request breaks a rule.",
  code: "rule-violated",
}));
