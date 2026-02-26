import { dbConnect } from "@/lib/db";
import { withAdmin, ok } from "@/lib/http";
import { Project } from "@/models/Project";
import { Payment } from "@/models/Payment";
import { Expense } from "@/models/Expense";
import { ProjectMonth } from "@/models/ProjectMonth";
import { Client } from "@/models/Client";
import { shouldBillProjectThisMonth } from "@/lib/billing";
import { isMonthOverdue, monthLabel } from "@/lib/date";
import { ensureRecurringExpensesUpToCurrent } from "@/lib/recurringExpenses";
import { toPlain } from "@/lib/serialize";

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function parseYearMonthInput(value: string | null) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1);
}

export const GET = withAdmin(async (req) => {
  await dbConnect();
  await ensureRecurringExpensesUpToCurrent();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const defaultSelectedMonthStart = addMonths(monthStart, -1);
  const searchParams = new URL(req.url).searchParams;
  const selectedMonthStart = parseYearMonthInput(searchParams.get("viewMonth")) ?? defaultSelectedMonthStart;
  const selectedNextMonthStart = addMonths(selectedMonthStart, 1);
  const trendMonthsCount = 12;
  const trendStart = addMonths(monthStart, -(trendMonthsCount - 1));

  const [
    projects,
    monthlyRows,
    paidMonthRows,
    oneTimeCollectedRows,
    expenseRows,
    selectedPaidMonthRows,
    selectedOneTimeCollectedRows,
    selectedExpenseRows,
    paidTrendRows,
    oneTimeTrendRows,
    expenseTrendRows,
    paidAllTimeRows,
    oneTimeAllTimeRows,
    expenseAllTimeRows,
  ] =
    await Promise.all([
    Project.find({}).lean(),
    ProjectMonth.find({ status: "unpaid" }).lean(),
    ProjectMonth.aggregate<{ total: number }>([
      { $match: { status: "paid", paidAt: { $gte: monthStart, $lt: nextMonthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate<{ total: number }>([
      { $match: { date: { $gte: monthStart, $lt: nextMonthStart } } },
      { $group: { _id: null, total: { $sum: "$oneTimeAmount" } } },
    ]),
    Expense.aggregate<{ total: number }>([
      { $match: { date: { $gte: monthStart, $lt: nextMonthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    ProjectMonth.aggregate<{ total: number }>([
      { $match: { status: "paid", paidAt: { $gte: selectedMonthStart, $lt: selectedNextMonthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate<{ total: number }>([
      { $match: { date: { $gte: selectedMonthStart, $lt: selectedNextMonthStart } } },
      { $group: { _id: null, total: { $sum: "$oneTimeAmount" } } },
    ]),
    Expense.aggregate<{ total: number }>([
      { $match: { date: { $gte: selectedMonthStart, $lt: selectedNextMonthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    ProjectMonth.aggregate<{ _id: { year: number; month: number }; total: number }>([
      { $match: { status: "paid", paidAt: { $gte: trendStart, $lt: nextMonthStart } } },
      {
        $group: {
          _id: {
            year: { $year: "$paidAt" },
            month: { $month: "$paidAt" },
          },
          total: { $sum: "$amount" },
        },
      },
    ]),
    Payment.aggregate<{ _id: { year: number; month: number }; total: number }>([
      { $match: { date: { $gte: trendStart, $lt: nextMonthStart }, oneTimeAmount: { $gt: 0 } } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          total: { $sum: "$oneTimeAmount" },
        },
      },
    ]),
    Expense.aggregate<{ _id: { year: number; month: number }; total: number }>([
      { $match: { date: { $gte: trendStart, $lt: nextMonthStart } } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          total: { $sum: "$amount" },
        },
      },
    ]),
    ProjectMonth.aggregate<{ total: number }>([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate<{ total: number }>([
      { $group: { _id: null, total: { $sum: "$oneTimeAmount" } } },
    ]),
    Expense.aggregate<{ total: number }>([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const expectedThisMonth = projects
    .filter((p) => shouldBillProjectThisMonth(p, now))
    .reduce((sum, p) => sum + Number(p.monthlyFee || 0), 0);
  const expectedSelectedMonth = projects
    .filter((p) => shouldBillProjectThisMonth(p, selectedMonthStart))
    .reduce((sum, p) => sum + Number(p.monthlyFee || 0), 0);

  const oneTimeRows = await Payment.aggregate<{ _id: unknown; total: number }>([
    { $group: { _id: "$projectId", total: { $sum: "$oneTimeAmount" } } },
  ]);
  const oneTimePaidByProject = new Map(oneTimeRows.map((r) => [String(r._id), r.total || 0]));

  const remainingOneTime = projects.reduce((sum, p) => {
    const paid = oneTimePaidByProject.get(String(p._id)) || 0;
    return sum + Math.max(0, Number(p.oneTimeFee || 0) - paid);
  }, 0);

  const outstandingMonthly = monthlyRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const overdueMonthRows = monthlyRows
    .filter((r) => isMonthOverdue(r.year, r.month, now))
    .sort((a, b) => (a.year - b.year) || (a.month - b.month));

  const projectIds = [...new Set(overdueMonthRows.map((m) => String(m.projectId)))];
  const clientIds = [...new Set(overdueMonthRows.map((m) => String(m.clientId)))];
  const [projectMapRows, clientMapRows] = await Promise.all([
    Project.find({ _id: { $in: projectIds } }).select("_id name clientId").lean(),
    Client.find({ _id: { $in: clientIds } }).select("_id name").lean(),
  ]);
  const projectMap = new Map(projectMapRows.map((p) => [String(p._id), p]));
  const clientMap = new Map(clientMapRows.map((c) => [String(c._id), c]));

  const overdue = overdueMonthRows.map((m) => {
    const project = projectMap.get(String(m.projectId));
    const client = clientMap.get(String(m.clientId));
    return {
      id: String(m._id),
      projectId: String(m.projectId),
      clientId: String(m.clientId),
      projectName: project?.name || "Unknown project",
      clientName: client?.name || "Unknown client",
      year: m.year,
      month: m.month,
      monthLabel: monthLabel(m.year, m.month),
      amount: m.amount,
    };
  });

  const collectedThisMonth = (paidMonthRows[0]?.total || 0) + (oneTimeCollectedRows[0]?.total || 0);
  const expensesThisMonth = expenseRows[0]?.total || 0;
  const collectedSelectedMonth = (selectedPaidMonthRows[0]?.total || 0) + (selectedOneTimeCollectedRows[0]?.total || 0);
  const expensesSelectedMonth = selectedExpenseRows[0]?.total || 0;
  const collectedAllTime = (paidAllTimeRows[0]?.total || 0) + (oneTimeAllTimeRows[0]?.total || 0);
  const expensesAllTime = expenseAllTimeRows[0]?.total || 0;
  const profitAllTime = collectedAllTime - expensesAllTime;
  const overdueAmount = overdue.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const paidTrendMap = new Map(paidTrendRows.map((r) => [monthKey(r._id.year, r._id.month), r.total || 0]));
  const oneTimeTrendMap = new Map(oneTimeTrendRows.map((r) => [monthKey(r._id.year, r._id.month), r.total || 0]));
  const expenseTrendMap = new Map(expenseTrendRows.map((r) => [monthKey(r._id.year, r._id.month), r.total || 0]));

  const trend = Array.from({ length: trendMonthsCount }, (_, i) => {
    const d = addMonths(trendStart, i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = monthKey(year, month);
    const monthlyCollected = paidTrendMap.get(key) || 0;
    const oneTimeCollected = oneTimeTrendMap.get(key) || 0;
    const collected = monthlyCollected + oneTimeCollected;
    const expenses = expenseTrendMap.get(key) || 0;
    const profit = collected - expenses;
    return {
      year,
      month,
      monthLabel: monthLabel(year, month),
      monthlyCollected,
      oneTimeCollected,
      collected,
      expenses,
      profit,
    };
  });

  return ok(
    toPlain({
      summary: {
        expectedThisMonth,
        collectedThisMonth,
        outstandingUnpaid: outstandingMonthly + remainingOneTime,
        expensesThisMonth,
        profitThisMonth: collectedThisMonth - expensesThisMonth,
        profitAllTime,
        overdueAmount,
        selectedMonth: {
          key: `${selectedMonthStart.getFullYear()}-${String(selectedMonthStart.getMonth() + 1).padStart(2, "0")}`,
          label: monthLabel(selectedMonthStart.getFullYear(), selectedMonthStart.getMonth() + 1),
          expected: expectedSelectedMonth,
          collected: collectedSelectedMonth,
          expenses: expensesSelectedMonth,
          profit: collectedSelectedMonth - expensesSelectedMonth,
        },
      },
      overdue,
      trend,
    })
  );
});
