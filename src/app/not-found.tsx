import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="shell not-found">
      <p className="eyebrow">404 / A WRONG TURN</p>
      <h1>
        Let’s get you
        <br />
        back on track.
      </h1>
      <p>That page doesn’t exist. Your next big idea still can.</p>
      <Link className="button" href="/">
        Back to 4IR ↗
      </Link>
    </main>
  );
}
