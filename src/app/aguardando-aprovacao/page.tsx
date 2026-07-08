import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function AguardandoAprovacaoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 text-slate-950">
      <section className="w-full max-w-md">
        <Card>
          <h1 className="text-2xl font-bold">Cadastro em análise</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Seu cadastro foi enviado e está aguardando aprovação do
            administrador.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Assim que for aprovado, você poderá acessar sua área pelo login.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-950"
          >
            Voltar ao login
          </Link>
        </Card>
      </section>
    </main>
  );
}
