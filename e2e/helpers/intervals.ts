import type { Page } from "@playwright/test";

export const intervalRow = (page: Page, name: string) =>
  page.locator(`[data-testid="interval"][data-name="${name}"]`);
