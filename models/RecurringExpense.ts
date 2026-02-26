import mongoose, { Schema, Types } from "mongoose";

export type RecurringExpenseDoc = {
  _id: Types.ObjectId;
  name: string;
  amount: number;
  category: string;
  vendor?: string;
  note?: string;
  projectId: Types.ObjectId | null;
  startDate: Date;
  endDate: Date | null;
  dayOfMonth: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const RecurringExpenseSchema = new Schema<RecurringExpenseDoc>(
  {
    name: { type: String, required: true, trim: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true, index: true },
    vendor: { type: String, default: "" },
    note: { type: String, default: "" },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, default: null },
    dayOfMonth: { type: Number, default: 1, min: 1, max: 28 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const RecurringExpense =
  mongoose.models.RecurringExpense ||
  mongoose.model<RecurringExpenseDoc>("RecurringExpense", RecurringExpenseSchema);

