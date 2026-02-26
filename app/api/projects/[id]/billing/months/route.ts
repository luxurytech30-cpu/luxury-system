import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { withAdmin, ok, fail, getParams } from "@/lib/http";
import { ensureProjectMonthsUpToCurrent } from "@/lib/billing";
import { ProjectMonth } from "@/models/ProjectMonth";
import { toPlain } from "@/lib/serialize";

export const GET = withAdmin(async (_req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");
  await ensureProjectMonthsUpToCurrent(id);
  const months = await ProjectMonth.find({ projectId: id }).sort({ year: 1, month: 1 }).lean();
  return ok(toPlain(months));
});

