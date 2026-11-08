import { localAccess } from "../../lib/access";
import { projectWorkflowEnabled } from "../../lib/project-config";
import { Dashboard } from "./ui";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!(await localAccess()) || !projectWorkflowEnabled())
    return <main id="main"><h1>Project submissions are closed.</h1><a href="/">Back to the portal</a></main>;
  return <main id="main">
    <p className="eyebrow">YOUR WEBSITE PROJECT</p><h1>Your project dashboard.</h1>
    <p>Save your onboarding, review the saved information below, then submit it to 4IR for review.</p>
    <p>Drafts and submissions are unpaid. They do not activate a subscription or approve payment, development or launch.</p>
    <nav><a href="/onboarding">Edit onboarding draft</a><a href="/account?mode=signin">Account</a></nav>
    <Dashboard />
  </main>;
}
