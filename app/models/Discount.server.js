import db from "../db.server";

export async function getDiscount(productVariantId) {
  const discount = await db.discount.findFirst({
    where: {
      productVariantId,
    },
  });

  if (!discount) {
    return null;
  }
  return discount;
}
