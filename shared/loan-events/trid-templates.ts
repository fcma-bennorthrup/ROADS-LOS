/** Frozen Trigger TRID inputs. Keep parity with the pre-server template. */
export function tridDemoSections(_loanId: string): Record<string, unknown> {
  return {
    "borrower-primary": {
      firstName: "Richard", lastName: "Jamerson", ssn: "XXX-XX-1234", dob: "",
      phone: "", email: "", address: "", city: "", state: "", zip: "",
      maritalStatus: "", dependents: "", dependentsAges: "", farmInvolvement: "", mla: false,
    },
    "loan-details": {
      loanType: "", loanPurpose: "", requestedLoanAmount: "145000.00",
      downPaymentAmount: "", downPaymentSource: "", tellTheStory: "", intentToProceed: false, brpLoan: false,
    },
    "subject-property": {
      address1: "125 Meadow Lane", address2: "", city: "Louisville", county: "", state: "KY", zip: "40234",
      collateralOwnerId: "", monthlyPropertyTaxes: "", monthlyInsurance: "",
    },
    "evaluation-1": {
      address1: "", address2: "", city: "", county: "", state: "", zip: "",
      estimatedValue: "195000.00", evaluationDate: "", appraisalType: "", landValue: "",
      otherImprovementsValue: "", reportedValueTotal: "", appraiser: "",
    },
    income: [{
      name: "Richard Jamerson", isPrimaryWageEarner: true, incomeSources: [{
        id: "trid-demo-income", incomeType: "W2", employer: "", titlePosition: "", currentJob: "",
        startDate: "", endDate: "", yearsEmployed: "", yearsInLineOfWork: "",
        address1: "", address2: "", city: "", state: "", zip: "", phone: "",
        baseEmploymentIncome: "60000.00", overtime: "", bonuses: "", commissions: "", other: "",
        totalMonthlyIncome: "$5,000.00", totalYearlyIncome: "$60,000.00",
      }],
    }],
  };
}
