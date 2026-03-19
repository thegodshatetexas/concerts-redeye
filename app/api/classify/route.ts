import { NextRequest, NextResponse } from "next/server";
import { saveDecision } from "@/lib/decisions";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { uid, decision } = body as {
    uid: string;
    decision: "concert" | "not_concert";
  };

  if (!uid || !["concert", "not_concert"].includes(decision)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  saveDecision(uid, decision);
  return NextResponse.json({ ok: true }, { status: 200 });
}
