import { NextRequest, NextResponse } from "next/server";

import { POST as LoginPOST } from "../login";
import { POST as LogoutPOST } from "../logout";
import { POST as RegisterPOST } from "../register";
import { GET as MeGET } from "../me";

// Combined dynamic route for auth actions to save Vercel Serverless Function limits
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;
  if (action === "me") return MeGET(req);
  
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;
  if (action === "login") return LoginPOST(req);
  if (action === "logout") return LogoutPOST(req);
  if (action === "register") return RegisterPOST(req);
  
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
