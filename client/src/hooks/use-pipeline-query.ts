import { useQuery } from "@tanstack/react-query";
import type { PipelineLoan } from "@shared/pipeline";

export function usePipelineQuery() {
  return useQuery<PipelineLoan[]>({
    queryKey: ["/api/loans"],
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 10_000,
  });
}
