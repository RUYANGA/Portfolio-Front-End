import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import "@/styles/analytics.css";
import "@/styles/analytics-live.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
