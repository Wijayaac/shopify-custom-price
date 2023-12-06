import { useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
import { unstable_Picker as Picker } from "@shopify/app-bridge-react";
import { Button } from "@shopify/polaris";

export function CustomerSelector({
  customers,
  currentCustomers,
  setCustomers,
}) {
  const fetcher = useFetcher();
  // main customer eligibility
  const [selectedCustomers, setSelectedCustomers] = useState([
    currentCustomers,
  ]);
  // customers selection
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // customer picker
  const [pickerItems, setPickerItems] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(
    customers?.pageInfo?.hasNextPage
  );
  const [dataIsLoading, setDataIsLoading] = useState(false);

  // useeffect to fetch next page
  useEffect(() => {
    if (!fetcher.data || fetcher.state === "loading") {
      return;
    }

    if (searchQuery !== "" && fetcher.data) {
      const newItems = fetcher.data.customers.edges.map((customer) => {
        return {
          id: customer.node.id,
          name: `${customer.node.displayName}`,
        };
      });
      setPickerItems(newItems);
      setHasNextPage(fetcher.data.customers.pageInfo.hasNextPage);
    } else {
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
  function fetchCustomers() {
    setIsOpen(true);
  }

  useEffect(() => {
    if (customers) {
      const customersNode = customers.edges.map((customer) => {
        return {
          id: customer.node.id,
          name: `${customer.node.displayName}`,
        };
      });
      setPickerItems(customersNode);
    }
  }, []);

  return (
    <>
      <Button onClick={fetchCustomers}>Fetch customer</Button>
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
          setCustomers(newCustomer);
          setSelectedCustomers(newCustomer);
          setSearchQuery("");
        }}
        onSearch={(options) => {
          handleSearchChange(options.searchQuery);
        }}
        canLoadMore={hasNextPage}
        onLoadMore={() => {
          if (hasNextPage) {
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
      {selectedCustomers.map((customer) => (
        <p key={customer.id}>{customer.name}</p>
      ))}
    </>
  );
}
