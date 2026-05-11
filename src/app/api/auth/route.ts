import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  issueSession,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    password?: string;
    action?: "login" | "logout";
  };

  if (body.action === "logout") {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  }

  if (!body.password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const ok = await verifyPassword(body.password);
  if (!ok) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await issueSession();
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
