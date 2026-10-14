import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <div className="grid w-full max-w-sm gap-6">
        <div className="justify-self-center">
          <Logo />
        </div>
        {children}
      </div>
    </main>
  );
}
