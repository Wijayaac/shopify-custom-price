import db from "../db.server";

export async function getCustomPricePublic(productId) {
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
      #graphql
      query supplementCustomPrice($id: ID!, $customerId: ID!) {
        product(id: $id) {
          title
          images(first: 1) {
            nodes {
              altText
              url
            }
          }
        }
        customer(id: $customerId) {
          name: firstName
        }
      }
    `,
    {
      variables: {
        id: customPrice.productId,
        customerId: customPrice.customerTag,
      },
    }
  );

  const {
    data: { product, customer },
  } = await response.json();

  return {
    ...customPrice,
    customerName: customer.name,
    productDeleted: !product?.title,
    productTitle: product?.title,
    productImage: product?.images?.nodes?.[0]?.url,
    productAlt: product?.images?.nodes?.[0]?.altText,
    createdAt: customPrice.createdAt.toLocaleDateString("en-GB"),
    expiresAt: customPrice.expiresAt.toLocaleDateString("en-GB"),
  };
}

export function validateCustomPrice(data) {
  const errors = {};

  if (!data.title) {
    errors.title = "Title is required";
  }
  if (!data.amount) {
    errors.amount = "Amount is required";
  }
  if (!data.code) {
    errors.code = "Discount code is required";
  }
  if (Object.keys(errors).length > 0) {
    return errors;
  }
}
