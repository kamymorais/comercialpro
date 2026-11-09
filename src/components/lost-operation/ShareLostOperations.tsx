"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ShareLostOperations({ csv }: { csv: string }) {
  const [message, setMessage] = useState("");
  async function share() {
    const file = new File(["\uFEFF", csv], "operacoes-perdidas.csv", { type: "text/csv;charset=utf-8" });
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: "Operações perdidas", text: "Relatório de operações perdidas", files: [file] });
        setMessage("Arquivo compartilhado.");
        return;
      }
      const url = URL.createObjectURL(new Blob([file], { type: file.type }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Arquivo baixado. Anexe-o ao aplicativo em que deseja compartilhar.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessage("Não foi possível compartilhar. Use o botão de baixar arquivo.");
    }
  }
  return <div className="flex flex-col gap-2 sm:flex-row"><Button onClick={share}>Compartilhar arquivo</Button>{message ? <p aria-live="polite" className="self-center text-sm text-slate-600">{message}</p> : null}</div>;
}
