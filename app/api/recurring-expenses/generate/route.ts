import { dbConnect } from "@/lib/db";
import { withAdmin, ok } from "@/lib/http";
import { ensureRecurringExpensesUpToCurrent } from "@/lib/recurringExpenses";

export const POST = withAdmin(async () => {
  await dbConnect();
  const result = await ensureRecurringExpensesUpToCurrent();
  return ok({ generated: true, ...result });
});

