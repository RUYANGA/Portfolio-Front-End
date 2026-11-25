import { notFound } from "next/navigation";
import ResourceList from "@/components/admin/ResourceList";
import SubjectManager from "@/components/admin/SubjectManager";
import { getResource } from "@/lib/admin/resources";

type Props = { params: { resource: string } };

export function generateMetadata({ params }: Props) {
  return { title: getResource(params.resource)?.label ?? "Not found" };
}

// Rendered per request so the panel layout re-checks the session every time.
export const dynamic = "force-dynamic";

export default function ResourcePage({ params }: Props) {
  const resource = getResource(params.resource);
  if (!resource) notFound();
  return (
    <>
      <header className="adm-page-head">
        <div>
          <h1>{resource.label}</h1>
          <p>{resource.description}</p>
        </div>
      </header>
      {/* Subjects are a simple list, so they get an inline manager instead of the list + form pages. */}
      {resource.key === "contact-subjects" ? <SubjectManager /> : <ResourceList resourceKey={resource.key} />}
    </>
  );
}
