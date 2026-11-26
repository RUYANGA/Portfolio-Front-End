import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/site/Footer";
import Header from "@/components/site/Header";
import BookingFlow from "@/components/site/booking/BookingFlow";
import { ArrowLeft, Mail } from "@/components/ui/Icons";
import { DEFAULT_CV_PATH, getPortfolio } from "@/lib/api";
import { getBookingInfo } from "@/lib/api/booking";
import "@/styles/booking.css";

const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const revalidate = 60;

type Params = { searchParams: { type?: string } };

export async function generateMetadata({ searchParams }: Params): Promise<Metadata> {
  const [{ profile }, info] = await Promise.all([getPortfolio(), getBookingInfo()]);
  const type = info?.meeting_types.find((t) => t.slug === searchParams.type);
  const title = type ? `Book a ${type.title.toLowerCase()} with ${profile.name}` : `Book a call with ${profile.name}`;
  const description = `Pick a time that suits you for a video call with ${profile.name}, ${profile.title}. You'll get a calendar invitation straight away.`;
  return { title, description, alternates: { canonical: "/book" }, openGraph: { title, description } };
}

export default async function BookPage({ searchParams }: Params) {
  const [{ profile }, info] = await Promise.all([getPortfolio(), getBookingInfo()]);
  const open = info && info.enabled && info.meeting_types.length > 0;

  return (
    <>
      <Header name={profile.name} cvUrl={profile.cv_file || DEFAULT_CV_PATH} />
      <main id="main" className="bk-page">
        <div className="wrap">
          <Link href="/#contact" className="bk-crumb">
            <ArrowLeft size={16} /> Back to the portfolio
          </Link>
          <header className="bk-intro">
            <p className="eyebrow">Book a call</p>
            <h1 className="section-title">Let&apos;s find a time to talk</h1>
            <p className="section-lede">
              Choose a time that works for you. Times are shown in your own time zone, and the calendar invitation
              arrives in your inbox as soon as you book.
            </p>
          </header>

          {open ? (
            <BookingFlow
              apiUrl={PUBLIC_API}
              info={info}
              owner={{ name: profile.name, title: profile.title, photo: profile.photo }}
              initialType={searchParams.type}
              siteUrl={process.env.NEXT_PUBLIC_SITE_URL}
            />
          ) : (
            <div className="bk-card bk-closed">
              <h2>Online booking isn&apos;t available right now</h2>
              <p className="bk-muted">Send me a message instead and I&apos;ll suggest a few times that suit you.</p>
              <div className="bk-done-actions">
                <Link className="button button-primary" href="/#contact">
                  Send a message
                </Link>
                <a className="button button-secondary" href={`mailto:${profile.email}?subject=${encodeURIComponent("Scheduling a call")}`}>
                  <Mail size={16} /> {profile.email}
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer profile={profile} />
    </>
  );
}
