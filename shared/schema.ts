import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const loans = pgTable("loans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loanNumber: text("loan_number").notNull(),
  cifNumber: text("cif_number").notNull(),
  loanType: text("loan_type").notNull(),
  stage: text("stage").notNull(),
  primaryBorrowerName: text("primary_borrower_name").notNull(),
  displayAmount: numeric("display_amount").notNull(),
  amountRequested: numeric("amount_requested").notNull(),
  financedFees: numeric("financed_fees").notNull(),
  taxesInsurance: numeric("taxes_insurance").notNull(),
  product: text("product").notNull(),
  finalRate: numeric("final_rate").notNull(),
  principalInterest: numeric("principal_interest").notNull(),
  totalMonthlyPayment: numeric("total_monthly_payment").notNull(),
  applicationType: text("application_type").notNull(),
  ecoaDaysRemaining: integer("ecoa_days_remaining").notNull(),
  tridDaysRemaining: integer("trid_days_remaining").notNull(),
  piti: numeric("piti").notNull(),
  dti: numeric("dti").notNull(),
  lcv: numeric("lcv").notNull(),
  pweCbScore: integer("pwe_cb_score").notNull(),
  ruleOfXx: text("rule_of_xx"),
  totalCv: numeric("total_cv").notNull(),
  cashReserves: numeric("cash_reserves").notNull(),
  totalLoanAmount: numeric("total_loan_amount").notNull(),
});

export const insertLoanSchema = createInsertSchema(loans).omit({ id: true });
export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type Loan = typeof loans.$inferSelect;

export const borrowers = pgTable("borrowers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loanId: varchar("loan_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
});

export const insertBorrowerSchema = createInsertSchema(borrowers).omit({ id: true });
export type InsertBorrower = z.infer<typeof insertBorrowerSchema>;
export type Borrower = typeof borrowers.$inferSelect;
