import BookingSettingsEditor from "@/components/admin/BookingSettingsEditor";

export const dynamic = "force-dynamic";

export const metadata = { title: "Booking settings" };

export default function BookingSettingsPage() {
  return <BookingSettingsEditor />;
}
