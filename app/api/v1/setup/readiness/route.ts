import { NextResponse } from "next/server";

import { checkReadiness } from "@/lib/system/readiness";

export async function GET() {
  const result = await checkReadiness();
  return NextResponse.json(result);
}
