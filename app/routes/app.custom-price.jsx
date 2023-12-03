import { json } from "@remix-run/node";
import { Card, EmptyState, IndexTable, Layout, Page } from "@shopify/polaris";
import { useLoaderData, useNavigate } from "@remix-run/react";

import { getCustomPrices } from "../models/CustomPrice.server";
import { authenticate } from "../shopify.server";
import { useCallback } from "react";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const customPrices = await getCustomPrices(session.shop, admin.graphql);

  return json({ customPrices });
}

const EmptyCustomPriceState = ({ onAction }) => (
  <EmptyState
    heading="Create a Custom Price for your product"
    action={{ content: "Create Custom Price", onAction }}
    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
  >
    <p>Allow B2B / Specific customers to see cheaper price</p>
  </EmptyState>
);

const CustomPriceTable = ({ customPrices }) => (
  <IndexTable
    resourceName={{
      singular: "Custom Price",
      plural: "Custom Prices",
    }}
    itemCount={customPrices.length}
    headings={[
      { title: "Title" },
      { title: "Customer" },
      { title: "Date created" },
      { title: "Expire date" },
    ]}
    selectable={false}
  >
    {customPrices.map((customPrice) => (
      <CustomPriceTableRow key={customPrice.id} customPrice={customPrice} />
    ))}
  </IndexTable>
);

const CustomPriceTableRow = ({ customPrice }) => {
  const { id, title, customer, createdAt, expiresAt } = customPrice;

  return (
    <IndexTable.Row
      id={id}
      key={id}
      url={`/app/custom-prices/${id}`}
      accessibilityLabel={`View details for ${title}`}
    >
      <IndexTable.Cell>{title}</IndexTable.Cell>
      <IndexTable.Cell>{customer}</IndexTable.Cell>
      <IndexTable.Cell>{createdAt}</IndexTable.Cell>
      <IndexTable.Cell>{expiresAt}</IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default function CustomPricePage() {
  const { customPrices } = useLoaderData();
  const navigate = useNavigate();

  return (
    <Page>
      <ui-title-bar title="Custom Prices">
        <button
          variant="primary"
          onClick={() => navigate("/app/custom-prices/new")}
        >
          Create Custom Price
        </button>
      </ui-title-bar>
      <Layout>
        <Layout.Section>
          <Card padding={0}>
            {customPrices.length === 0 ? (
              <EmptyCustomPriceState
                onAction={() => navigate("/app/custom-prices/new")}
              />
            ) : (
              <CustomPriceTable customPrices={customPrices} />
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
