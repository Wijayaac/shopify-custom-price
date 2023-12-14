/*
  Warnings:

  - You are about to drop the column `customerTag` on the `CustomPrice` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `CustomPrice` table. All the data in the column will be lost.
  - You are about to drop the column `productVariantId` on the `CustomPrice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `CustomPrice` DROP COLUMN `customerTag`,
    DROP COLUMN `productId`,
    DROP COLUMN `productVariantId`,
    MODIFY `expiresAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `productGid` VARCHAR(191) NOT NULL,
    `variantGid` VARCHAR(191) NOT NULL,
    `customPriceId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `customerGid` VARCHAR(191) NOT NULL,
    `customPriceId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_customPriceId_fkey` FOREIGN KEY (`customPriceId`) REFERENCES `CustomPrice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_customPriceId_fkey` FOREIGN KEY (`customPriceId`) REFERENCES `CustomPrice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
