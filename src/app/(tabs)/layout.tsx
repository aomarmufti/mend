import { BottomNav } from "@/components/BottomNav";
import { RequirePlan } from "@/components/flow/RequirePlan";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequirePlan>
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <div className="flex-1 pb-28">{children}</div>
        <BottomNav />
      </div>
    </RequirePlan>
  );
}
