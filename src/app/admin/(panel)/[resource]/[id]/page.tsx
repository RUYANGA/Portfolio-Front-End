import { notFound } from "next/navigation";
import ResourceEditor from "@/components/admin/ResourceEditor";
import { getResource } from "@/lib/admin/resources";

type Props = { params: { resource: string; id: string } };

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: Props) {
  const resource = getResource(params.resource);
  if (!resource) return { title: "Not found" };
  return { title: params.id === "new" ? `New ${resource.singular}` : `Edit ${resource.singular}` };
}

export default function EditPage({ params }: Props) {
  const resource = getResource(params.resource);
  if (!resource || !(params.id === "new" || /^\d+$/.test(params.id))) notFound();
  return <ResourceEditor resourceKey={resource.key} id={params.id} />;
}
