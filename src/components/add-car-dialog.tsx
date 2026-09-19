"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createCar } from "@/app/(protected)/cars/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UNITS } from "@/lib/db/schema";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding…" : "Add car"}
    </Button>
  );
}

export function AddCarDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  async function submit(formData: FormData) {
    await createCar(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>{children}</DialogTrigger>
      <DialogContent>
        <form action={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add a car</DialogTitle>
            <DialogDescription>
              Give it a name and pick the unit its odometer uses.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="car-name">Name</Label>
            <Input
              id="car-name"
              name="name"
              maxLength={64}
              placeholder="e.g. Honda Civic"
              autoFocus
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="car-unit">Unit</Label>
            <select
              id="car-unit"
              name="unit"
              defaultValue="km"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
