import { z } from "zod";

export const SALES_SUPPORT_PEOPLE = ["Tyler Coke", "Nikki Wheat", "Matthew Lewis"] as const;
export const salesSupportTeamSchema = z.object({
  primary: z.enum(SALES_SUPPORT_PEOPLE),
  secondary: z.union([z.enum(SALES_SUPPORT_PEOPLE), z.literal("")]),
}).strict().refine(team => team.primary !== team.secondary, {
  message: "Primary and secondary must be different people.", path: ["secondary"],
});
export type SalesSupportTeam = z.infer<typeof salesSupportTeamSchema>;

export function defaultSalesSupport(officer?: string): string {
  switch (officer?.trim()) {
    case "Sarah Williams": return "Tyler Coke";
    case "Rylee Alcorn": return "Matthew Lewis";
    case "Conner Welch":
    case "Connor Welch": return "Nikki Wheat";
    default: return "";
  }
}
