import dictionary from "@/app/data/dictionary.json";

export async function GET() {
  return new Response(JSON.stringify(dictionary), {
    headers: { "Content-Type": "application/json" },
  });
}

