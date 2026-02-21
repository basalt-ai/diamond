import { Toaster } from "@/components/ui/sonner";

export default function SetupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background">
      <header className="w-full border-b px-6 py-4">
        <span className="text-sm font-bold">Diamond Engine</span>
      </header>
      <main className="w-full max-w-2xl flex-1 px-6 py-8">{children}</main>
      <Toaster />
    </div>
  );
}
