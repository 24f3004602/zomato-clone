import { NextResponse } from "next/server";
import { z } from "zod";
import { requestOtp } from "@/lib/auth";

const schema = z.object({ phone: z.string().regex(/^\+?[0-9 ()-]{7,20}$/) });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const result = await requestOtp(body.phone);
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send verification code" }, { status: 400 });
  }
}
