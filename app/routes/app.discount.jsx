import { Card, Layout, Page } from "@shopify/polaris";

export default function DiscountPage() {
  return (
    <Page>
      <ui-title-bar title="Discount Page" />
      <Layout>
        <Layout.Section>
          <Card>
            <h1>This is discount page</h1>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
