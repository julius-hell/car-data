"use client";

import { useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";
import { localIsoDate } from "@/lib/local-date";

const noopSubscribe = () => () => {};

// A date field that defaults to today in the visitor's timezone, which is
// only known in the browser.
export function TodayDateInput(props: Omit<React.ComponentProps<typeof Input>, "type" | "defaultValue">) {
  const today = useSyncExternalStore(noopSubscribe, localIsoDate, () => "");
  return <Input type="date" defaultValue={today} key={today} {...props} />;
}
