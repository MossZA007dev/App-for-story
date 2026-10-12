import { getAllProjectsEnriched } from "@/lib/projects/getProjects";
import SagasDashboardClient from "./SagasDashboardClient";

export const dynamic = "force-dynamic";

export default function SagasDashboardPage() {
  const initialProjects = getAllProjectsEnriched();
  return <SagasDashboardClient initialProjects={initialProjects} />;
}
