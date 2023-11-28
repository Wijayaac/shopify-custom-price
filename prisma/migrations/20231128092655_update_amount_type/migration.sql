/*
  Warnings:

  - You are about to alter the column `amount` on the `Discount` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Discount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "customerTag" TEXT NOT NULL,
    "isShow" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "productVariantId" TEXT NOT NULL
);
INSERT INTO "new_Discount" ("amount", "code", "createdAt", "customerTag", "expiresAt", "id", "isShow", "productVariantId", "shop", "title") SELECT "amount", "code", "createdAt", "customerTag", "expiresAt", "id", "isShow", "productVariantId", "shop", "title" FROM "Discount";
DROP TABLE "Discount";
ALTER TABLE "new_Discount" RENAME TO "Discount";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
