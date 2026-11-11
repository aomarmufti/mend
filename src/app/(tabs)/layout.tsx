import { BottomNav } from "@/components/BottomNav";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <div className="flex-1 pb-28">{children}</div>
      <BottomNav />
    </div>
  );
}
