
const domain = 'jes-15895.myshopify.com';
const storefrontAccessToken = '03164ed9a8acb028afb9b3185bc2603c';

async function shopifyFetch({ query, variables }) {
    const endpoint = `https://${domain}/api/2024-01/graphql.json`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
        },
        body: JSON.stringify({ query, variables }),
    });
    return await response.json();
}

async function getAllProducts() {
    const query = `
    query getProducts($first: Int) {
      products(first: $first) {
        edges {
          node {
            title
            handle
            productType
            tags
          }
        }
      }
    }
  `;
    const response = await shopifyFetch({ query, variables: { first: 250 } });
    const products = response.data.products.edges.map(e => e.node);
    console.log(JSON.stringify(products, null, 2));
}

getAllProducts();
