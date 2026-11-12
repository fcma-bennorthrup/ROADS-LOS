import { z } from "zod";

export const OPERATIONS_PEOPLE = ["Megann Ziedes", "Taylor Beckham", "Hajar Bonnett"] as const;
export const operationsTeamSchema = z.object({
  primary: z.enum(OPERATIONS_PEOPLE),
  secondary: z.union([z.enum(OPERATIONS_PEOPLE), z.literal("")]),
}).strict().refine(team => team.primary !== team.secondary, {
  message: "Primary and secondary must be different people.", path: ["secondary"],
});
export type OperationsTeam = z.infer<typeof operationsTeamSchema>;
