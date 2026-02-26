import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { withAdmin, ok, fail, getParams } from "@/lib/http";
import { ensureProjectMonthsUpToCurrent } from "@/lib/billing";

export const POST = withAdmin(async (_req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");
  const created = await ensureProjectMonthsUpToCurrent(id);
  return ok({ ensured: true, createdCount: created.length });
});

