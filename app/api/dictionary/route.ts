import { NextResponse } from "next/server";
import dictionary from "@/app/data/dictionary.json";

export async function GET() {
  return NextResponse.json(dictionary);
}
