import { AdminFrame } from "../AdminFrame";
import { ContestantOperations } from "./ContestantOperations";
import { QueenTrainingCheckinManager } from "./QueenTrainingCheckinManager";

export default function Page() {
  return (
    <AdminFrame
      current="/admin/contestants"
      title="The contestant command center."
      intro="Focus on the accepted cohort, track campaign readiness, prepare the voting roster, publish profiles, and preserve every decision in one place."
    >
      <ContestantOperations />
      <QueenTrainingCheckinManager />
    </AdminFrame>
  );
}
