const MESH = 'https://edge-sandbox-graph.adobe.io/api/ff501b39-f0d5-42c3-a61f-2522aea58df7/graphql';

async function mesh(query, variables) {
  const response = await fetch(MESH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (payload.errors) throw new Error(payload.errors[0].message);
  return payload.data;
}

export default async function decorate(block) {
  const sku = block.textContent.trim();
  block.textContent = 'Loading…';

  try {
    const catalog = await mesh(`query ($sku: String!) {
      products(filter: { sku: { eq: $sku } }) {
        items { id sku name image { url } }
      }
    }`, { sku });

    const item = catalog.products?.items?.[0];
    if (!item) {
      block.textContent = `No product found for SKU ${sku}`;
      return;
    }

    const prices = await mesh(`mutation ($input: customerPrices_request_Input!) {
      customerPrices(input: $input) {
        data { item_id unit_price }
      }
    }`, {
      input: {
        customer_id: '105964',
        location_id: '10',
        company_id: 'TECHSPAN',
        products: [{
          product_id: String(item.id),
          item_id: sku,
          uom: 'EA',
          qty: 1,
        }],
      },
    });

    const price = prices.customerPrices?.data?.[0]?.unit_price;
    const image = item.image?.url
      ? `<img src="${item.image.url}" alt="">`
      : '';
    block.innerHTML = `
      ${image}
      <h1>${item.name}</h1>
      <p class="product-price">${price ?? 'Price unavailable'}</p>
    `;
  } catch (error) {
    block.textContent = error.message;
  }
}
