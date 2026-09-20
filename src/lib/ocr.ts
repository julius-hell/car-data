import { createWorker, type Worker } from "tesseract.js";

// Dashboard digits are small; upscale so they reach a height Tesseract likes.
const UPSCALE = 2;
const MAX_DIMENSION = 3600;
const THRESHOLDS = [170, 220];
const MIN_DIGITS = 3;
const MAX_DIGITS = 7;

export type OdometerCandidate = { value: number; confidence: number };

let workerPromise: Promise<Worker> | null = null;

function getWorker() {
  workerPromise ??= createWorker("eng", 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr/core",
    langPath: "/ocr/lang",
  }).then(async (worker) => {
    await worker.setParameters({
      // Sparse text: dashboards are a few numbers scattered on a dark panel.
      tessedit_pageseg_mode: "11" as never,
    });
    return worker;
  });
  return workerPromise;
}

async function loadImage(file: Blob) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(UPSCALE, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// Keeps only the bright pixels (the lit digits and labels) and flips them to
// black on white, which strips the dashboard texture Tesseract chokes on.
function brightTextOnWhite(source: ImageData, threshold: number) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(source.width, source.height);
  const from = source.data;
  const to = image.data;
  for (let i = 0; i < from.length; i += 4) {
    const luminance = (from[i] * 299 + from[i + 1] * 587 + from[i + 2] * 114) / 1000;
    const value = luminance >= threshold ? 0 : 255;
    to[i] = to[i + 1] = to[i + 2] = value;
    to[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

const TIME = /^\d{1,2}:\d{2}$/;
const DATE = /^\d{1,2}[.,]\d{1,2}[.,]\d{2,4}$/;
const GROUPED = /^\d{1,3}([.,]\d{3})+$/;

// Turns an OCR token into an odometer value, or null when it reads as a
// time, a date, or nothing numeric.
export function parseOdometerToken(raw: string): number | null {
  const token = raw.trim().replace(/[a-z]+$/i, "");
  if (!token || TIME.test(token) || DATE.test(token)) return null;
  const digits = GROUPED.test(token) ? token.replace(/[.,]/g, "") : token;
  if (!new RegExp(`^\\d{${MIN_DIGITS},${MAX_DIGITS}}$`).test(digits)) return null;
  return Number(digits);
}

// Orders candidates by how plausible they are as the total odometer: the
// value closest above the previous reading wins when one is known; otherwise
// longer numbers beat shorter ones, then confidence.
export function rankCandidates(
  candidates: OdometerCandidate[],
  latest: number | null,
): OdometerCandidate[] {
  const byValue = new Map<number, OdometerCandidate>();
  for (const candidate of candidates) {
    const existing = byValue.get(candidate.value);
    if (!existing || existing.confidence < candidate.confidence) byValue.set(candidate.value, candidate);
  }
  const score = (c: OdometerCandidate) => {
    const digits = String(c.value).length;
    if (latest !== null) {
      const ahead = c.value >= latest;
      const distance = Math.abs(c.value - latest) / Math.max(latest, 1);
      return (ahead ? 0 : 1_000) + distance * 100 + (digits < 4 ? 50 : 0) - c.confidence / 1000;
    }
    return (digits >= 4 ? 0 : 100) - Math.min(digits, 6) * 10 - c.confidence / 1000;
  };
  return [...byValue.values()].sort((a, b) => score(a) - score(b));
}

export async function recognizeOdometer(
  file: Blob,
  latest: number | null,
  onProgress?: (fraction: number) => void,
): Promise<OdometerCandidate[]> {
  const worker = await getWorker();
  const source = await loadImage(file);
  const candidates: OdometerCandidate[] = [];
  for (const [index, threshold] of THRESHOLDS.entries()) {
    const { data } = await worker.recognize(brightTextOnWhite(source, threshold), {}, { blocks: true });
    const words = (data.blocks ?? []).flatMap((block) =>
      block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words)),
    );
    for (const word of words) {
      const value = parseOdometerToken(word.text);
      if (value !== null) candidates.push({ value, confidence: word.confidence });
    }
    onProgress?.((index + 1) / THRESHOLDS.length);
  }
  return rankCandidates(candidates, latest);
}
