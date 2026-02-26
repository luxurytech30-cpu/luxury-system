import mongoose, { Schema, Types } from "mongoose";

type MonthlyAllocation = {
  projectMonthId: Types.ObjectId;
  year: number;
  month: number;
  amount: number;
};

export type PaymentDoc = {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  clientId: Types.ObjectId;
  amount: number;
  date: Date;
  note?: string;
  oneTimeAmount: number;
  monthlyAllocations: MonthlyAllocation[];
  createdAt: Date;
  updatedAt: Date;
};

const MonthlyAllocationSchema = new Schema<MonthlyAllocation>(
  {
    projectMonthId: { type: Schema.Types.ObjectId, ref: "ProjectMonth", required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PaymentSchema = new Schema<PaymentDoc>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, index: true, default: () => new Date() },
    note: { type: String, default: "" },
    oneTimeAmount: { type: Number, default: 0, min: 0 },
    monthlyAllocations: { type: [MonthlyAllocationSchema], default: [] },
  },
  { timestamps: true }
);

export const Payment = mongoose.models.Payment || mongoose.model<PaymentDoc>("Payment", PaymentSchema);
