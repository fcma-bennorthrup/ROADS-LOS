import { type User, type InsertUser, type Loan, type Borrower } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getLoan(id: string): Promise<Loan | undefined>;
  getBorrowersByLoanId(loanId: string): Promise<Borrower[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private loans: Map<string, Loan>;
  private borrowers: Map<string, Borrower>;

  constructor() {
    this.users = new Map();
    this.loans = new Map();
    this.borrowers = new Map();
    this.seedData();
  }

  private seedData() {
    const loanId = "1";
    const loan: Loan = {
      id: loanId,
      loanNumber: "123456789",
      cifNumber: "1234567",
      loanType: "Construction",
      stage: "Loan Setup",
      primaryBorrowerName: "Richard Jamerson",
      displayAmount: "150000.00",
      amountRequested: "145000.00",
      financedFees: "4455.00",
      taxesInsurance: "1000.00",
      product: "1/1 ARM 2/6 caps",
      finalRate: "7.255",
      principalInterest: "1000.00",
      totalMonthlyPayment: "1650.00",
      applicationType: "Joint Credit Application",
      ecoaDaysRemaining: 14,
      tridDaysRemaining: 3,
      piti: "36.00",
      dti: "17.00",
      lcv: "80.00",
      pweCbScore: 756,
      ruleOfXx: null,
      totalCv: "250000.00",
      cashReserves: "5000000.00",
      totalLoanAmount: "150455.00",
    };
    this.loans.set(loanId, loan);

    const borrower1: Borrower = {
      id: randomUUID(),
      loanId,
      name: "Richard Jamerson",
      email: "richardtjamerson@gmail.com",
      phone: "(123) 456-7890",
      isPrimary: true,
    };
    const borrower2: Borrower = {
      id: randomUUID(),
      loanId,
      name: "Jamelle Jamerson",
      email: "jamellepjamerson@gmail.com",
      phone: "(123) 098-7654",
      isPrimary: false,
    };
    const borrower3: Borrower = {
      id: randomUUID(),
      loanId,
      name: "Priya Sharma",
      email: "priya.sharma@example.com",
      phone: "(415) 555-0182",
      isPrimary: false,
    };
    this.borrowers.set(borrower1.id, borrower1);
    this.borrowers.set(borrower2.id, borrower2);
    this.borrowers.set(borrower3.id, borrower3);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getLoan(id: string): Promise<Loan | undefined> {
    return this.loans.get(id);
  }

  async getBorrowersByLoanId(loanId: string): Promise<Borrower[]> {
    return Array.from(this.borrowers.values()).filter(
      (borrower) => borrower.loanId === loanId,
    );
  }
}

export const storage = new MemStorage();
