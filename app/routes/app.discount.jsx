import {
  Card,
  Layout,
  Page,
  Text,
  BlockStack,
  Button,
  EmptyState,
} from "@shopify/polaris";
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useSubmit,
} from "@remix-run/react";
import { json } from "@remix-run/node";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getDiscounts } from "../models/Discount.server";

import { useEffect, useState } from "react";
import {
  unstable_Picker as Picker,
  useNavigate,
} from "@shopify/app-bridge-react";

export async function loader({ request }) {
  const discounts = await getDiscounts();
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const after = url.searchParams.get("after") || null;
  const searchQuery = url.searchParams.get("searchQuery") || "";
  const response = await admin.graphql(
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
  } = await response.json();
  return json({
    discounts,
    customers,
  });
}

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
  // const response = await admin.graphql(
  //   `#graphql
  // 		mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
  // 			discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
  // 				codeDiscountNode {
  // 					codeDiscount {
  // 						... on DiscountCodeBasic {
  // 							title
  // 							codes(first: 10) {
  // 								nodes {
  // 									code
  // 								}
  // 							}
  // 							startsAt
  // 							endsAt
  // 							customerSelection {
  // 								... on DiscountCustomerAll {
  // 									allCustomers
  // 								}
  // 							}
  // 							customerGets {
  // 								value {
  // 									... on DiscountPercentage {
  // 										percentage
  // 									}
  // 								}
  // 								items {
  // 									... on AllDiscountItems {
  // 										allItems
  // 									}
  // 								}
  // 							}
  // 							appliesOncePerCustomer
  // 						}
  // 					}
  // 				}
  // 				userErrors {
  // 					field
  // 					code
  // 					message
  // 				}
  // 			}
  // 			}`,
  //   {
  //     variables: {
  //       basicCodeDiscount: {
  //         title: "10% off all items during the summer of 2024",
  //         code: "SUMMER15",
  //         startsAt: "2022-06-21T00:00:00Z",
  //         customerSelection: {
  //           customers: {
  //             add: ["gid://shopify/Customer/6905513017639"],
  //           },
  //         },
  //         customerGets: {
  //           appliesOnOneTimePurchase: true,
  //           appliesOnSubscription: true,
  //           value: {
  //             percentage: 0.15,
  //           },
  //           items: {
  //             products: {
  //               productsToAdd: ["gid://shopify/Product/8122592428327"],
  //             },
  //           },
  //         },
  //         appliesOncePerCustomer: true,
  //       },
  //     },
  //   }
  // );

  // const responseJson = await response.json();
  // const errors = responseJson.data.discountCodeBasicCreate?.userErrors;

  // save discount to db
  // const discount = {
  //   shop: shop,
  //   title: "10% off all items during the summer of 2024",
  //   code: "SUMMER10",
  //   amount: 0.1,
  //   customerTag: "cs_summer_2024",
  //   isShow: true,
  //   productVariantId: "8122592428327",
  //   expiresAt: "2025-06-21T00:00:00Z",
  // };

  // await db.discount.create({ data: discount });

  return json({ errors }, { status: 422 });
}

export default function DiscountPage() {
  const submitForm = useSubmit();
  const actionData = useActionData();

  const fetcher = useFetcher();
  const { discounts, customers } = useLoaderData();

  function createDiscount() {
    submitForm({ discount: "test" }, { method: "POST" });
  }

  const fetchCustomers = async () => {
    // submitForm({ customers: "test" }, { method: "POST" });
    setIsOpen(true);
  };

  // main customer eligibility
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  // customers selection
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // customer picker
  const [selectedItems, setSelectedItems] = useState(selectedCustomers);
  const [pickerItems, setPickerItems] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(
    customers?.pageInfo?.hasNextPage
  );
  let customersNode = [];
  const [dataIsLoading, setDataIsLoading] = useState(false);

  // useeffect to fetch next page
  useEffect(() => {
    if (!fetcher.data || fetcher.state === "loading") {
      return;
    }

    if (searchQuery !== "" && fetcher.data) {
      console.log("fetcher search data", fetcher.data);
      const newItems = fetcher.data.customers.edges.map((customer) => {
        return {
          id: customer.node.id,
          name: `${customer.node.displayName}`,
        };
      });
      setPickerItems(newItems);
      setHasNextPage(fetcher.data.customers.pageInfo.hasNextPage);
    } else {
      console.log("fetcher load data", fetcher.data);
      const newItems = fetcher.data.customers.edges.map((customer) => {
        return {
          id: customer.node.id,
          name: `${customer.node.displayName}`,
        };
      });

      setPickerItems((prev) => [...prev, ...newItems]);
      setHasNextPage(fetcher.data.customers.pageInfo.hasNextPage);
    }
    setDataIsLoading(false);
  }, [fetcher.data]);

  function fetchNextPage() {
    // get cursor from the last customers
    setDataIsLoading(true);
    const newCursor = fetcher.data
      ? fetcher.data.customers.edges[fetcher.data.customers.edges.length - 1]
          .cursor
      : customers.edges[customers.edges.length - 1].cursor;

    const query = `?discount&after=${newCursor}`;
    fetcher.load(query);
  }
  function handleSearchChange(value) {
    // if search query is empty, reset picker items
    if (value === "") {
      setPickerItems([]);
    }
    const query = `?discount&searchQuery=${value}`;
    fetcher.load(query);
    setSearchQuery(value);
  }
  useEffect(() => {
    if (customers) {
      customersNode = customers.edges.map((customer) => {
        return {
          id: customer.node.id,
          name: `${customer.node.displayName}`,
        };
      });
      setPickerItems(customersNode);
    }
  }, []);

  useEffect(() => {
    setSelectedItems(selectedCustomers);
    console.log("selected customers", selectedCustomers);
  }, [selectedCustomers]);

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
              <Button onClick={fetchCustomers}>Fetch customers</Button>
              <Button onClick={createDiscount}>Create a discount</Button>
              <Picker
                searchQueryPlaceholder="Search customers"
                primaryActionLabel="Select"
                secondaryActionLabel="Cancel"
                title="Customer Picker"
                open={isOpen}
                items={pickerItems}
                maxSelectable={0}
                searchQuery={searchQuery}
                onCancel={() => {
                  setIsOpen(false);
                  setSearchQuery("");
                }}
                onSelect={({ selectedItems }) => {
                  setIsOpen(false);
                  const newCustomer = selectedItems.map((item) =>
                    pickerItems.find((node) => node.id === item.id)
                  );
                  setSelectedCustomers(newCustomer);
                  setSearchQuery("");
                }}
                onSearch={(options) => {
                  handleSearchChange(options.searchQuery);
                }}
                canLoadMore={hasNextPage}
                onLoadMore={() => {
                  if (hasNextPage) {
                    console.log("load more");
                    fetchNextPage();
                  }
                }}
                emptySearchLabel={{
                  title: "No customers found",
                  description: "Try adjusting your search or filters.",
                  withIllustration: true,
                }}
                loading={dataIsLoading}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
