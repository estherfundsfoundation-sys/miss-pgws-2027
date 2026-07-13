import { AdminFrame } from "../AdminFrame";
import { PlatformLaunchManager } from "./PlatformLaunchManager";
import { StaffAccessManager } from "./StaffAccessManager";

export default function Page() {
  return <AdminFrame current="/admin/settings" title="Competition configuration." intro="Control staff access, dates, rounds, agreement versions, scholarship disclosures, leaderboard display, and public publishing from one governed workspace.">
    <PlatformLaunchManager />
    <div className="notice settings-readiness"><span>◆</span><div><strong>External legal review remains recommended.</strong><br />This internal advisory is nonblocking. A super administrator may open real applications now, and that decision is written to the audit log.</div></div>
    <StaffAccessManager />
  </AdminFrame>;
}
