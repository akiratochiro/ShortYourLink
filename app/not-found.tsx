import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="font-mono text-sm uppercase tracking-widest text-muted">
        shortyourlink
      </span>
      <h1 className="mt-4 font-display text-4xl font-semibold text-darkblue">
        Esse link não existe.
      </h1>
      <p className="mt-4 max-w-sm text-muted">
        O link curto que você acessou não foi encontrado. Ele pode ter sido digitado errado ou nunca ter existido.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-darkblue px-6 py-3 font-medium text-white transition-colors hover:bg-lightblue"
      >
        Criar um novo link
      </Link>
    </main>
  );
}