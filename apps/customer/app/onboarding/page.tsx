import { localAccess } from "../../lib/access";
import { Onboarding } from "./ui";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!(await localAccess()))
    return (
      <main id="main">
        <h1>Registration isn’t open just yet.</h1>
      </main>
    );
  return (
    <main id="main">
      <p className="eyebrow">LOCAL DEVELOPMENT PREVIEW · USE TEST DETAILS</p>
      <h1>Tell us about your business.</h1>
      <p>
        Choose a package and save your content as a draft. You can return to
        finish later.
      </p>
      <Onboarding />
    </main>
  );
}
