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

import db from "../db.server";
import { authenticate } from "../shopify.server";
import {
  getCustomPrice,
  validateCustomPrice,
} from "../models/CustomPrice.server";
import { CustomerSelector } from "../components/CustomerPicker";

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

  if (params.id === "new") {
    return json({
      customPrice: {
        title: "",
      },
      customer: {},
      customers,
    });
  }

  const customPrice = await getCustomPrice(Number(params.id), admin.graphql);
  customPrice.amount = customPrice.amount * 100;
  const customerRaw = await admin.graphql(
    `#graphql
		query GetCustomer($id: ID!) {
			customer(id: $id) {
				id
				name: displayName
			}
		}`,
    {
      variables: {
        id: customPrice.customerTag,
      },
    }
  );
  const customer = await customerRaw.json();

  return json({ customPrice, customers, customer: customer.data.customer });
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

  // TODO: add delete mutation
  if (data.action === "delete") {
    await db.customPrice.delete({ where: { id: Number(params.id) } });
    return redirect("/app/custom-price");
  }
  const errors = validateCustomPrice(data);
  if (errors) {
    return json({ errors }, { status: 422 });
  }

  const { title, code, amount, customers, isShow, products } = data;

  const customersGids = JSON.parse(customers).map((customer) => ({
    customerGid: customer.id,
  }));

  const productsGids = JSON.parse(products).map(
    (product) => product.productGid
  );

  console.log(productsGids);

  // TODO : update mutation to handle update discount
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
              add: customersGids.map((customer) => customer.customerGid),
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
                productsToAdd: productsGids,
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

  if (discountErrors) {
    return json({ discountErrors }, { status: 422 });
  }

  const customPriceData = {
    title,
    code,
    amount: Number(amount),
    isShow: Boolean(isShow),
    shop,
    customers: {
      create: customersGids,
    },
    products: {
      create: JSON.parse(rawProducts),
    },
  };

  const customPrice =
    params.id === "new"
      ? await db.customPrice.create({ data: customPriceData })
      : await db.customPrice.update({
          where: { id: Number(params.id) },
          data: customPriceData,
        });

  return redirect(`/app/custom-prices/${customPrice.id}`);
}

export default function CustomPriceForm() {
  const errors = useActionData()?.errors || {};
  const { customPrice, customers, customer } = useLoaderData();
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
          productId: id,
          productTitle: title,
          productVariantId: variants[0]?.id,
          productHandle: handle,
          productAlt: images[0]?.altText,
          productImage: images[0]?.originalSrc,
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

  function generateRandomDiscountCode() {
    const length = 8;
    const chars =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = length; i > 0; --i)
      result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  }

  return (
    <Page>
      <ui-title-bar
        title={customPrice?.id ? `Edit ${customPrice.title}` : "New"}
      >
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
                  currentCustomers={customer}
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
                  {formState.productId && (
                    <Button variant="plain" onClick={selectProduct}>
                      Change product
                    </Button>
                  )}
                </InlineStack>
                {formState.productId ? (
                  <InlineStack blockAlign="center" gap="500">
                    <Thumbnail
                      source={formState.productImage || ImageMajor}
                      alt={formState.productAlt}
                    />
                    <Text as="span" variant="headingMd" fontWeight="semibold">
                      {formState.productTitle}
                    </Text>
                  </InlineStack>
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
                <Text as="h2" variant="headingLg">
                  Hide Product Price
                </Text>
                <Checkbox
                  id="isShow"
                  helpText="Option to hide the product price for all visitors"
                  label="Hide the product price"
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
            secondaryActions={[
              {
                content: "Delete",
                loading: isDeleting,
                disabled:
                  !customPrice.id || !customPrice || isSaving || isDeleting,
                destructive: true,
                outline: true,
                onAction: () =>
                  submit({ action: "delete" }, { method: "post" }),
              },
            ]}
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
