import {withServerAccount} from "@/lib/auth/account";
import { getAllProjectsEnriched } from "@/lib/projects/getProjects";
import SagasDashboardClient from "./SagasDashboardClient";

export const dynamic = "force-dynamic";

export default async function SagasDashboardPage() {
  const initialProjects = await withServerAccount(() => getAllProjectsEnriched());
  return <SagasDashboardClient initialProjects={initialProjects} />;
}
