import { json, redirect } from "@remix-run/node";
import { useState } from "react";
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

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);
  if (params.id === "new") {
    return json({
      title: "",
    });
  }

  const customPrice = await getCustomPrice(Number(params.id), admin.graphql);

  return json(customPrice);
}

export async function action({ request, params }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const data = {
    ...Object.fromEntries(await request.formData()),
    shop,
  };

  if (data.action === "delete") {
    await db.customPrice.delete({ where: { id: Number(params.id) } });
    return redirect("/app/custom-price");
  }
  const errors = validateCustomPrice(data);
  if (errors) {
    return json({ errors }, { status: 422 });
  }

  console.log(data);

  // const customPrice =
  //   params.id === "new"
  //     ? await db.customPrice.create({ data })
  //     : await db.customPrice.update({ where: { id: Number(params.id) }, data });

  // return json({ data });

  return redirect(`/app/custom-prices/new`);
  // return redirect(`/app/custom-prices/${customPrice.id}`);
}

export default function CustomPriceForm() {
  const errors = useActionData()?.errors || {};
  const customPrice = useLoaderData();
  const nav = useNavigate();
  const navigate = useNavigation();
  const submit = useSubmit();
  const [formState, setFormState] = useState(customPrice);
  const [cleanFormState, setCleanFormState] = useState(customPrice);

  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);
  const isSaving =
    nav.state === "submitting" && nav.formData?.get("action") !== "delete";
  const isDeleting =
    nav.state === "submitting" && nav.formData?.get("action") === "delete";

  async function selectProduct() {
    const products = await window.shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: false,
    });

    if (products && products.length > 0) {
      const { images, id, variants, title, handle } = products[0];
      setFormState({
        ...formState,
        productId: id,
        productTitle: title,
        productVariantId: variants[0]?.id,
        productTitle: title,
        productHandle: handle,
        productAlt: images[0]?.altText,
        productImage: images[0]?.originalSrc,
      });
    }
  }

  function handleSave() {
    const data = {
      title: formState.title,
      code: formState.code,
      amount: formState.amount,
      customer: formState.customer,
      isShow: formState.isShow,
      productId: formState.productId || "",
      productVariantId: formState.productVariantId || "",
    };
    setCleanFormState({ ...formState });
    console.log("data", data);
    submit(data, { method: "post" });
  }

  return (
    <Page>
      <ui-title-bar
        title={customPrice?.id ? `Edit ${customPrice.title}` : "New"}
      >
        <button
          variant="breadcrumb"
          onClick={() => navigate("/app/custom-price")}
        >
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
                  value={formState.title}
                  onChange={(title) => setFormState({ ...formState, title })}
                  error={errors.title}
                />
                <Text as="h2" variant="headingLg">
                  Code
                </Text>
                {/* TODO: add generate button for generating unique code */}
                <TextField
                  id="code"
                  helpText="Unique Code for the Custom Price"
                  label="code"
                  labelHidden
                  autoComplete="off"
                  value={formState.code}
                  onChange={(code) => setFormState({ ...formState, code })}
                  error={errors.code}
                />
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
                <TextField
                  id="customer"
                  helpText="if this is empty, it will apply to all customers"
                  label="customer"
                  labelHidden
                  autoComplete="off"
                  value={formState.customer}
                  onChange={(customer) =>
                    setFormState({ ...formState, customer })
                  }
                  error={errors.customer}
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
