"use client";

import { CarIcon } from "lucide-react";
import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  removeCarPhoto,
  setCarPhoto,
  type PhotoActionState,
} from "@/app/(protected)/cars/[carId]/photo-actions";
import { Button } from "@/components/ui/button";
import { photoUrl } from "@/lib/photo-url";

function RemoveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? "Removing…" : "Remove photo"}
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
  const [state, upload, uploading] = useActionState<PhotoActionState, FormData>(
    setCarPhoto.bind(null, carId),
    { status: "idle" },
  );
  const formRef = useRef<HTMLFormElement>(null);
  const inputId = `photo-${carId}`;

  return (
    <section className="flex flex-col gap-3">
      {photoUpdatedAt ? (
        // eslint-disable-next-line @next/next/no-img-element -- served by our own ownership-checked route
        <img
          src={photoUrl(carId, "display", photoUpdatedAt)}
          alt={`Photo of ${carName}`}
          data-testid="car-photo"
          className="h-auto w-full rounded-lg"
        />
      ) : (
        <div
          data-testid="car-photo-placeholder"
          className="bg-muted text-muted-foreground flex h-40 items-center justify-center rounded-lg"
        >
          <CarIcon aria-hidden className="size-10" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <form ref={formRef} action={upload}>
          <input
            id={inputId}
            name="photo"
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={photoUpdatedAt ? "Change photo" : "Add photo"}
            onChange={() => formRef.current?.requestSubmit()}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => document.getElementById(inputId)?.click()}
          >
            {uploading ? "Uploading…" : photoUpdatedAt ? "Change photo" : "Add photo"}
          </Button>
        </form>
        {photoUpdatedAt && (
          <form action={removeCarPhoto.bind(null, carId)}>
            <RemoveButton />
          </form>
        )}
      </div>

      {state.status === "error" && (
        <p role="alert" data-testid="photo-error" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
    </section>
  );
}
