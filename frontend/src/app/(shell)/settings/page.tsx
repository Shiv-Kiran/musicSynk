import { SettingsPage } from "@/components/settings-page";
import { getSettingsView } from "@/lib/server/provider";

export default async function SettingsRoute() {
  const data = await getSettingsView();
  return <SettingsPage initialData={data} />;
}
