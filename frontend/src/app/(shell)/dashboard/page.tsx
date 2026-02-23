import { DashboardPage } from "@/components/dashboard-page";
import { getDashboardView } from "@/lib/mock/store";

export default function DashboardRoute() {
  const data = getDashboardView(30);
  return <DashboardPage initialData={data} />;
}
