import db from "../db.server";

// TODO: need to add a new fields for discount GID, so when the custom price deleted the discount also deleted

export async function getCustomPricePublic(productId) {
  const customPrice = await db.customPrice.findFirst({
    where: {
      products: {
        some: {
          productGid: productId,
        },
      },
    },
  });

  if (!customPrice) {
    return null;
  }

  return customPrice;
}

// TODO: only use for details page
export async function getCustomPrice(id, graphql) {
  const customPrice = await db.customPrice.findFirst({
    where: { id },
    include: { products: true, customers: true },
  });
  if (!customPrice) {
    return null;
  }

  return supplementCustomPrice(customPrice, graphql);
}

// TODO: Just showing the first product and if there are many products/customers show [x] more
export async function getCustomPrices(shop, graphql) {
  const customPrices = await db.customPrice.findMany({
    where: { shop },
    orderBy: { id: "desc" },
    include: {
      products: true,
      customers: true,
    },
  });

  if (customPrices.length === 0) {
    return [];
  }

  return Promise.all(
    customPrices.map((customPrice) =>
      supplementCustomPrices(customPrice, graphql)
    )
  );
}

//TODO: using this function to only show on the listing page
async function supplementCustomPrices(customPrice, graphql) {
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
        id: customPrice.products[0].productGid,
        customerId: customPrice.customers[0].customerGid,
      },
    }
  );

  const {
    data: { product, customer },
  } = await response.json();

  return {
    ...customPrice,
    customers: {
      name: customer.name,
      total: customPrice.customers.length,
    },
    products: {
      productDeleted: !product?.title,
      title: product?.title,
      image: product?.images?.nodes?.[0]?.url,
      alt: product?.images?.nodes?.[0]?.altText,
      total: customPrice.products.length,
    },
    createdAt: customPrice.createdAt?.toLocaleDateString("en-GB") || null,
    expiresAt: customPrice.expiresAt?.toLocaleDateString("en-GB") || null,
  };
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
        id: customPrice.products[0].productGid,
        customerId: customPrice.customers[0].customerGid,
      },
    }
  );

  const {
    data: { product, customer },
  } = await response.json();

  return {
    ...customPrice,
    product,
    customer,
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
