import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), "data", "sample_reports_demo.csv");
    const content = await fs.readFile(csvPath, "utf-8");

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sample_reports_demo.csv"',
        "X-Data-Disclaimer": "ILLUSTRATIVE DEMO DATA — NOT ACTUAL OIL OPERATIONAL DATA",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load sample data";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
