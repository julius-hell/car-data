"use client";

import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { deleteCar } from "@/app/(protected)/cars/actions";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function ConfirmButton() {
  const t = useTranslations("Cars");
  const { pending } = useFormStatus();
  return (
    <AlertDialogAction type="submit" variant="destructive" disabled={pending}>
      {pending ? t("deleting") : t("delete")}
    </AlertDialogAction>
  );
}

export function DeleteCarButton({ carId, plate }: { carId: string; plate: string }) {
  const t = useTranslations("Cars");
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" />}
        aria-label={t("deleteLabel", { name: plate })}
      >
        <Trash2Icon className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={deleteCar.bind(null, carId)}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle", { name: plate })}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <ConfirmButton />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
