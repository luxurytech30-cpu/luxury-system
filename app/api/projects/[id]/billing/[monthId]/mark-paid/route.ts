import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { withAdmin, ok, fail, getParams } from "@/lib/http";
import { ProjectMonth } from "@/models/ProjectMonth";
import { toPlain } from "@/lib/serialize";

export const POST = withAdmin(async (_req, context) => {
  await dbConnect();
  const { id, monthId } = await getParams(context);
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(monthId)) return fail("Invalid id");

  const monthDoc = await ProjectMonth.findOneAndUpdate(
    { _id: monthId, projectId: id },
    { $set: { status: "paid", paidAt: new Date() } },
    { new: true }
  ).lean();
  if (!monthDoc) return fail("Month bill not found", 404);
  return ok(toPlain(monthDoc));
});

