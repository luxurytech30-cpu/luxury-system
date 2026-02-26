import mongoose, { Schema, Types } from "mongoose";

type PausePeriod = {
  from: Date;
  to: Date | null;
};

export type ProjectStatus = "active" | "paused" | "completed";

export type ProjectDoc = {
  _id: Types.ObjectId;
  clientId: Types.ObjectId;
  name: string;
  monthlyFee: number;
  oneTimeFee: number;
  billingStartDate: Date;
  billingEndDate: Date | null;
  status: ProjectStatus;
  pausePeriods: PausePeriod[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

const PausePeriodSchema = new Schema<PausePeriod>(
  {
    from: { type: Date, required: true },
    to: { type: Date, default: null },
  },
  { _id: false }
);

const ProjectSchema = new Schema<ProjectDoc>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    name: { type: String, required: true, trim: true },
    monthlyFee: { type: Number, required: true, min: 0 },
    oneTimeFee: { type: Number, default: 0, min: 0 },
    billingStartDate: { type: Date, required: true },
    billingEndDate: { type: Date, default: null },
    status: { type: String, enum: ["active", "paused", "completed"], default: "active", index: true },
    pausePeriods: { type: [PausePeriodSchema], default: [] },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Project = mongoose.models.Project || mongoose.model<ProjectDoc>("Project", ProjectSchema);
