import { z } from "zod";

export const CONTACT_ROLES = ["Seller", "Mortgage Broker", "Settlement Agent", "Title Company", "Real Estate Agent (Buyer)", "Real Estate Agent (Seller)"] as const;
export const contactFields = [
  ["name", "Name"], ["company", "Company Name"], ["street", "Street Address"],
  ["city", "City"], ["state", "State"], ["zip", "Zip Code (zip+4)"],
  ["companyNmls", "Company NMLS ID"], ["companyLicense", "Company License ID"],
  ["companyLicenseState", "Company License State"], ["fileNumber", "File Number"],
  ["contactName", "Contact Name"], ["contactNmls", "Contact NMLS ID"],
  ["contactLicense", "Contact License ID"], ["contactLicenseState", "Contact License State"],
  ["email", "Email Address"], ["phone", "Phone Number"],
] as const;
export type ContactField = typeof contactFields[number][0];
export type LoanContact = { id: string; role: typeof CONTACT_ROLES[number] } & Partial<Record<ContactField, string>>;
export const loanContactsSchema = z.array(z.object({
  id: z.string().min(1), role: z.enum(CONTACT_ROLES),
  ...Object.fromEntries(contactFields.map(([key]) => [key, z.string().optional()])),
})).refine(rows => new Set(rows.map(row => row.id)).size === rows.length, "Contact IDs must be unique.");
export const contactName = (contact: LoanContact) => contact.role === "Seller" ? contact.name || "Unnamed seller" : contact.contactName || contact.company || "Unnamed contact";
