"use client";

import { CameraIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Unit } from "@/lib/db/schema";
import { recognizeOdometer, type OdometerCandidate } from "@/lib/ocr";

type ScanState =
  | { status: "idle" }
  | { status: "scanning"; progress: number }
  | { status: "done"; candidates: OdometerCandidate[] }
  | { status: "failed" };

export function OdometerScanner({
  latest,
  unit,
  onRecognized,
}: {
  latest: number | null;
  unit: Unit;
  onRecognized: (value: number) => void;
}) {
  const t = useTranslations("Scan");
  const format = useFormatter();
  const [state, setState] = useState<ScanState>({ status: "idle" });
  const inputId = "odometer-photo";

  async function scan(file: File | undefined) {
    if (!file) return;
    setState({ status: "scanning", progress: 0 });
    try {
      const candidates = await recognizeOdometer(file, latest, (progress) =>
        setState({ status: "scanning", progress }),
      );
      setState({ status: "done", candidates });
      if (candidates[0]) onRecognized(candidates[0].value);
    } catch {
      setState({ status: "failed" });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label={t("button")}
        onChange={(event) => {
          scan(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={state.status === "scanning"}
        onClick={() => document.getElementById(inputId)?.click()}
        className="self-start"
      >
        <CameraIcon aria-hidden className="size-4" />
        {state.status === "scanning"
          ? t("scanning", { percent: Math.round(state.progress * 100) })
          : t("button")}
      </Button>

      {state.status === "done" && state.candidates.length === 0 && (
        <p role="status" data-testid="scan-result" className="text-muted-foreground text-sm">
          {t("nothingFound")}
        </p>
      )}
      {state.status === "failed" && (
        <p role="status" data-testid="scan-result" className="text-destructive text-sm">
          {t("failed")}
        </p>
      )}
      {state.status === "done" && state.candidates.length > 0 && (
        <div role="status" data-testid="scan-result" className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {t("recognized", { value: format.number(state.candidates[0].value), unit })}
          </span>
          {state.candidates.length > 1 && (
            <>
              <span className="text-muted-foreground">{t("orMaybe")}</span>
              {state.candidates.slice(1, 4).map((candidate) => (
                <button
                  key={candidate.value}
                  type="button"
                  onClick={() => onRecognized(candidate.value)}
                  className="bg-muted hover:bg-accent hover:text-accent-foreground rounded-full px-2.5 py-0.5 font-mono text-xs tabular-nums transition-colors"
                >
                  {format.number(candidate.value)}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
