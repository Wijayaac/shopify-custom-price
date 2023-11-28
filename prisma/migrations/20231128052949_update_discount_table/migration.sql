/*
  Warnings:

  - Added the required column `productVariantId` to the `Discount` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Discount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "customerTag" TEXT NOT NULL,
    "isShow" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "productVariantId" TEXT NOT NULL
);
INSERT INTO "new_Discount" ("amount", "code", "createdAt", "customerTag", "expiresAt", "id", "isShow", "shop", "title") SELECT "amount", "code", "createdAt", "customerTag", "expiresAt", "id", "isShow", "shop", "title" FROM "Discount";
DROP TABLE "Discount";
ALTER TABLE "new_Discount" RENAME TO "Discount";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
