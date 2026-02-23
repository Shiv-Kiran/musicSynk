import { DashboardPage } from "@/components/dashboard-page";
import { getDashboardView } from "@/lib/server/provider";

export default async function DashboardRoute() {
  const data = await getDashboardView(30);
  return <DashboardPage initialData={data} />;
}
