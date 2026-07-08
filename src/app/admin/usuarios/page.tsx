import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { requireRole } from "@/lib/auth";

export default async function AdminUsuariosPage() {
  await requireRole(["ADMIN"]);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <Card>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Consulta e manutencao completa de usuarios sera implementada em
            etapa futura.
          </p>
          <Link className="mt-5 inline-block text-sm font-semibold text-blue-900" href="/admin">
            Voltar ao painel
          </Link>
        </Card>
      </div>
    </main>
  );
}
