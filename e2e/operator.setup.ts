import { execFileSync } from "node:child_process";
import { expect, test as setup } from "@playwright/test";
import { OPERATOR, OPERATOR_STATE } from "./helpers/org";

setup("bootstrap the operator with the CLI", async ({ page }) => {
  const output = execFileSync(
    "node",
    ["scripts/create-operator.mjs", "--email", OPERATOR.email, "--name", OPERATOR.name],
    { encoding: "utf8", env: process.env },
  );
  const link = new URL(output.trim().split("\n").pop()!);

  await page.goto(link.pathname + link.search);
  await page.getByLabel("New password").fill(OPERATOR.password);
  await page.getByRole("button", { name: "Set password" }).click();
  await expect(page.getByTestId("login-notice")).toBeVisible();

  await page.getByLabel("Email").fill(OPERATOR.email);
  await page.getByLabel("Password").fill(OPERATOR.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/operator");
  await page.context().storageState({ path: OPERATOR_STATE });
});
