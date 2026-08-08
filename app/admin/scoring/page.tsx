import { AdminFrame } from "../AdminFrame";
import { ScoringWorkspace } from "./ScoringWorkspace";

export default function Page() {
  return <AdminFrame current="/admin/scoring" title="Performance scoring." intro="Record the published 100-point rubric, document every score, and let each contestant follow her points from her private campaign profile."><ScoringWorkspace /></AdminFrame>;
}
