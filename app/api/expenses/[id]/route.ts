import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { withAdmin, ok, fail, parseJson, getParams } from "@/lib/http";
import { Expense } from "@/models/Expense";
import { toPlain } from "@/lib/serialize";

export const GET = withAdmin(async (_req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");
  const expense = await Expense.findById(id).populate("projectId", "name").lean();
  if (!expense) return fail("Expense not found", 404);
  return ok(toPlain(expense));
});

export const PUT = withAdmin(async (req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");
  const body = await parseJson(req);

  const expense = await Expense.findByIdAndUpdate(
    id,
    {
      $set: {
        date: body.date ? new Date(body.date) : undefined,
        amount: body.amount !== undefined ? Number(body.amount) : undefined,
        category: body.category,
        vendor: body.vendor ?? "",
        note: body.note ?? "",
        projectId: body.projectId || null,
      },
    },
    { new: true, runValidators: true }
  )
    .populate("projectId", "name")
    .lean();
  if (!expense) return fail("Expense not found", 404);
  return ok(toPlain(expense));
});

export const DELETE = withAdmin(async (_req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");
  const deleted = await Expense.findByIdAndDelete(id).lean();
  if (!deleted) return fail("Expense not found", 404);
  return ok({ deleted: true });
});

