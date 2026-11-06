import { portalConfig } from "./config";
// Separate, server-only switch: a migration or existing pilot configuration cannot enable this feature.
export function projectWorkflowEnabled() {
  return !!portalConfig() && process.env.PORTAL_PROJECT_WORKFLOW_ENABLED === "true";
}
