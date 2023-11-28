import { Card, Layout, Page, Text, BlockStack, Button } from "@shopify/polaris";
import { useActionData, useSubmit } from "@remix-run/react";
import { json } from "@remix-run/node";

import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function action({ request, params }) {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();

  // const {
  //   title,
  //   method,
  //   code,
  //   combinesWith,
  //   usageLimit,
  //   appliesOncePerCustomer,
  //   startsAt,
  //   endsAt,
  //   configuration,
  // } = JSON.parse(formData.get("discount"));

  // const baseDiscount = {
  //   title,
  //   combinesWith,
  //   startsAt: new Date(startsAt),
  //   endsAt: endsAt && new Date(endsAt),
  // };
  // TODO : refactor to allow creating discount from user input
  const response = await admin.graphql(
    `#graphql
			mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
				discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
					codeDiscountNode {
						codeDiscount {
							... on DiscountCodeBasic {
								title
								codes(first: 10) {
									nodes {
										code
									}
								}
								startsAt
								endsAt
								customerSelection {
									... on DiscountCustomerAll {
										allCustomers
									}
								}
								customerGets {
									value {
										... on DiscountPercentage {
											percentage
										}
									}
									items {
										... on AllDiscountItems {
											allItems
										}
									}
								}
								appliesOncePerCustomer
							}
						}
					}
					userErrors {
						field
						code
						message
					}
				}
				}`,
    {
      variables: {
        basicCodeDiscount: {
          title: "10% off all items during the summer of 2024",
          code: "SUMMER10",
          startsAt: "2022-06-21T00:00:00Z",
          customerSelection: {
            customers: {
              add: ["gid://shopify/Customer/6905513017639"],
            },
          },
          customerGets: {
            value: {
              percentage: 0.1,
            },
            items: {
              products: {
                productsToAdd: ["gid://shopify/Product/8122592428327"],
              },
            },
          },
          appliesOncePerCustomer: true,
        },
      },
    }
  );

  const responseJson = await response.json();
  const errors = responseJson.data.discountCodeBasicCreate?.userErrors;

  // save discount to db
  const discount = {
    shop: shop,
    title: "10% off all items during the summer of 2024",
    code: "SUMMER10",
    amount: 0.1,
    customerTag: "cs_summer_2024",
    isShow: true,
    productVariantId: "8122592428327",
    expiresAt: "2025-06-21T00:00:00Z",
  };

  await db.discount.create({ data: discount });

  return json({ errors }, { status: 422 });
}

export default function DiscountPage() {
  const submitForm = useSubmit();
  const actionData = useActionData();
  console.log(actionData);

  function createDiscount() {
    submitForm({ discount: "test" }, { method: "POST" });
  }
  return (
    <Page>
      <ui-title-bar title="Additional page" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="p" variant="bodyMd">
                Allow customer to get BXGY Discount
              </Text>
              <Button onClick={createDiscount}>Create a discount</Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
