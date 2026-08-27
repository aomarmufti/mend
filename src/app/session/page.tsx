import { exercisesByStage } from "@/data/exercises";
import { SessionRunner } from "@/components/session/SessionRunner";

export default function SessionPage() {
  return <SessionRunner exercises={exercisesByStage("Early")} />;
}
