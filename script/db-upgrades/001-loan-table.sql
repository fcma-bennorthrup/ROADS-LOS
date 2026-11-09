-- Immutable after sharing. This creates only the active prototype table.
CREATE TABLE IF NOT EXISTS public.prototype_loan_applications (
  loan_id text PRIMARY KEY,
  document jsonb NOT NULL
);
