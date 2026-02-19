import { expect, test } from "@playwright/test";

test.describe("Web app auth and dashboard", () => {
  test("admin login with 2FA and access dashboard + conversations", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Acceso Seguro" })).toBeVisible();
    await page.getByLabel("Correo").fill("admin@platform.local");
    await page.getByLabel("Clave").fill("ChangeMe123!");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByLabel("Código 2FA")).toBeVisible();
    await page.getByLabel("Código 2FA").fill("123456");
    await page.getByRole("button", { name: "Finalizar acceso" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard Operativo" })).toBeVisible();

    await page.getByRole("link", { name: "Conversaciones" }).click();
    await expect(page).toHaveURL(/\/conversations$/);
    await expect(
      page.getByRole("heading", { name: "Centro de Conversaciones" }),
    ).toBeVisible();
  });

  test("agent login should not expose reportes in side menu", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Correo").fill("agente01@platform.local");
    await page.getByLabel("Clave").fill("ChangeMe123!");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard Operativo" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reportes" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Backups" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "MCP" })).toHaveCount(0);
  });
});
