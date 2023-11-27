import { Card, Layout, Page, Text, BlockStack, Button } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useActionData, useSubmit } from "@remix-run/react";
import { json } from "@remix-run/node";

export async function action({ request, params }) {
  const { admin } = await authenticate.admin(request);
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
			mutation {
					discountAutomaticBxgyCreate(automaticBxgyDiscount: {
						title: "BXGY discount test",
						startsAt: "2022-01-01",
						endsAt: "2024-04-18T02:38:45Z",
						usesPerOrderLimit: "1",
						customerBuys: {
							value: {
								# Accepts quantity or amount
								quantity: "1"
							}
							items: {
								# If you want a customer to get a discount regardless of the item that they
								# specific product.
								products: {
									# Replace this product ID with the ID for a product in your store
									productsToAdd: ["gid://shopify/Product/8122592461095"]
								}
							}
						},
						customerGets: {
							value: {
								discountOnQuantity: {
									quantity: "1",
									effect: {
										percentage: 1.00
									}
								}
							}
							items: {
								# If you want to apply the discount to all items, then use
								products: {
									# Replace this product ID with the ID for a product in your store
									productsToAdd: ["gid://shopify/Product/8122592493863"]
								}
							}
						}}) {
						userErrors {
							field
							message
							code
						}
						automaticDiscountNode {
							id
							automaticDiscount {
								... on DiscountAutomaticBxgy {
									title
									summary
									status
								}
							}
						}
					}
				}`
  );

  const responseJson = await response.json();
  const errors = responseJson.data.discountAutomaticBxgyCreate?.userErrors;

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
