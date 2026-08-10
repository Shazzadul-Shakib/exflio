import { Logomark } from "@/components/Logomark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-page px-4 py-10">
      <div className="w-full max-w-100">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <Logomark />
          <h1 className="text-lg font-semibold text-text-primary">Exflio</h1>
          <p className="text-[13px] text-text-muted">Your finances, in one clear view.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
