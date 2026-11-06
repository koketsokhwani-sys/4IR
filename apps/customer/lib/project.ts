import { fields, type Draft, type Field } from "./draft.ts";
export function missingSubmissionFields(draft: Draft): string[] {
  const required: Field[] = ["contact_name", "business_name", "description", "website_content"];
  if (draft.plan === "business" || draft.plan === "booking") required.push("services");
  if (draft.plan === "booking") required.push("availability");
  if (draft.plan === "store") required.push("products", "delivery");
  const missing: string[] = required.filter(key => !draft[key]?.trim()).map(key => fields[key].label);
  if (!draft.phone?.trim() && !draft.contact_email?.trim()) missing.push("A contact number or public business email");
  return missing;
}
export const projectStatus = {
  submitted: "Submitted for review",
  changes_requested: "Changes requested",
  ready_for_planning: "Ready for planning",
} as const;
export type ProjectSubmission = {
  id: string; draft_revision: number; plan: Draft["plan"]; content: Omit<Draft, "plan">;
  status: keyof typeof projectStatus; submitted_at: string;
};
export type ProjectEvent = { submission_id: string; event_number: number; status: keyof typeof projectStatus; note: string; created_at: string };
