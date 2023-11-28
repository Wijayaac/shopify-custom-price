import { json } from "@remix-run/node";

import { getDiscount } from "../models/Discount.server";

export async function loader({ params }) {
  const productVariantId = String(params.id);

  if (!productVariantId) {
    return json({ error: "productVariantId is not available" });
  }

  const discount = await getDiscount(productVariantId);

  return json(discount, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}
