import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { withAdmin, ok, fail, parseJson, getParams } from "@/lib/http";
import { Payment } from "@/models/Payment";
import { Project } from "@/models/Project";
import { recordProjectPayment, calcOneTimePaidAmount, ensureProjectMonthsUpToCurrent } from "@/lib/billing";
import { ProjectMonth } from "@/models/ProjectMonth";
import { toPlain } from "@/lib/serialize";

export const GET = withAdmin(async (_req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");

  await ensureProjectMonthsUpToCurrent(id);
  const [payments, project, oneTimePaid, unpaidMonths] = await Promise.all([
    Payment.find({ projectId: id }).sort({ date: -1, createdAt: -1 }).lean(),
    Project.findById(id).lean(),
    calcOneTimePaidAmount(id),
    ProjectMonth.find({ projectId: id, status: "unpaid" }).sort({ year: 1, month: 1 }).lean(),
  ]);
  if (!project) return fail("Project not found", 404);

  return ok(
    toPlain({
      payments,
      oneTimePaid,
      oneTimeRemaining: Math.max(0, Number(project.oneTimeFee || 0) - oneTimePaid),
      unpaidMonths,
    })
  );
});

export const POST = withAdmin(async (req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");

  const body = await parseJson(req);
  const hasOneTimeAmount = Object.prototype.hasOwnProperty.call(body, "oneTimeAmount");
  const payment = await recordProjectPayment({
    projectId: id,
    amount: Number(body.amount || 0),
    oneTimeAmount: hasOneTimeAmount ? Number(body.oneTimeAmount || 0) : undefined,
    note: body.note ? String(body.note) : "",
    date: body.date || undefined,
  });

  return ok(toPlain(payment), 201);
});
