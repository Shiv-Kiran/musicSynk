import { NextResponse } from "next/server";

import { getSetupStatusView } from "@/lib/mock/store";

export async function GET() {
  const setup = getSetupStatusView();
  return NextResponse.json({
    initialScanStatus: setup.initialScanStatus,
    initialScanRunId: setup.initialScanRunId,
    stageLabel: setup.stageLabel,
    setupComplete: setup.setupComplete,
  });
}
