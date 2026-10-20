import type { Metadata } from "next";
import { AssessmentFlow } from "@/components/assessment/AssessmentFlow";

export const metadata: Metadata = {
  title: "Trader assessment · Catalyst Academy",
  description: "Six quick questions that build your trader profile.",
};

export default function AssessmentPage() {
  return <AssessmentFlow />;
}
