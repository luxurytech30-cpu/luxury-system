import mongoose, { Schema, Types } from "mongoose";

export type ClientDoc = {
  _id: Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

const ClientSchema = new Schema<ClientDoc>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Client = mongoose.models.Client || mongoose.model<ClientDoc>("Client", ClientSchema);

