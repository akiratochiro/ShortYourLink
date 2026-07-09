import LinkForm from "@/components/LinkForm";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm uppercase tracking-widest text-muted">
            shortyourlink
          </span>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-lightblue hover:underline"
          >
            Meus links →
          </Link>
        </div>

        <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-darkblue sm:text-5xl">
          Long URLs, gone short.
        </h1>
        <p className="mt-4 text-muted">
          Cole um link abaixo. Receba algo curto o suficiente pra realmente compartilhar.
        </p>

        <div className="mt-10">
          <LinkForm />
        </div>
      </div>
    </main>
  );
}