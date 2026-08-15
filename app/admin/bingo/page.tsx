import { AdminFrame } from "../AdminFrame";
import { BingoWorkspace } from "./BingoWorkspace";

export default function BingoAdminPage() {
  return <AdminFrame
    current="/admin/bingo"
    eyebrow="QUEEN TRAINING CELEBRATION"
    title="Bingo, bonus points & Starbucks."
    intro="Review completed Bingo sheets, confirm participation bonuses, and run an auditable random gift-card drawing from eligible contestants."
  >
    <BingoWorkspace />
  </AdminFrame>;
}
