import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { withAdmin, ok, fail, parseJson, getParams } from "@/lib/http";
import { Client } from "@/models/Client";
import { Project } from "@/models/Project";
import { toPlain } from "@/lib/serialize";

export const GET = withAdmin(async (_req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");

  const [client, projects] = await Promise.all([
    Client.findById(id).lean(),
    Project.find({ clientId: id }).sort({ createdAt: -1 }).lean(),
  ]);
  if (!client) return fail("Client not found", 404);

  return ok(toPlain({ client, projects }));
});

export const PUT = withAdmin(async (req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");
  const body = await parseJson(req);

  const client = await Client.findByIdAndUpdate(
    id,
    {
      $set: {
        name: String(body.name || "").trim(),
        phone: String(body.phone || ""),
        email: String(body.email || ""),
        notes: String(body.notes || ""),
      },
    },
    { new: true, runValidators: true }
  ).lean();

  if (!client) return fail("Client not found", 404);
  return ok(toPlain(client));
});

export const DELETE = withAdmin(async (_req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");

  const projectsCount = await Project.countDocuments({ clientId: id });
  if (projectsCount > 0) return fail("Cannot delete client with projects", 400);

  const deleted = await Client.findByIdAndDelete(id).lean();
  if (!deleted) return fail("Client not found", 404);
  return ok({ deleted: true });
});

