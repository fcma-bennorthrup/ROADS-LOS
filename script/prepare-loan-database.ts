import pg from "pg";

// Add only the table required by the pulled application API. Never use a
// blanket schema push here: existing tables and saved documents must survive.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to prepare loan storage.");
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.prototype_loan_applications (
      loan_id text PRIMARY KEY,
      document jsonb NOT NULL
    )
  `);
  console.log("Loan application storage is ready.");
} catch (error) {
  // Do not log database messages or connection details.
  const code = (error as { code?: string }).code;
  console.error(`Loan storage setup failed (${code ?? "unknown"}). Check database access and schema.`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
