import mongoose from "mongoose";
import { Project } from "@/models/Project";
import { ProjectMonth } from "@/models/ProjectMonth";
import { Payment } from "@/models/Payment";
import { compareYm, currentYm, monthOverlapsRange, nextYm, ymFromDate, ymToDate } from "@/lib/date";

type PausePeriodLike = { from: Date | string; to?: Date | string | null };
type ProjectLike = {
  pausePeriods?: PausePeriodLike[];
  status?: string;
  billingStartDate: Date | string;
  billingEndDate?: Date | string | null;
};

function asObjectId(id: string | mongoose.Types.ObjectId) {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

function shouldSkipMonthForPause(project: ProjectLike, year: number, month: number) {
  return (project.pausePeriods || []).some((p) =>
    monthOverlapsRange(year, month, new Date(p.from), p.to ? new Date(p.to) : null)
  );
}

export async function ensureProjectMonthsUpToCurrent(projectId: string | mongoose.Types.ObjectId) {
  const _id = asObjectId(projectId);
  const project = await Project.findById(_id).lean();
  if (!project) throw new Error("Project not found");
  const monthlyFee = Number(project.monthlyFee || 0);

  // Support projects with no recurring charge: do not generate monthly bills.
  if (!(monthlyFee > 0)) {
    return [];
  }

  const start = ymFromDate(new Date(project.billingStartDate));
  const capByCurrent = currentYm();
  const cap = project.billingEndDate
    ? compareYm(ymFromDate(new Date(project.billingEndDate)), capByCurrent) < 0
      ? ymFromDate(new Date(project.billingEndDate))
      : capByCurrent
    : capByCurrent;

  if (compareYm(start, cap) > 0) return [];

  const createdKeys: string[] = [];
  let cursor = start;
  const ops = [];
  while (compareYm(cursor, cap) <= 0) {
    if (!shouldSkipMonthForPause(project, cursor.year, cursor.month)) {
      ops.push({
        updateOne: {
          filter: { projectId: _id, year: cursor.year, month: cursor.month },
          update: {
            $setOnInsert: {
              projectId: _id,
              clientId: project.clientId,
              year: cursor.year,
              month: cursor.month,
              amount: monthlyFee,
              status: "unpaid",
              paidAt: null,
            },
          },
          upsert: true,
        },
      });
      createdKeys.push(`${cursor.year}-${cursor.month}`);
    }
    cursor = nextYm(cursor);
  }

  if (ops.length) {
    await ProjectMonth.bulkWrite(ops, { ordered: false });
  }

  return createdKeys;
}

export async function calcOneTimePaidAmount(projectId: string | mongoose.Types.ObjectId) {
  const _id = asObjectId(projectId);
  const [row] = await Payment.aggregate<{ total: number }>([
    { $match: { projectId: _id } },
    { $group: { _id: null, total: { $sum: "$oneTimeAmount" } } },
  ]);
  return row?.total || 0;
}

export async function recordProjectPayment(params: {
  projectId: string;
  amount: number;
  oneTimeAmount?: number;
  note?: string;
  date?: string | Date;
}) {
  const session = await mongoose.startSession();
  let paymentDoc: unknown = null;

  await session.withTransaction(async () => {
    const project = await Project.findById(params.projectId).session(session);
    if (!project) throw new Error("Project not found");

    await ensureProjectMonthsUpToCurrent(project._id);

    const amount = Number(params.amount || 0);
    if (!(amount > 0)) throw new Error("Payment amount must be > 0");

    const oneTimePaidAlready = await calcOneTimePaidAmount(project._id);
    const oneTimeRemaining = Math.max(0, Number(project.oneTimeFee || 0) - oneTimePaidAlready);
    const autoOneTime = params.oneTimeAmount === undefined || params.oneTimeAmount === null;
    const requestedOneTime = autoOneTime ? amount : Math.max(0, Number(params.oneTimeAmount || 0));
    const oneTimeAmount = Math.min(requestedOneTime, oneTimeRemaining, amount);

    let available = amount - oneTimeAmount;
    const monthlyAllocations: Array<{ projectMonthId: unknown; year: number; month: number; amount: number }> = [];

    const unpaidMonths = await ProjectMonth.find({
      projectId: project._id,
      status: "unpaid",
    })
      .sort({ year: 1, month: 1 })
      .session(session);

    for (const monthDoc of unpaidMonths) {
      if (available + 1e-9 < Number(monthDoc.amount)) break;
      available -= Number(monthDoc.amount);
      monthDoc.status = "paid";
      monthDoc.paidAt = new Date();
      await monthDoc.save({ session });
      monthlyAllocations.push({
        projectMonthId: monthDoc._id,
        year: monthDoc.year,
        month: monthDoc.month,
        amount: monthDoc.amount,
      });
    }
    available = Number(available.toFixed(2));
    if (available > 0) {
      throw new Error(
        autoOneTime
          ? "No credit support: remaining amount cannot be stored. Use an amount that matches the unpaid monthly bills after one-time is auto-applied."
          : "No credit support: payment must exactly cover full months and/or one-time allocation. Adjust the amount or one-time allocation."
      );
    }

    const paymentDate = params.date ? new Date(params.date) : new Date();
    paymentDoc = await Payment.create(
      [
        {
          projectId: project._id,
          clientId: project.clientId,
          amount,
          date: paymentDate,
          note: params.note || "",
          oneTimeAmount,
          monthlyAllocations,
        },
      ],
      { session }
    );
  });

  session.endSession();
  return Array.isArray(paymentDoc) ? paymentDoc[0] : paymentDoc;
}

export function shouldBillProjectThisMonth(project: ProjectLike & { monthlyFee?: number }, now = new Date()) {
  if (!(Number(project.monthlyFee || 0) > 0)) return false;
  if (project.status !== "active") return false;
  const monthDate = ymToDate({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const startMonth = ymToDate(ymFromDate(new Date(project.billingStartDate)));
  if (monthDate < startMonth) return false;
  if (project.billingEndDate) {
    const endMonth = ymToDate(ymFromDate(new Date(project.billingEndDate)));
    if (monthDate > endMonth) return false;
  }
  if (
    (project.pausePeriods || []).some((p) =>
      monthOverlapsRange(now.getFullYear(), now.getMonth() + 1, new Date(p.from), p.to ? new Date(p.to) : null)
    )
  ) {
    return false;
  }
  return true;
}
