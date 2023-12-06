import { json } from "@remix-run/node";
import { getCustomPricePublic } from "../models/CustomPrice.server";

export async function loader({ params }) {
  const rawId = String(params.id);
  const productId = `gid://shopify/Product/${rawId}`;

  if (!productId) {
    return json({ error: "productId is not available" });
  }

  const discount = await getCustomPricePublic(productId);

  return json(discount, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}
