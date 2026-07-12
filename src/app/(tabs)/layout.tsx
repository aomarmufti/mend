import { BottomNav } from "@/components/BottomNav";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-paper">
      <div className="flex-1 pb-6">{children}</div>
      <BottomNav />
    </div>
  );
}
