import ResumeBuilder from "@/components/admin/ResumeBuilder";
import "@/styles/resume-builder.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "CV" };

export default function ResumePage() {
  return <ResumeBuilder />;
}
