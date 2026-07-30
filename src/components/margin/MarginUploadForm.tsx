"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { MarginUploadResult } from "@/components/margin/MarginUploadResult";
import { SiapeMarginReview } from "@/components/margin/SiapeMarginReview";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatFileSize } from "@/lib/margin/format";
import { MARGIN_AGREEMENTS, validateMarginPdfFile } from "@/services/margin.service";
import type {
  MarginAgreement,
  MarginMpdftUploadSuccessResponse,
  MarginSiapeUploadSuccessResponse,
  MarginUploadDebug,
  MarginUploadFileInfo,
  MarginUploadResponse,
} from "@/types/margin";

type UploadState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      file?: MarginUploadFileInfo;
      debug?: MarginUploadDebug;
    }
  | { status: "loading" }
  | {
      status: "success";
      response: MarginMpdftUploadSuccessResponse | MarginSiapeUploadSuccessResponse;
    };

const GENERIC_ERROR_MESSAGE = "Não foi possível enviar o arquivo agora.";

export function MarginUploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<MarginAgreement | null>(
    null,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [siapeDraft, setSiapeDraft] = useState<
    MarginSiapeUploadSuccessResponse["siapeDraft"] | null
  >(null);

  function resetFileAndResult() {
    setSelectedFile(null);
    setState({ status: "idle" });
    setSiapeDraft(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleAgreementChange(agreement: MarginAgreement) {
    setSelectedAgreement(agreement);
    resetFileAndResult();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setSiapeDraft(null);

    if (!file) {
      setState({ status: "idle" });
      return;
    }

    const validation = await validateMarginPdfFile(file);

    if (!validation.valid) {
      setState({
        status: "error",
        message: validation.message ?? GENERIC_ERROR_MESSAGE,
      });
      return;
    }

    setState({ status: "idle" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = await validateMarginPdfFile(selectedFile);

    if (!selectedAgreement) {
      setState({
        status: "error",
        message: "Selecione o convênio.",
      });
      return;
    }

    if (!validation.valid || !selectedFile) {
      setState({
        status: "error",
        message: validation.message ?? "Selecione um arquivo PDF.",
      });
      return;
    }

    setState({ status: "loading" });
    setSiapeDraft(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("agreement", selectedAgreement);

    try {
      const response = await fetch("/api/verificador-margem/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as MarginUploadResponse;

      if (!data.success) {
        if (data.debug?.stage && process.env.NODE_ENV === "development") {
          console.log("Erro seguro do Verificador de Margem:", data.debug);
        }

        setState({
          status: "error",
          message: data.message || GENERIC_ERROR_MESSAGE,
          file: data.file,
          debug: data.debug,
        });
        return;
      }

      if (!response.ok) {
        setState({
          status: "error",
          message: GENERIC_ERROR_MESSAGE,
        });
        return;
      }

      if (data.agreement === "SIAPE") {
        setSiapeDraft(data.siapeDraft);
      }

      setState({ status: "success", response: data });
    } catch {
      setState({ status: "error", message: GENERIC_ERROR_MESSAGE });
    }
  }

  function handleChooseAnother() {
    resetFileAndResult();
  }

  const isLoading = state.status === "loading";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Anexe o contracheque em PDF
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Selecione um arquivo PDF com até 4 MB.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-slate-900">
          Selecione o convênio
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {MARGIN_AGREEMENTS.map((agreement) => (
            <label
              key={agreement}
              className={cn(
                "flex min-h-12 cursor-pointer items-center justify-center rounded-lg border px-4 py-3 text-sm font-semibold transition",
                selectedAgreement === agreement
                  ? "border-blue-900 bg-blue-50 text-blue-950"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50",
              )}
            >
              <input
                type="radio"
                name="agreement"
                value={agreement}
                checked={selectedAgreement === agreement}
                onChange={() => handleAgreementChange(agreement)}
                disabled={isLoading}
                className="sr-only"
              />
              {agreement}
            </label>
          ))}
        </div>
      </fieldset>

      <label
        htmlFor="margin-pdf-input"
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-blue-900 hover:bg-blue-50"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-8 w-8 text-slate-400"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
          />
        </svg>
        <span className="text-sm font-medium text-slate-700">
          Toque para selecionar o PDF
        </span>
        <input
          ref={inputRef}
          id="margin-pdf-input"
          name="file"
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={handleFileChange}
          disabled={isLoading}
        />
      </label>

      {selectedFile ? (
        <dl className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Arquivo selecionado</dt>
            <dd className="mt-1 break-words font-medium text-slate-900">
              {selectedFile.name}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Tamanho do arquivo</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {formatFileSize(selectedFile.size)}
            </dd>
          </div>
        </dl>
      ) : null}

      {state.status === "error" ? (
        <MarginUploadResult
          status="error"
          message={state.message}
          file={state.file}
          debug={state.debug}
        />
      ) : null}

      {state.status === "success" && state.response.agreement === "MPDFT" ? (
        <MarginUploadResult
          status="success"
          message={state.response.message}
          agreement={state.response.agreement}
          file={state.response.file}
          extraction={state.response.extraction}
        />
      ) : null}

      {state.status === "success" &&
      state.response.agreement === "SIAPE" &&
      siapeDraft ? (
        <SiapeMarginReview review={siapeDraft} />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="submit"
          className="flex-1"
          loading={isLoading}
          disabled={!selectedFile || !selectedAgreement}
        >
          Enviar para extração
        </Button>
        {selectedFile ? (
          <Button
            type="button"
            variant="secondary"
            onClick={handleChooseAnother}
            disabled={isLoading}
          >
            Escolher outro arquivo
          </Button>
        ) : null}
      </div>
    </form>
  );
}
