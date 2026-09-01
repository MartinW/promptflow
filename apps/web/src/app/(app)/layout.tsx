import { AppHeader } from "@/components/app-header";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AppHeader />
      <div className="flex-1">{children}</div>
    </>
  );
}
