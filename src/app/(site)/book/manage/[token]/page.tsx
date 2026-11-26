import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/site/Footer";
import Header from "@/components/site/Header";
import ManageBooking from "@/components/site/booking/ManageBooking";
import { ArrowLeft } from "@/components/ui/Icons";
import { DEFAULT_CV_PATH, getPortfolio } from "@/lib/api";
import "@/styles/booking.css";

const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Private, per-visitor page: never cached or indexed.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your booking", robots: { index: false, follow: false } };

export default async function ManageBookingPage({ params }: { params: { token: string } }) {
  const { profile } = await getPortfolio();
  return (
    <>
      <Header name={profile.name} cvUrl={profile.cv_file || DEFAULT_CV_PATH} />
      <main id="main" className="bk-page">
        <div className="wrap bk-narrow">
          <Link href="/" className="bk-crumb">
            <ArrowLeft size={16} /> Back to the portfolio
          </Link>
          <div className="bk-card bk-card-single">
            <ManageBooking apiUrl={PUBLIC_API} token={params.token} owner={profile.name} />
          </div>
        </div>
      </main>
      <Footer profile={profile} />
    </>
  );
}
