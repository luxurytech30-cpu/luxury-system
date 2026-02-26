import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { withAdmin, ok, fail, parseJson, getParams } from "@/lib/http";
import { Project } from "@/models/Project";
import { ProjectMonth } from "@/models/ProjectMonth";
import { Payment } from "@/models/Payment";
import { ensureProjectMonthsUpToCurrent, calcOneTimePaidAmount } from "@/lib/billing";
import { toPlain } from "@/lib/serialize";

export const GET = withAdmin(async (_req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");

  await ensureProjectMonthsUpToCurrent(id);

  const [project, months, payments, oneTimePaid] = await Promise.all([
    Project.findById(id).populate("clientId", "name phone email").lean(),
    ProjectMonth.find({ projectId: id }).sort({ year: 1, month: 1 }).lean(),
    Payment.find({ projectId: id }).sort({ date: -1, createdAt: -1 }).lean(),
    calcOneTimePaidAmount(id),
  ]);

  if (!project) return fail("Project not found", 404);

  return ok(
    toPlain({
      project,
      months,
      payments,
      oneTimePaid,
      oneTimeRemaining: Math.max(0, Number(project.oneTimeFee || 0) - oneTimePaid),
    })
  );
});

export const PUT = withAdmin(async (req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");
  const body = await parseJson(req);

  const projectDoc = await Project.findById(id);
  if (!projectDoc) return fail("Project not found", 404);

  if (body.name !== undefined) projectDoc.name = String(body.name);
  if (body.monthlyFee !== undefined) projectDoc.monthlyFee = Number(body.monthlyFee || 0);
  if (body.oneTimeFee !== undefined) projectDoc.oneTimeFee = Number(body.oneTimeFee || 0);
  if (body.billingStartDate) projectDoc.billingStartDate = new Date(body.billingStartDate);
  if (body.billingEndDate !== undefined) {
    projectDoc.billingEndDate = body.billingEndDate ? new Date(body.billingEndDate) : null;
  }
  if (body.clientId) projectDoc.clientId = body.clientId;
  if (body.notes !== undefined) projectDoc.notes = String(body.notes ?? "");

  if (Array.isArray(body.pausePeriods)) {
    projectDoc.pausePeriods = body.pausePeriods.map((p: { from: string; to?: string | null }) => ({
      from: new Date(p.from),
      to: p.to ? new Date(p.to) : null,
    })) as typeof projectDoc.pausePeriods;
  }

  if (body.status !== undefined) {
    const nextStatus = body.status as "active" | "paused" | "completed";
    const hasExplicitPausePeriods = Array.isArray(body.pausePeriods);

    if (!hasExplicitPausePeriods) {
      const lastPause = projectDoc.pausePeriods[projectDoc.pausePeriods.length - 1];

      if (nextStatus === "paused") {
        if (!lastPause || lastPause.to) {
          projectDoc.pausePeriods.push({ from: new Date(), to: null } as (typeof projectDoc.pausePeriods)[number]);
        }
      }

      if (nextStatus === "active") {
        if (lastPause && !lastPause.to) {
          lastPause.to = new Date();
        }
      }
    }

    projectDoc.status = nextStatus;
  }

  await projectDoc.save();

  const project = await Project.findById(id).populate("clientId", "name").lean();
  if (!project) return fail("Project not found", 404);

  await ensureProjectMonthsUpToCurrent(id);
  return ok(toPlain(project));
});

export const DELETE = withAdmin(async (_req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");

  await Promise.all([
    ProjectMonth.deleteMany({ projectId: id }),
    Payment.deleteMany({ projectId: id }),
  ]);
  const deleted = await Project.findByIdAndDelete(id).lean();
  if (!deleted) return fail("Project not found", 404);
  return ok({ deleted: true });
});
