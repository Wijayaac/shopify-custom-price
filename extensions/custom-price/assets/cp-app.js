function addDiscountBadge(amount) {
  const priceContainer = document.querySelector(".price__container");

  const discountBadge = document.createElement("div");
  const discountPercentage = amount * 100;
  discountBadge.classList.add("discount-badge");
  discountBadge.innerHTML = `Decrement : ${discountPercentage}%`;

  const currentPriceDirty = document
    .querySelector("[data-product-id]")
    .getAttribute("data-current-price");
  const currentPrice = parseInt(currentPriceDirty.replace(/[^0-9]/g, ""));
  const newPriceElm = document.createElement("span");
  newPriceElm.classList.add("price-cp");
  // calculate new price after discount
  const newPrice = currentPrice - currentPrice * amount;

  const currency = Intl.NumberFormat(`${Shopify.locale}-${Shopify.country}`, {
    style: "currency",
    currency: Shopify.currency.active,
  });
  newPriceElm.innerHTML = `Custom Price : ${currency.format(newPrice)} ${
    Shopify.currency.active
  }`;

  priceContainer.appendChild(discountBadge);
  priceContainer.appendChild(newPriceElm);
}

function assignDiscountToCookie(discountCode) {
  document.cookie = `discount_code=${discountCode}; path=/`;
}

async function fetchProductDiscount() {
  const productId = document
    .querySelector("[data-product-id]")
    .getAttribute("data-product-id");
  // todo: change baseURL to absolute live or staging url
  const baseURL =
    "https://bearing-cups-stationery-equilibrium.trycloudflare.com/custom-price";
  try {
    const response = await fetch(`${baseURL}/${productId}`);
    const responseJson = await response.json();
    if (responseJson) {
      addDiscountBadge(responseJson.amount);
      assignDiscountToCookie(responseJson.code);
    }
  } catch (error) {
    console.error(error);
  }
}

fetchProductDiscount();
