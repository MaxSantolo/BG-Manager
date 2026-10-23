import { NextRequest, NextResponse } from "next/server";
import { SURVEY_COOKIE, surveyTokenFor } from "@/lib/surveyAuth";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const surveyPassword = process.env.SURVEY_PASSWORD;

  if (!surveyPassword || password !== surveyPassword) {
    return NextResponse.json({ error: "Password errata" }, { status: 401 });
  }

  const token = await surveyTokenFor(surveyPassword);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SURVEY_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
