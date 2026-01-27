const domain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
const storefrontAccessToken = import.meta.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

if (!domain || !storefrontAccessToken) {
  console.error('CRITICAL: Shopify environment variables are missing!', {
    domain: domain ? 'Defined' : 'UNDEFINED',
    token: storefrontAccessToken ? 'Defined' : 'UNDEFINED'
  });
}

async function shopifyFetch({ query, variables }) {
  if (!domain) return null;
  const endpoint = `https://${domain}/api/2024-01/graphql.json`;


  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching from Shopify:', error);
    return null;
  }
}

export async function getProducts(limit = 50) {
  const productsQuery = `
    query getProducts($first: Int) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            description
            productType
            tags
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `;

  const response = await shopifyFetch({ query: productsQuery, variables: { first: limit } });

  if (!response || !response.data) return [];

  return response.data.products.edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    handle: node.handle,
    description: node.description,
    type: node.productType,
    tags: node.tags,
    image: node.images.edges[0]?.node.url || null,
    price: `$${parseFloat(node.priceRange.minVariantPrice.amount).toLocaleString()}`,
  }));
}

export async function getCollectionProducts(collectionHandle) {
  const collectionQuery = `
    query getCollectionProducts($handle: String!) {
      collection(handle: $handle) {
        products(first: 20) {
          edges {
            node {
              id
              title
              handle
              description
              productType
              tags
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await shopifyFetch({
    query: collectionQuery,
    variables: { handle: collectionHandle }
  });

  if (!response || !response.data || !response.data.collection) return [];

  return response.data.collection.products.edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    handle: node.handle,
    description: node.description,
    type: node.productType,
    tags: node.tags,
    image: node.images.edges[0]?.node.url || null,
    price: `$${parseFloat(node.priceRange.minVariantPrice.amount).toLocaleString()}`,
  }));
}

export async function getProductByHandle(handle) {
  const productQuery = `
    query getProductByHandle($handle: String!) {
      product(handle: $handle) {
        id
        title
        handle
        description
        descriptionHtml
        productType
        tags
        images(first: 5) {
          edges {
            node {
              url
              altText
            }
          }
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              availableForSale
              price {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `;

  const response = await shopifyFetch({
    query: productQuery,
    variables: { handle }
  });

  if (!response || !response.data || !response.data.product) return null;

  const product = response.data.product;

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    description: product.description,
    descriptionHtml: product.descriptionHtml,
    type: product.productType,
    tags: product.tags,
    images: product.images.edges.map(edge => edge.node.url),
    price: `$${parseFloat(product.priceRange.minVariantPrice.amount).toLocaleString()}`,
    variants: product.variants.edges.map(edge => edge.node),
  };
}
export async function getProductsByHandles(handles) {
  if (!handles || handles.length === 0) return [];

  const queryFilter = handles.map(h => `handle:${h}`).join(' OR ');

  const productsQuery = `
    query getProducts($query: String!) {
      products(first: 50, query: $query) {
        edges {
          node {
            id
            title
            handle
            description
            productType
            tags
            images(first: 1) {
              edges {
                node {
                  url
                }
              }
            }
            priceRange {
              minVariantPrice {
                amount
              }
            }
          }
        }
      }
    }
  `;

  const response = await shopifyFetch({
    query: productsQuery,
    variables: { query: queryFilter }
  });

  if (!response || !response.data) return [];

  return response.data.products.edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    handle: node.handle,
    description: node.description,
    type: node.productType,
    tags: node.tags,
    image: node.images.edges[0]?.node.url || null,
    price: `$${parseFloat(node.priceRange.minVariantPrice.amount).toLocaleString()}`,
  }));
}

export async function getRelatedProducts(type, limit = 8) {
  if (!type) {
    const all = await getProducts(limit);
    return all.sort(() => 0.5 - Math.random()).slice(0, limit);
  }

  const query = `product_type:'${type}'`;
  const productsQuery = `
    query getRelated($first: Int, $query: String) {
      products(first: $first, query: $query) {
        edges {
          node {
            id
            title
            handle
            description
            productType
            tags
            images(first: 1) {
              edges {
                node {
                  url
                }
              }
            }
            priceRange {
              minVariantPrice {
                amount
              }
            }
          }
        }
      }
    }
  `;

  const response = await shopifyFetch({
    query: productsQuery,
    variables: { first: limit, query }
  });

  if (!response?.data?.products?.edges) {
    return await getProducts(limit);
  }

  return response.data.products.edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    handle: node.handle,
    description: node.description,
    type: node.productType,
    tags: node.tags,
    image: node.images.edges[0]?.node.url || null,
    price: `$${parseFloat(node.priceRange.minVariantPrice.amount).toLocaleString()}`,
  }));
}

/**
 * Get product variant ID for checkout (needs variantId for cart)
 */
export async function getProductVariantId(handle) {
  const productQuery = `
    query getProductVariant($handle: String!) {
      product(handle: $handle) {
        id
        title
        handle
        variants(first: 1) {
          edges {
            node {
              id
              title
              availableForSale
              price {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `;

  const response = await shopifyFetch({
    query: productQuery,
    variables: { handle }
  });

  if (!response?.data?.product?.variants?.edges?.[0]) return null;

  const variant = response.data.product.variants.edges[0].node;
  return {
    productId: response.data.product.id,
    variantId: variant.id,
    title: response.data.product.title,
    available: variant.availableForSale,
    price: variant.price
  };
}

/**
 * Create a Shopify cart and get checkout URL
 * @param {Array} items - Array of {variantId, quantity} objects
 * @returns {Object} - { cartId, checkoutUrl }
 */
export async function createShopifyCheckout(items) {
  if (!items || items.length === 0) {
    console.error('No items provided for checkout');
    return null;
  }

  const cartCreateMutation = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const lines = items.map(item => ({
    merchandiseId: item.variantId,
    quantity: item.quantity
  }));

  const response = await shopifyFetch({
    query: cartCreateMutation,
    variables: {
      input: { lines }
    }
  });

  if (!response?.data?.cartCreate?.cart) {
    console.error('Failed to create Shopify cart:', response?.data?.cartCreate?.userErrors);
    return null;
  }

  const cart = response.data.cartCreate.cart;
  return {
    cartId: cart.id,
    checkoutUrl: cart.checkoutUrl,
    totalQuantity: cart.totalQuantity,
    totalAmount: cart.cost.totalAmount
  };
}

/**
 * Create checkout for a single product (used for donations)
 * @param {string} handle - Product handle
 * @param {number} quantity - Quantity (default 1)
 * @returns {string|null} - Checkout URL or null
 */
export async function createProductCheckout(handle, quantity = 1) {
  const variant = await getProductVariantId(handle);
  if (!variant) {
    console.error('Could not find product variant for:', handle);
    return null;
  }

  const checkout = await createShopifyCheckout([{
    variantId: variant.variantId,
    quantity
  }]);

  return checkout?.checkoutUrl || null;
}
