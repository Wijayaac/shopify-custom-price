// TODO:  Create new route only for editing a single custom price / create a new one
import { json, redirect } from "@remix-run/node";
import { useEffect, useState } from "react";
import {
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import {
  BlockStack,
  Button,
  Card,
  Checkbox,
  InlineError,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  PageActions,
  Text,
  TextField,
  Thumbnail,
} from "@shopify/polaris";
import { ImageMajor } from "@shopify/polaris-icons";

import db from "../db.server";
import { authenticate } from "../shopify.server";
import { validateCustomPrice } from "../models/CustomPrice.server";
import { CustomerSelector } from "../components/CustomerPicker";
import { generateRandomDiscountCode } from "../utils";

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);

  // get all customers
  const url = new URL(request.url);
  const after = url.searchParams.get("after") || null;
  const searchQuery = url.searchParams.get("searchQuery") || "";
  const customerResponse = await admin.graphql(
    `#graphql
		query GetCustomers($first: Int!, $searchQuery: String = "", $after: String) {
			customers(first: $first, query: $searchQuery, sortKey: NAME, after: $after) {
				edges {
					node {
						id
						displayName
						email
					}
					cursor
				}
				pageInfo {
					hasNextPage
				}
			}
		}`,
    {
      variables: {
        first: 10,
        searchQuery: searchQuery,
        after: after,
      },
    }
  );

  const {
    data: { customers },
  } = await customerResponse.json();

  return json({
    customPrice: {
      title: "",
    },
    customers,
  });
}

async function addTags(resource, graphql) {
  const response = await graphql(
    `
      #graphql
      mutation TagsAdd($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) {
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        id: resource.id,
        tags: resource.tags,
      },
    }
  );

  return response;
}

// TODO: add mutation for adding tag to product
// so the toggle price can work
export async function action({ request, params }) {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;

  const formData = await request.formData();
  console.log(formData.entries());
  const data = {
    ...Object.fromEntries(formData.entries()),
    shop,
  };

  const errors = validateCustomPrice(data);
  if (errors) {
    return json({ errors }, { status: 422 });
  }

  const { title, code, amount, customers, isShow, products } = data;

  const customersGid = JSON.parse(customers).map((customer) => ({
    customerGid: customer.id,
  }));

  const productsGid = JSON.parse(products).map((product) => product.productGid);
  // Also add hide_price tag to products if the isShow is false
  const discountInput = await admin.graphql(
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
          title: title,
          code: code,
          startsAt: "2022-06-21T00:00:00Z",
          customerSelection: {
            customers: {
              add: customersGid.map((customer) => customer.customerGid),
            },
          },
          customerGets: {
            appliesOnOneTimePurchase: true,
            appliesOnSubscription: false,
            value: {
              percentage: Number(amount),
            },
            items: {
              products: {
                productsToAdd: productsGid,
              },
            },
          },
          appliesOncePerCustomer: true,
        },
      },
    }
  );

  const discountJson = await discountInput.json();
  const discountErrors = discountJson.data.discountCodeBasicCreate?.userErrors;

  if (discountErrors.length > 0) {
    return json({ discountErrors }, { status: 422 });
  }

  //TODO: add the discount code into customers and products tags
  const resources = [
    ...customersGid.map((customer) => ({
      id: customer.customerGid,
      tags: [code],
    })),
    ...productsGid.map((product) => ({
      id: product,
      tags: [code, isShow ? "show_price" : "hide_price"],
    })),
  ];

  Promise.all(
    resources.map((resource) => {
      addTags(resource, admin.graphql);
    })
  );

  const customPriceData = {
    title,
    code,
    amount: Number(amount),
    isShow: Boolean(isShow),
    shop,
    customers: {
      create: customersGid,
    },
    products: {
      create: JSON.parse(products),
    },
  };

  const customPrice = await db.customPrice.create({ data: customPriceData });

  return redirect(`/app/custom-prices/${customPrice.id}`);
}

export default function CustomPriceForm() {
  const errors = useActionData()?.errors || {};
  const { customPrice, customers } = useLoaderData();
  const nav = useNavigate();
  const submit = useSubmit();
  const [formState, setFormState] = useState(customPrice);
  const [cleanFormState, setCleanFormState] = useState(customPrice);
  const [selectedCustomers, setSelectedCustomers] = useState([]);

  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);
  const isSaving =
    nav.state === "submitting" && nav.formData?.get("action") !== "delete";
  const isDeleting =
    nav.state === "submitting" && nav.formData?.get("action") === "delete";

  // TODO: add ability to select multiple products
  async function selectProduct() {
    const products = await window.shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: true,
    });

    if (products && products.length > 0) {
      const selectedProducts = products.map((product) => {
        const { images, id, variants, title, handle } = product;
        return {
          id,
          title,
          variantId: variants[0]?.id,
          handle,
          image: images[0]?.originalSrc,
          imageAlt: images[0]?.altText,
        };
      });
      setFormState({
        ...formState,
        selectedProducts: selectedProducts,
      });
    }
  }

  function handleSave() {
    const productsRaw = formState.selectedProducts.map((product) => ({
      productGid: product.productId,
      variantGid: product.productVariantId,
    }));
    const data = {
      title: formState.title,
      code: formState.code,
      amount: formState.amount / 100,
      customers: JSON.stringify(selectedCustomers),
      isShow: formState.isShow || false,
      products: JSON.stringify(productsRaw),
    };
    setCleanFormState({ ...formState });
    console.log(data, "data");
    submit(data, { method: "post" });
  }

  return (
    <Page>
      <ui-title-bar title="New">
        <button variant="breadcrumb" onClick={() => nav("/app/custom-price")}>
          Custom Prices
        </button>
      </ui-title-bar>
      <Layout>
        <Layout.Section>
          <BlockStack gap={500}>
            <Card>
              <BlockStack gap={500}>
                <Text as="h2" variant="headingLg">
                  Title
                </Text>
                <TextField
                  id="title"
                  helpText="Only store staff can see this title"
                  label="title"
                  labelHidden
                  autoComplete="off"
                  value={formState?.title}
                  onChange={(title) => setFormState({ ...formState, title })}
                  error={errors.title}
                />
                <Text as="h2" variant="headingLg">
                  Code
                </Text>
                <Text as="span" variant="bodySm">
                  Please use a unique code for the Custom Price
                </Text>
                <InlineGrid columns={["twoThirds", "oneThird"]} gap={400}>
                  <TextField
                    id="code"
                    label="code"
                    labelHidden
                    autoComplete="off"
                    value={formState.code}
                    onChange={(code) => setFormState({ ...formState, code })}
                    error={errors.code}
                  />
                  <Button
                    onClick={() =>
                      setFormState({
                        ...formState,
                        code: generateRandomDiscountCode(),
                      })
                    }
                  >
                    Generate Code
                  </Button>
                </InlineGrid>
                <Text as="h2" variant="headingLg">
                  Amount (in percentage)
                </Text>
                <TextField
                  id="amount"
                  helpText="Decrement amount for the Custom Price"
                  label="amount"
                  labelHidden
                  max={100}
                  min={1}
                  type="number"
                  autoComplete="off"
                  value={formState.amount}
                  onChange={(amount) => {
                    if (amount > 100 || amount < 1) {
                      return;
                    } else {
                      setFormState({ ...formState, amount });
                    }
                  }}
                  error={errors.amount}
                />
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap={500}>
                <Text as="h2" variant="headingLg">
                  Customer
                </Text>
                <CustomerSelector
                  customers={customers}
                  setCustomers={setSelectedCustomers}
                />
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap={500}>
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingLg">
                    Product
                  </Text>
                  {formState.selectedProducts && (
                    <Button variant="plain" onClick={selectProduct}>
                      Change product
                    </Button>
                  )}
                </InlineStack>
                {formState.selectedProducts ? (
                  // <InlineStack blockAlign="center" gap="500">
                  formState.selectedProducts.map(
                    (product) => (
                      <InlineStack blockAlign="center" gap="1000">
                        <Thumbnail
                          size="small"
                          source={product.image || ImageMajor}
                          alt={product.imageAlt}
                        />
                        <Text
                          as="span"
                          variant="headingMd"
                          fontWeight="semibold"
                        >
                          {product.title}
                        </Text>
                      </InlineStack>
                    )
                    // </InlineStack>
                  )
                ) : (
                  <BlockStack gap="200">
                    <Button onClick={selectProduct} id="select-product">
                      Select product
                    </Button>
                    {errors.productId ? (
                      <InlineError
                        message={errors.productId}
                        fieldID="myFieldID"
                      />
                    ) : null}
                  </BlockStack>
                )}
                <Checkbox
                  id="isShow"
                  helpText="by default the Custom Price will hide the product price. Check this to show the product price"
                  label="Show the product price"
                  autoComplete="off"
                  checked={formState.isShow}
                  onChange={(isShow) => setFormState({ ...formState, isShow })}
                  error={errors.isShow}
                />
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
        <Layout.Section>
          <PageActions
            primaryAction={{
              content: "Save",
              loading: isSaving,
              disabled: !isDirty || isSaving || isDeleting,
              onAction: handleSave,
            }}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
