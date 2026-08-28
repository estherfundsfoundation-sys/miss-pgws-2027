import { redirect } from "next/navigation";
import content from "../../content/application-content.json";

export default function VotePage() {
  redirect(content.voting.jotformUrl);
}
