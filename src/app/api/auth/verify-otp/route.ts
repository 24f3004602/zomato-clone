import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/lib/auth";

const schema = z.object({ phone: z.string().regex(/^\+?[0-9 ()-]{7,20}$/), code: z.string().regex(/^\d{6}$/) });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const user = await verifyOtp(body.phone, body.code);
    return NextResponse.json({ data: user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to verify code" }, { status: 400 });
  }
}
