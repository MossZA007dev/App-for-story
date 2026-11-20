import {withServerAccount} from "@/lib/auth/account";
import { getAllProjectsEnriched } from "@/lib/projects/getProjects";
import StudioDashboardClient from "./StudioDashboardClient";

export const dynamic = "force-dynamic";

export default async function StudioDashboardPage() {
  const initialProjects = await withServerAccount(() => getAllProjectsEnriched());
  return <StudioDashboardClient initialProjects={initialProjects} />;
}
