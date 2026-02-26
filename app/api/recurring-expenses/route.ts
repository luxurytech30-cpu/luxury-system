import { dbConnect } from "@/lib/db";
import { withAdmin, ok, fail, parseJson } from "@/lib/http";
import { RecurringExpense } from "@/models/RecurringExpense";
import { toPlain } from "@/lib/serialize";

export const GET = withAdmin(async () => {
  await dbConnect();
  const rows = await RecurringExpense.find({}).sort({ createdAt: -1 }).populate("projectId", "name").lean();
  return ok(toPlain(rows));
});

export const POST = withAdmin(async (req) => {
  await dbConnect();
  const body = await parseJson(req);
  if (!body.name || !body.amount || !body.category || !body.startDate) return fail("Missing required fields");

  const row = await RecurringExpense.create({
    name: String(body.name).trim(),
    amount: Number(body.amount),
    category: String(body.category).trim(),
    vendor: String(body.vendor || ""),
    note: String(body.note || ""),
    projectId: body.projectId || null,
    startDate: new Date(body.startDate),
    endDate: body.endDate ? new Date(body.endDate) : null,
    dayOfMonth: Math.min(28, Math.max(1, Number(body.dayOfMonth || 1))),
    active: body.active !== false,
  });
  const populated = await RecurringExpense.findById(row._id).populate("projectId", "name").lean();
  return ok(toPlain(populated), 201);
});

