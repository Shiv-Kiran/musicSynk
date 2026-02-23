import { SettingsPage } from "@/components/settings-page";
import { getSettingsView } from "@/lib/mock/store";

export default function SettingsRoute() {
  const data = getSettingsView();
  return <SettingsPage initialData={data} />;
}
