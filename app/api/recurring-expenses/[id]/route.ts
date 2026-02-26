import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { withAdmin, ok, fail, parseJson, getParams } from "@/lib/http";
import { RecurringExpense } from "@/models/RecurringExpense";
import { toPlain } from "@/lib/serialize";

export const GET = withAdmin(async (_req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");
  const row = await RecurringExpense.findById(id).populate("projectId", "name").lean();
  if (!row) return fail("Recurring expense not found", 404);
  return ok(toPlain(row));
});

export const PUT = withAdmin(async (req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");
  const body = await parseJson(req);

  const row = await RecurringExpense.findByIdAndUpdate(
    id,
    {
      $set: {
        name: body.name,
        amount: body.amount !== undefined ? Number(body.amount) : undefined,
        category: body.category,
        vendor: body.vendor ?? "",
        note: body.note ?? "",
        projectId: body.projectId || null,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : undefined,
        dayOfMonth:
          body.dayOfMonth !== undefined ? Math.min(28, Math.max(1, Number(body.dayOfMonth || 1))) : undefined,
        active: body.active !== undefined ? Boolean(body.active) : undefined,
      },
    },
    { new: true, runValidators: true }
  )
    .populate("projectId", "name")
    .lean();

  if (!row) return fail("Recurring expense not found", 404);
  return ok(toPlain(row));
});

export const DELETE = withAdmin(async (_req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");
  const deleted = await RecurringExpense.findByIdAndDelete(id).lean();
  if (!deleted) return fail("Recurring expense not found", 404);
  return ok({ deleted: true });
});

