import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { withAdmin, ok, fail, getParams } from "@/lib/http";
import { Project } from "@/models/Project";
import { toPlain } from "@/lib/serialize";

export const POST = withAdmin(async (_req, context) => {
  await dbConnect();
  const { id } = await getParams(context);
  if (!mongoose.isValidObjectId(id)) return fail("Invalid id");

  const project = await Project.findById(id);
  if (!project) return fail("Project not found", 404);

  const last = project.pausePeriods[project.pausePeriods.length - 1];
  if (!last || last.to) {
    project.pausePeriods.push({ from: new Date(), to: null });
  }
  project.status = "paused";
  await project.save();

  return ok(toPlain(project));
});
