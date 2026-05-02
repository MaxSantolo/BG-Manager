import Link from "next/link";

export const metadata = { title: "Registro bustine" };

export default function SleevesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Registro bustine</h1>
        <Link href="/sleeves/new" className="btn-primary">Aggiungi bustina</Link>
      </div>
      {children}
    </div>
  );
}
