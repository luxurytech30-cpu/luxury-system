import { dbConnect } from "@/lib/db";
import { withAdmin, ok, fail, parseJson } from "@/lib/http";
import { Project, type ProjectStatus } from "@/models/Project";
import { Client } from "@/models/Client";
import { ensureProjectMonthsUpToCurrent } from "@/lib/billing";
import { toPlain } from "@/lib/serialize";

export const GET = withAdmin(async (req) => {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const isProjectStatus = (value: string): value is ProjectStatus =>
    value === "active" || value === "paused" || value === "completed";

  const filter: { status?: ProjectStatus } = {};
  if (status && isProjectStatus(status)) filter.status = status;

  const projects = await Project.find(filter)
    .sort({ createdAt: -1 })
    .populate("clientId", "name phone email")
    .lean();
  return ok(toPlain(projects));
});

export const POST = withAdmin(async (req) => {
  await dbConnect();
  const body = await parseJson(req);
  if (!body.clientId || !body.name || !body.billingStartDate) return fail("Missing required fields");

  const clientExists = await Client.exists({ _id: body.clientId });
  if (!clientExists) return fail("Client not found", 404);

  const project = await Project.create({
    clientId: body.clientId,
    name: String(body.name).trim(),
    monthlyFee: Number(body.monthlyFee || 0),
    oneTimeFee: Number(body.oneTimeFee || 0),
    billingStartDate: new Date(body.billingStartDate),
    billingEndDate: body.billingEndDate ? new Date(body.billingEndDate) : null,
    status: body.status || "active",
    notes: String(body.notes || ""),
    pausePeriods: Array.isArray(body.pausePeriods)
      ? body.pausePeriods.map((p: { from: string; to?: string | null }) => ({
          from: new Date(p.from),
          to: p.to ? new Date(p.to) : null,
        }))
      : [],
  });

  await ensureProjectMonthsUpToCurrent(project._id);

  const populated = await Project.findById(project._id).populate("clientId", "name").lean();
  return ok(toPlain(populated), 201);
});
