"use client";

import { useFormStatus } from "react-dom";
import { deleteCar } from "@/app/(protected)/cars/actions";
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
  const { pending } = useFormStatus();
  return (
    <AlertDialogAction type="submit" variant="destructive" disabled={pending}>
      {pending ? "Deleting…" : "Delete"}
    </AlertDialogAction>
  );
}

export function DeleteCarButton({ carId, carName }: { carId: string; carName: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="ghost" size="sm" />}
        aria-label={`Delete ${carName}`}
      >
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={deleteCar.bind(null, carId)}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {carName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the car and every mileage entry recorded for it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <ConfirmButton />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
