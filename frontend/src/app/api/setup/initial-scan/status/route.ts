import { NextResponse } from "next/server";

import { getSetupStatusView } from "@/lib/server/provider";

export async function GET() {
  const setup = await getSetupStatusView();
  return NextResponse.json({
    initialScanStatus: setup.initialScanStatus,
    initialScanRunId: setup.initialScanRunId,
    stageLabel: setup.stageLabel,
    setupComplete: setup.setupComplete,
  });
}
