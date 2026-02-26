import { dbConnect } from "@/lib/db";
import { withAdmin, ok, fail, parseJson } from "@/lib/http";
import { Client } from "@/models/Client";
import { toPlain } from "@/lib/serialize";

export const GET = withAdmin(async () => {
  await dbConnect();
  const clients = await Client.find({}).sort({ createdAt: -1 }).lean();
  return ok(toPlain(clients));
});

export const POST = withAdmin(async (req) => {
  await dbConnect();
  const body = await parseJson(req);
  if (!body.name) return fail("Name is required");

  const client = await Client.create({
    name: String(body.name).trim(),
    phone: String(body.phone || ""),
    email: String(body.email || ""),
    notes: String(body.notes || ""),
  });

  return ok(toPlain(client), 201);
});

