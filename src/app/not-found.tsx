import Link from "next/link";
import { ArrowLeft } from "@/components/ui/Icons";

export default function NotFound() {
  return (
    <main id="main" className="wrap not-found">
      <p className="eyebrow">Error 404</p>
      <h1>Page not found</h1>
      <p className="project-lede">This address doesn&apos;t match any page on the site.</p>
      <Link className="button button-primary" href="/">
        <ArrowLeft size={16} />
        Back to the homepage
      </Link>
    </main>
  );
}
