import type { Page } from "@playwright/test";

export const intervalRow = (page: Page, name: string) =>
  page.locator(`[data-testid="interval"][data-name="${name}"]`);

// Opens an interval's completion history unless it already is open.
export async function openHistory(row: import("@playwright/test").Locator) {
  const history = row.getByTestId("completion-history");
  if ((await history.getAttribute("open")) === null) await history.locator("summary").click();
}
