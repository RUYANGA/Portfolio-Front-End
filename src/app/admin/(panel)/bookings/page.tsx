import BookingsManager from "@/components/admin/BookingsManager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Bookings" };

export default function BookingsPage() {
  return <BookingsManager />;
}
