import { getAllProjectsEnriched } from "@/lib/projects/getProjects";
import StudioDashboardClient from "./StudioDashboardClient";

export const dynamic = "force-dynamic";

export default function StudioDashboardPage() {
  const initialProjects = getAllProjectsEnriched();
  return <StudioDashboardClient initialProjects={initialProjects} />;
}
