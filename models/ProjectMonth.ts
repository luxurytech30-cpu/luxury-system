import mongoose, { Schema, Types } from "mongoose";

export type ProjectMonthStatus = "paid" | "unpaid";

export type ProjectMonthDoc = {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  clientId: Types.ObjectId;
  year: number;
  month: number;
  amount: number;
  status: ProjectMonthStatus;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const ProjectMonthSchema = new Schema<ProjectMonthDoc>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["paid", "unpaid"], default: "unpaid", index: true },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "projectMonths" }
);

ProjectMonthSchema.index({ projectId: 1, year: 1, month: 1 }, { unique: true });

export const ProjectMonth =
  mongoose.models.ProjectMonth || mongoose.model<ProjectMonthDoc>("ProjectMonth", ProjectMonthSchema);

