export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-screen max-w-md pb-[env(safe-area-inset-bottom)]">{children}</div>;
}
