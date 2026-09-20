"use client";

import { CarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { removeCarPhoto } from "@/app/(protected)/cars/[carId]/photo-actions";
import { Button } from "@/components/ui/button";
import { photoUrl } from "@/lib/photo-url";

function RemoveButton() {
  const t = useTranslations("Photo");
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      className="bg-background/85 backdrop-blur dark:bg-background/85"
    >
      {pending ? t("removing") : t("remove")}
    </Button>
  );
}

export function CarPhoto({
  carId,
  carName,
  photoUpdatedAt,
}: {
  carId: string;
  carName: string;
  photoUpdatedAt: Date | null;
}) {
  const t = useTranslations("Photo");
  const router = useRouter();
  const [uploading, startUpload] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputId = `photo-${carId}`;

  function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    startUpload(async () => {
      const body = new FormData();
      body.set("photo", file);
      const response = await fetch(`/cars/${carId}/photo`, { method: "POST", body });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? t("errorGeneric"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="flex h-full flex-col gap-2">
      <div
        className={
          "bg-muted/60 relative min-h-56 flex-1 overflow-hidden rounded-xl border " +
          (photoUpdatedAt ? "" : "border-dashed")
        }
      >
        {photoUpdatedAt ? (
          // eslint-disable-next-line @next/next/no-img-element -- served by our own ownership-checked route
          <img
            src={photoUrl(carId, "display", photoUpdatedAt)}
            alt={t("alt", { name: carName })}
            data-testid="car-photo"
            className="absolute inset-0 size-full object-contain"
          />
        ) : (
          <div
            data-testid="car-photo-placeholder"
            className="text-muted-foreground absolute inset-0 flex items-center justify-center"
          >
            <CarIcon aria-hidden className="size-10" />
          </div>
        )}

        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2">
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={photoUpdatedAt ? t("change") : t("add")}
            onChange={(event) => {
              upload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            className="bg-background/85 backdrop-blur dark:bg-background/85"
            onClick={() => document.getElementById(inputId)?.click()}
          >
            {uploading ? t("uploading") : photoUpdatedAt ? t("change") : t("add")}
          </Button>
          {photoUpdatedAt && (
            <form action={removeCarPhoto.bind(null, carId)}>
              <RemoveButton />
            </form>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" data-testid="photo-error" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
