import { getFormatter, getTranslations } from "next-intl/server";
import { AddEntryForm } from "@/components/add-entry-form";
import { CarPhoto } from "@/components/car-photo";
import { EntriesTable } from "@/components/entries-table";
import { CarIntervals } from "@/components/intervals/car-intervals";
import type { Actor } from "@/lib/actor";
import type { Car } from "@/lib/db/schema";
import { getContract } from "@/lib/contracts";
import { isoDateToDate } from "@/lib/dates";
import { listEntries } from "@/lib/entries";

// The car page for a driver assigned to the car: log a reading and see the
// entries they recorded themselves.
export async function DriverCarView({ actor, car, focusForm }: { actor: Actor; car: Car; focusForm: boolean }) {
  const [entries, contract, t, tc, format] = await Promise.all([
    listEntries(car.id, { recordedBy: actor.userId }),
    getContract(car.id),
    getTranslations("Car"),
    getTranslations("Contracts"),
    getFormatter(),
  ]);
  // Drivers learn when they can expect a replacement, not the contract's terms.
  const endOn = contract && contract.kind !== "owned" ? contract.endOn : null;

  return (
    <>
      <AddEntryForm carId={car.id} autoFocus={focusForm} />
      <CarIntervals car={car} organizationId={actor.organizationId} canManage={false} showHistory={false} />
      {endOn && (
        <p className="text-muted-foreground text-sm" data-testid="driver-contract-end">
          {tc("driverEnd", { date: format.dateTime(isoDateToDate(endOn), { dateStyle: "medium" }) })}
        </p>
      )}
      <div className="aspect-[3/2]">
        <CarPhoto carId={car.id} plate={car.licencePlate} photoUpdatedAt={car.photoUpdatedAt} editable={false} />
      </div>
      <EntriesTable actor={actor} entries={entries} showRecordedBy={false} title={t("myReadings")} />
    </>
  );
}
