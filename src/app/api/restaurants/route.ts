import { NextResponse } from "next/server";
import { searchRestaurants } from "@/lib/domain";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const cuisine = url.searchParams.get("cuisine") ?? undefined;
  const vegetarian = url.searchParams.get("vegetarian") === "true";
  const open = url.searchParams.get("open") === "true";
  return NextResponse.json({ data: searchRestaurants(query, { cuisine, vegetarian, open }) });
}
