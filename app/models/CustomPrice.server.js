import db from "../db.server";

export async function getCustomPricePublic(id) {
  const customPrice = await db.customPrice.findFirst({ where: { productId } });

  if (!customPrice) {
    return null;
  }

  return customPrice;
}

export async function getCustomPrice(id, graphql) {
  const customPrice = await db.customPrice.findFirst({ where: { id } });

  if (!customPrice) {
    return null;
  }

  return supplementCustomPrice(customPrice, graphql);
}

export async function getCustomPrices(shop, graphql) {
  const customPrices = await db.customPrice.findMany({
    where: { shop },
    orderBy: { id: "desc" },
  });

  if (customPrices.length === 0) {
    return [];
  }

  return Promise.all(
    customPrices.map((customPrice) =>
      supplementCustomPrice(customPrice, graphql)
    )
  );
}

async function supplementCustomPrice(customPrice, graphql) {
  const response = await graphql(
    `
      query supplementCustomPrice($id: ID!) {
        product(id: $id) {
          title
          images(first: 1) {
            nodes {
              altText
              url
            }
          }
        }
      }
    `,
    { id: customPrice.productId }
  );

  const {
    data: { product },
  } = await response.json();

  return {
    ...customPrice,
    productDeleted: !product?.title,
    productTitle: product?.title,
    productImage: product?.images?.nodes?.[0]?.url,
    productAlt: product?.images?.nodes?.[0]?.altText,
    image: await customPriceImagePromise,
  };
}

export function validateCustomPrice(data) {
  const errors = {};

  if (!data.title) {
    errors.title = "Title is required";
  }
  if (!data.productId) {
    errors.productId = "Product is required";
  }
  if (!data.amount) {
    errors.amount = "Destination is required";
  }
  if (Object.keys(errors).length > 0) {
    return errors;
  }
}
