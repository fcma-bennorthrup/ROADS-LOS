import { YesNoQuestion, DisabledCheckbox, MoneyDisplayField } from "./QuestionnaireDisplays";

const DECLARATION_QUESTIONS: { question: string; testId: string; selected: "yes" | "no" }[] = [
  { question: "Will you occupy the property as your primary residence?", testId: "occupy-primary", selected: "yes" },
  { question: "Have you had ownership interest in another property in the last three years?", testId: "ownership-interest", selected: "no" },
  { question: "Do you have family relationship or business affiliation with the seller of the property?", testId: "seller-affiliation", selected: "no" },
  { question: "Are you borrowing any money for this real estate transaction or obtaining any money from another party, such as the seller or realtor, that you have not disclosed on this loan application?", testId: "borrowing-undisclosed", selected: "no" },
  { question: "Have you or will you be applying for a mortgage loan on another property (not the property securing this loan) on or before closing this transaction that is not disclosed on this loan application?", testId: "other-mortgage", selected: "no" },
  { question: "Have you or will you be applying for any new credit on or before closing this loan that is not disclosed on this application?", testId: "new-credit", selected: "no" },
  { question: "Are you a co-signer or guarantor on any debt or loan that is not disclosed on this application?", testId: "co-signer", selected: "no" },
  { question: "Are there any outstanding judgments against you?", testId: "judgments", selected: "no" },
  { question: "Are you currently delinquent or in default on a Federal debt?", testId: "federal-debt", selected: "no" },
  { question: "Are you a party to a lawsuit in which you potentially have any personal financial liability?", testId: "lawsuit", selected: "no" },
  { question: "Have you conveyed title to any property in lieu of foreclosure in the past 7 years?", testId: "conveyed-title", selected: "no" },
  { question: "Within the past 7 years have you completed a pre-foreclosure sale or short sale, whereby the property was sold to a third party and the Lender agreed to accept less than the outstanding mortgage balance due?", testId: "short-sale", selected: "no" },
  { question: "Have you had property foreclose upon in the last 7 years?", testId: "foreclosed", selected: "no" },
  { question: "Have you declared bankruptcy within the past 7 years?", testId: "bankruptcy", selected: "no" },
];

export function DeclarationsSection() {
  const yn = (q: typeof DECLARATION_QUESTIONS[number], idx: number) => (
    <YesNoQuestion
      key={q.testId}
      question={q.question}
      groupName={`decl-${idx}`}
      selected={q.selected}
      testId={q.testId}
    />
  );

  const moneyField = (
    <MoneyDisplayField
      key="amount-of-money"
      label="If yes, what is the amount of this money?"
      value="0.00"
      testId="amount-of-money"
    />
  );

  const bankruptcyTypes = (
    <div
      key="bankruptcy-types"
      className="flex flex-col"
      style={{
        gap: "var(--roads-spacing-component-l)",
        padding: "var(--roads-spacing-component-s) var(--roads-spacing-component-l)",
      }}
      data-testid="question-bankruptcy-types"
    >
      <span className="label-strong" style={{ color: "var(--roads-text-primary)" }}>
        If yes, identify the type(s) of bankruptcy:
      </span>
      <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
        <DisabledCheckbox label="Chapter 7" checked={false} testId="chapter-7" />
        <DisabledCheckbox label="Chapter 11" checked={false} testId="chapter-11" />
        <DisabledCheckbox label="Chapter 12" checked={false} testId="chapter-12" />
        <DisabledCheckbox label="Chapter 13" checked={false} testId="chapter-13" />
      </div>
    </div>
  );

  // 2 columns x 8 rows, row-major order matching Figma:
  // Row 1: Q1 (occupy)            | Q2 (ownership)
  // Row 2: Q3 (seller affiliation)| Q4 (borrowing money)
  // Row 3: Money field            | Q5 (other mortgage)
  // Row 4: Q6 (new credit)        | Q7 (co-signer)
  // Row 5: Q8 (judgments)         | Q9 (federal debt)
  // Row 6: Q10 (lawsuit)          | Q11 (conveyed title)
  // Row 7: Q12 (short sale)       | Q13 (foreclosed)
  // Row 8: Q14 (bankruptcy)       | bankruptcy types
  const cells: React.ReactNode[] = [
    yn(DECLARATION_QUESTIONS[0], 0),
    yn(DECLARATION_QUESTIONS[1], 1),
    yn(DECLARATION_QUESTIONS[2], 2),
    yn(DECLARATION_QUESTIONS[3], 3),
    moneyField,
    yn(DECLARATION_QUESTIONS[4], 4),
    yn(DECLARATION_QUESTIONS[5], 5),
    yn(DECLARATION_QUESTIONS[6], 6),
    yn(DECLARATION_QUESTIONS[7], 7),
    yn(DECLARATION_QUESTIONS[8], 8),
    yn(DECLARATION_QUESTIONS[9], 9),
    yn(DECLARATION_QUESTIONS[10], 10),
    yn(DECLARATION_QUESTIONS[11], 11),
    yn(DECLARATION_QUESTIONS[12], 12),
    yn(DECLARATION_QUESTIONS[13], 13),
    bankruptcyTypes,
  ];

  return (
    <div className="flex flex-col" style={{ gap: "var(--roads-spacing-component-l)" }}>
      <h3
        className="headline-300"
        style={{ color: "var(--roads-text-primary)" }}
        data-testid="section-declarations"
      >
        Declarations
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridAutoRows: "min-content",
          alignItems: "start",
          columnGap: "var(--roads-spacing-component-xl)",
          rowGap: "var(--roads-spacing-component-xl)",
        }}
      >
        {cells}
      </div>
    </div>
  );
}

