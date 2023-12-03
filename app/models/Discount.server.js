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

export async function getDiscounts() {
  const discounts = await db.discount.findMany();

  if (!discounts) {
    return null;
  }
  return discounts;
}

export async function getCustomers(graphql) {
  const response = await graphql(
    `
      query products {
        products(first: 10) {
          nodes {
            id
          }
        }
      }
    `
  );
}
