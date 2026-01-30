module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/src/services/supabase.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getProfileWithWishlist",
    ()=>getProfileWithWishlist,
    "getPublicProfiles",
    ()=>getPublicProfiles,
    "supabase",
    ()=>supabase,
    "updateProfile",
    ()=>updateProfile
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-ssr] (ecmascript) <locals>");
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://qyvxmmjmxwgjnxyvnqel.supabase.co") || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5dnhtbWpteHdnam54eXZucWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzODY2NjcsImV4cCI6MjA4Mzk2MjY2N30.e1EtSI9CVuy7OJiD_lFcSnVqrUu4lhZAo8LdsTpDUSY") || process.env.VITE_SUPABASE_ANON_KEY;
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseAnonKey);
async function updateProfile(userId, updates) {
    try {
        const { error } = await supabase.from('profiles').upsert({
            id: userId,
            ...updates,
            updated_at: new Date().toISOString()
        });
        if (error) throw error;
        return {
            success: true
        };
    } catch (error) {
        console.error('Error updating profile:', error);
        return {
            error
        };
    }
}
async function getPublicProfiles(limit = 20) {
    try {
        const { data, error } = await supabase.from('profiles').select('*').limit(limit).order('updated_at', {
            ascending: false
        });
        if (error) throw error;
        return data || [];
    } catch (error) {
        if (error.code === 'PGRST116' || error.message?.includes('not found')) {
            console.warn('Profiles table not found. Please run the SQL setup script.');
        } else {
            console.error('Error fetching public profiles:', error);
        }
        return [];
    }
}
async function getProfileWithWishlist(userId) {
    try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
}
}),
"[project]/src/services/shopify.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createProductCheckout",
    ()=>createProductCheckout,
    "createShopifyCheckout",
    ()=>createShopifyCheckout,
    "getCollectionProducts",
    ()=>getCollectionProducts,
    "getProductByHandle",
    ()=>getProductByHandle,
    "getProductVariantId",
    ()=>getProductVariantId,
    "getProducts",
    ()=>getProducts,
    "getProductsByHandles",
    ()=>getProductsByHandles,
    "getRelatedProducts",
    ()=>getRelatedProducts
]);
const domain = ("TURBOPACK compile-time value", "jes-15895.myshopify.com") || process.env.VITE_SHOPIFY_STORE_DOMAIN;
const storefrontAccessToken = ("TURBOPACK compile-time value", "03164ed9a8acb028afb9b3185bc2603c") || process.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
async function shopifyFetch({ query, variables }) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const endpoint = `https://${domain}/api/2024-01/graphql.json`;
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': storefrontAccessToken
            },
            body: JSON.stringify({
                query,
                variables
            })
        });
        if (!response.ok) {
            throw new Error(`Shopify API error: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('❌ Error fetching from Shopify:', error);
        return null;
    }
}
async function getProducts(limit = 50) {
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
    const response = await shopifyFetch({
        query: productsQuery,
        variables: {
            first: limit
        }
    });
    console.log('🔍 Shopify full response:', JSON.stringify(response, null, 2));
    if (!response || !response.data) {
        console.error('❌ Shopify response empty or invalid:', response);
        return [];
    }
    console.log('✅ Fetched products edges:', response.data.products.edges.length);
    return response.data.products.edges.map(({ node })=>({
            id: node.id,
            title: node.title,
            handle: node.handle,
            description: node.description,
            type: node.productType,
            tags: node.tags,
            image: node.images.edges[0]?.node.url || null,
            price: `$${parseFloat(node.priceRange.minVariantPrice.amount).toLocaleString()}`
        }));
}
async function getCollectionProducts(collectionHandle) {
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
        variables: {
            handle: collectionHandle
        }
    });
    if (!response || !response.data || !response.data.collection) return [];
    return response.data.collection.products.edges.map(({ node })=>({
            id: node.id,
            title: node.title,
            handle: node.handle,
            description: node.description,
            type: node.productType,
            tags: node.tags,
            image: node.images.edges[0]?.node.url || null,
            price: `$${parseFloat(node.priceRange.minVariantPrice.amount).toLocaleString()}`
        }));
}
async function getProductByHandle(handle) {
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
        variables: {
            handle
        }
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
        images: product.images.edges.map((edge)=>edge.node.url),
        price: `$${parseFloat(product.priceRange.minVariantPrice.amount).toLocaleString()}`,
        variants: product.variants.edges.map((edge)=>edge.node)
    };
}
async function getProductsByHandles(handles) {
    if (!handles || handles.length === 0) return [];
    const queryFilter = handles.map((h)=>`handle:${h}`).join(' OR ');
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
        variables: {
            query: queryFilter
        }
    });
    if (!response || !response.data) return [];
    return response.data.products.edges.map(({ node })=>({
            id: node.id,
            title: node.title,
            handle: node.handle,
            description: node.description,
            type: node.productType,
            tags: node.tags,
            image: node.images.edges[0]?.node.url || null,
            price: `$${parseFloat(node.priceRange.minVariantPrice.amount).toLocaleString()}`
        }));
}
async function getRelatedProducts(type, limit = 8) {
    if (!type) {
        const all = await getProducts(limit);
        return all.sort(()=>0.5 - Math.random()).slice(0, limit);
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
        variables: {
            first: limit,
            query
        }
    });
    if (!response?.data?.products?.edges) {
        return await getProducts(limit);
    }
    return response.data.products.edges.map(({ node })=>({
            id: node.id,
            title: node.title,
            handle: node.handle,
            description: node.description,
            type: node.productType,
            tags: node.tags,
            image: node.images.edges[0]?.node.url || null,
            price: `$${parseFloat(node.priceRange.minVariantPrice.amount).toLocaleString()}`
        }));
}
async function getProductVariantId(handle) {
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
        variables: {
            handle
        }
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
async function createShopifyCheckout(items) {
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
    const lines = items.map((item)=>({
            merchandiseId: item.variantId,
            quantity: item.quantity
        }));
    const response = await shopifyFetch({
        query: cartCreateMutation,
        variables: {
            input: {
                lines
            }
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
async function createProductCheckout(handle, quantity = 1) {
    const variant = await getProductVariantId(handle);
    if (!variant) {
        console.error('Could not find product variant for:', handle);
        return null;
    }
    const checkout = await createShopifyCheckout([
        {
            variantId: variant.variantId,
            quantity
        }
    ]);
    return checkout?.checkoutUrl || null;
}
}),
"[project]/src/context/WishlistContext.jsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "WishlistProvider",
    ()=>WishlistProvider,
    "useWishlist",
    ()=>useWishlist
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/supabase.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$shopify$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/shopify.js [app-ssr] (ecmascript)");
;
;
;
;
const WishlistContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])();
function WishlistProvider({ children }) {
    const isFetchingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const [wishlist, setWishlist] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [userProfile, setUserProfile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        name: 'Usuario',
        avatar: '👤',
        bio: '',
        avatar_url: null
    });
    const [isLoggedIn, setIsLoggedIn] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [session, setSession] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [socialLoading, setSocialLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({}); // { [userId]: boolean }
    const [following, setFollowing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [followRequests, setFollowRequests] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [sentFollowRequests, setSentFollowRequests] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [orders, setOrders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [friends, setFriends] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    // Initial Auth listener
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        let isMounted = true;
        const initAuth = async ()=>{
            // Safety timeout - increased to 15s for stability
            const loadingTimeout = setTimeout(()=>{
                if (isMounted) {
                    console.warn('⚠️ Auth loading timeout - forcing completion after 15s');
                    setLoading(false);
                }
            }, 15000);
            try {
                // UX: Track last visit
                localStorage.setItem('jes_last_visit', new Date().toISOString());
                const { data: { session: initialSession }, error: sessionError } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
                if (sessionError) throw sessionError;
                if (!isMounted) return;
                console.log('🔐 Initial session:', initialSession ? 'found' : 'none');
                setSession(initialSession);
                setIsLoggedIn(!!initialSession);
                if (initialSession) {
                    await fetchUserData(initialSession.user);
                }
            } catch (err) {
                console.error('Error during initial auth check:', err);
            } finally{
                clearTimeout(loadingTimeout);
                if (isMounted) setLoading(false);
            }
        };
        initAuth();
        const { data: { subscription } } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.onAuthStateChange(async (_event, newSession)=>{
            if (!isMounted) return;
            console.log('🔄 Auth state changed:', newSession ? 'logged in' : 'logged out');
            setSession(newSession);
            setIsLoggedIn(!!newSession);
            if (newSession) {
                await fetchUserData(newSession.user);
            } else {
                setWishlist([]);
                setUserProfile({
                    name: 'Usuario',
                    avatar: '👤',
                    bio: ''
                });
                setLoading(false);
            }
        });
        return ()=>{
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!isLoggedIn || !session?.user?.id) return;
        // Real-time listener for friendships
        const channel = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].channel('realtime:friendships').on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'friendships'
        }, async (payload)=>{
            console.log('Friendship change detected:', payload);
            const { user_id, friend_id } = payload.new || payload.old || {};
            // If the user is involved in this friendship change, refresh
            if (user_id === session.user.id || friend_id === session.user.id) {
                console.log('Relevant friendship change for current user, refreshing...');
                await fetchUserData(session.user);
            }
        }).subscribe();
        return ()=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].removeChannel(channel);
        };
    }, [
        isLoggedIn,
        session?.user?.id
    ]);
    async function fetchUserData(user) {
        if (!user || isFetchingRef.current) return;
        isFetchingRef.current = true;
        // Solo mostrar loading si es la primera carga o no hay perfil
        if (!userProfile?.id || !isLoggedIn) setLoading(true);
        try {
            // 1. Fetch Profile First
            const { data: pData, error: pError } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('profiles').select('*').eq('id', user.id).maybeSingle();
            if (pError) console.warn('Error fetching profile:', pError);
            if (pData) {
                setUserProfile({
                    ...pData,
                    id: pData.id,
                    avatar: pData.avatar_url || '🌴',
                    bio: pData.bio || ''
                });
            } else {
                // ... logic to create profile if it doesn't exist
                const newProfile = {
                    id: user.id,
                    name: user.email?.split('@')[0] || 'Usuario',
                    avatar_url: null,
                    bio: '',
                    updated_at: new Date().toISOString()
                };
                const { data: created, error: iError } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('profiles').insert(newProfile).select().maybeSingle();
                if (iError) console.error('Error creating profile:', iError);
                if (created) {
                    setUserProfile({
                        ...created,
                        id: created.id,
                        avatar: '🌴',
                        bio: ''
                    });
                } else {
                    // Fallback if insert failed but we have a user
                    setUserProfile({
                        id: user.id,
                        name: user.email?.split('@')[0] || 'Usuario',
                        avatar: '👤',
                        bio: ''
                    });
                }
            }
            // 2. Fetch the rest in parallel
            await Promise.allSettled([
                fetchWishlist(user.id),
                fetchFriendships(user.id),
                fetchOrders(user.id)
            ]);
        } catch (err) {
            console.error('Error hydrating user data:', err);
        } finally{
            setLoading(false);
            isFetchingRef.current = false;
        }
    }
    async function fetchWishlist(userId) {
        try {
            const { data: items, error: wError } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('wishlist_items').select('*').eq('user_id', userId);
            if (wError) throw wError;
            if (items && items.length > 0) {
                const handles = [
                    ...new Set(items.map((i)=>i.product_handle))
                ].filter(Boolean);
                try {
                    const products = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$shopify$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getProductsByHandles"])(handles);
                    const enriched = items.map((dbItem)=>{
                        const shopifyProduct = products.find((p)=>p.handle === dbItem.product_handle);
                        return shopifyProduct ? {
                            ...shopifyProduct,
                            isPrivate: dbItem.is_private,
                            db_id: dbItem.id
                        } : {
                            id: `missing-${dbItem.product_handle}`,
                            handle: dbItem.product_handle,
                            title: `Producto no disponible`,
                            price: '---',
                            isPrivate: dbItem.is_private,
                            db_id: dbItem.id
                        };
                    });
                    setWishlist(enriched);
                } catch (err) {
                    console.error('Shopify fetch error:', err);
                }
            } else {
                setWishlist([]);
            }
        } catch (err) {
            if (err.code === 'PGRST116' || err.status === 404) {
                console.warn('Tabla wishlist_items no encontrada.');
            } else {
                console.error('Error fetching wishlist:', err);
            }
        }
    }
    async function fetchFriendships(userId) {
        try {
            const { data: relationshipData, error: fError } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('friendships').select('*').or(`user_id.eq.${userId},friend_id.eq.${userId}`);
            if (fError) throw fError;
            if (relationshipData) {
                const accepted = relationshipData.filter((r)=>r.status === 'accepted');
                const friendIds = accepted.map((f)=>f.user_id === userId ? f.friend_id : f.user_id);
                setFollowing(friendIds);
                if (friendIds.length > 0) {
                    const { data: fullFriendProfiles } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('profiles').select('*').in('id', friendIds);
                    if (fullFriendProfiles) setFriends(fullFriendProfiles);
                }
                const incoming = relationshipData.filter((r)=>r.friend_id === userId && r.status === 'pending');
                setFollowRequests(incoming);
                const outgoing = relationshipData.filter((r)=>r.user_id === userId && r.status === 'pending');
                setSentFollowRequests(outgoing.map((r)=>r.friend_id));
            }
        } catch (err) {
            console.warn('Error fetching friendships (check if table exists):', err.message);
        }
    }
    async function fetchOrders(userId) {
        try {
            const { data: oData, error: oError } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('orders').select('*').eq('user_id', userId).order('created_at', {
                ascending: false
            });
            if (oError) throw oError;
            if (oData) setOrders(oData);
        } catch (err) {
            console.warn('Error fetching orders (check if table exists):', err.message);
        }
    }
    const login = async ({ email, password })=>{
        if (password) {
            const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.signInWithOtp({
                email
            });
            if (error) throw error;
            return data;
        }
    };
    const signUp = async ({ email, password })=>{
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: email.split('@')[0]
                },
                emailRedirectTo: window.location.origin + '/profile'
            }
        });
        if (error) {
            if (error.message.includes('already registered')) {
                throw new Error('Este correo ya está registrado. Intenta iniciar sesión.');
            }
            throw error;
        }
        // Manual check for session if email confirmation is disabled/enabled
        if (data.user && !data.session) {
            // This happens when email confirmation is enabled in Supabase
            return {
                ...data,
                needsConfirmation: true
            };
        }
        return data;
    };
    const loginWithGoogle = async ()=>{
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/profile'
            }
        });
        if (error) throw error;
    };
    const resetPassword = async (email)=>{
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/profile'
        });
        if (error) throw error;
    };
    const logout = async ()=>{
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.signOut();
    };
    const addToWishlist = async (product, isPrivate = false)=>{
        if (!isLoggedIn) return;
        // Optimistic UI
        setWishlist((prev)=>[
                ...prev,
                {
                    ...product,
                    isPrivate
                }
            ]);
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('wishlist_items').insert({
            user_id: session.user.id,
            product_handle: product.handle,
            is_private: isPrivate
        });
        if (error) {
            console.error('Error adding to DB:', error);
            alert(`¡Erda! No pudimos guardar el deseo: ${error.message}`);
            // Rollback
            setWishlist((prev)=>prev.filter((p)=>p.handle !== product.handle));
        }
    };
    const removeFromWishlist = async (productId)=>{
        if (!isLoggedIn) return;
        console.log('Attempting to remove product:', productId);
        const product = wishlist.find((p)=>p.id === productId || p.db_id === productId);
        if (!product) {
            console.error('Product not found in local wishlist state');
            return;
        }
        // Optimistic UI
        setWishlist((prev)=>prev.filter((p)=>p.id !== product.id && p.db_id !== product.db_id));
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('wishlist_items').delete().eq('user_id', session.user.id).eq('product_handle', product.handle);
        if (error) {
            console.error('Error removing from DB:', error);
            // Rollback if needed
            fetchUserData(session.user);
        } else {
            console.log('Successfully removed from DB');
        }
    };
    const sendFollowRequest = async (targetUserId)=>{
        if (!isLoggedIn) return;
        // Check if already following
        if (following.includes(targetUserId)) return;
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('friendships').insert({
            user_id: session.user.id,
            friend_id: targetUserId,
            status: 'pending'
        });
        if (error) {
            console.error('CRITICAL: Error sending friend request:', error);
            alert(`No se pudo enviar la solicitud: ${error.message}`);
        } else {
            console.log('Friend request sent successfully to:', targetUserId);
            setSentFollowRequests((prev)=>[
                    ...prev,
                    targetUserId
                ]);
            alert('¡Listo! Solicitud de amistad enviada. ⌛');
        }
    };
    const acceptFollowRequest = async (requestId, senderId)=>{
        if (!isLoggedIn) return;
        // Update friendships status to 'accepted'
        const { error: fError } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('friendships').update({
            status: 'accepted'
        }).eq('id', requestId);
        if (fError) {
            console.error('Error accepting friend request:', fError);
            alert('Error al aceptar la solicitud.');
            return;
        }
        // Update local state
        setFollowRequests((prev)=>prev.filter((r)=>r.id !== requestId));
        setFollowing((prev)=>[
                ...prev,
                senderId
            ]);
        alert('¡Solicitud aceptada! Ahora son amigos. ✓');
    };
    const rejectFollowRequest = async (requestId)=>{
        if (!isLoggedIn) return;
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('friendships').delete().eq('id', requestId);
        setFollowRequests((prev)=>prev.filter((r)=>r.id !== requestId));
        alert('Solicitud rechazada.');
    };
    const toggleFollow = async (friendId)=>{
        if (!isLoggedIn) {
            alert('¡Hola! Debes iniciar sesión para añadir amigos. 💡');
            return;
        }
        if (!session?.user?.id) return;
        setSocialLoading((prev)=>({
                ...prev,
                [friendId]: true
            }));
        try {
            const isFollowing = following.includes(friendId);
            if (isFollowing) {
                // Unfriend
                if (window.confirm('¿Quieres eliminar a este amigo?')) {
                    setFollowing((prev)=>prev.filter((id)=>id !== friendId));
                    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('friendships').delete().or(`and(user_id.eq.${session.user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${session.user.id})`);
                    fetchUserData(session.user);
                }
                // Check if there is already a pending request
                const { data: existing, error: selectError } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('friendships').select('*').or(`and(user_id.eq.${session.user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${session.user.id})`).maybeSingle();
                if (selectError) {
                    console.error('Error checking existing friendship:', selectError);
                }
                if (existing) {
                    if (existing.status === 'pending') {
                        if (existing.user_id === session.user.id) {
                            alert('Ya enviaste una solicitud. ¡Pronto recibirá noticias!');
                        } else {
                            alert('Este usuario ya te envió una solicitud. Búscala en tu perfil.');
                        }
                    } else if (existing.status === 'accepted') {
                        await fetchUserData(session.user);
                    }
                    return;
                }
                console.log('Sending new friend request to:', friendId);
                await sendFollowRequest(friendId);
            }
        } catch (err) {
            console.error('Error in toggleFollow:', err);
            alert('Vaya, algo salió mal al intentar seguir a este usuario.');
        } finally{
            setSocialLoading((prev)=>({
                    ...prev,
                    [friendId]: false
                }));
        }
    };
    const togglePrivacy = async (productId)=>{
        if (!isLoggedIn) return;
        console.log('Toggling privacy for:', productId);
        const product = wishlist.find((p)=>p.id === productId || p.db_id === productId);
        if (!product) {
            console.error('Product not found for privacy toggle');
            return;
        }
        const newPrivate = !product.isPrivate;
        // Optimistic UI
        setWishlist((prev)=>prev.map((p)=>p.id === productId ? {
                    ...p,
                    isPrivate: newPrivate
                } : p));
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('wishlist_items').update({
            is_private: newPrivate
        }).eq('user_id', session.user.id).eq('product_handle', product.handle);
        if (error) console.error('Error updating privacy in DB:', error);
    };
    const toggleWishlist = (product)=>{
        if (wishlist.find((p)=>p.id === product.id)) {
            removeFromWishlist(product.id);
        } else {
            addToWishlist(product);
        }
    };
    const isInWishlist = (productId)=>{
        return !!wishlist.find((p)=>p.id === productId);
    };
    const isPrivate = (productId)=>{
        return wishlist.find((p)=>p.id === productId)?.isPrivate || false;
    };
    const updateProfile = async (updates)=>{
        if (!isLoggedIn) return;
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('profiles').update(updates).eq('id', session.user.id);
        if (!error) {
            setUserProfile((prev)=>({
                    ...prev,
                    ...updates
                }));
        }
    };
    const placeOrder = async (product)=>{
        if (!isLoggedIn) return;
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('orders').insert({
            user_id: session.user.id,
            product_handle: product.handle,
            product_title: product.nombre || product.title,
            price: product.precio || product.price,
            status: 'completado',
            created_at: new Date().toISOString()
        });
        if (!error) {
            // Refresh orders
            const { data: userOrders } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$supabase$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('orders').select('*').eq('user_id', session.user.id).order('created_at', {
                ascending: false
            });
            if (userOrders) setOrders(userOrders);
        } else {
            console.error('Error placing order:', error);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(WishlistContext.Provider, {
        value: {
            wishlist,
            addToWishlist,
            removeFromWishlist,
            toggleWishlist,
            isInWishlist,
            togglePrivacy,
            userProfile,
            updateProfile,
            toggleFollow,
            following,
            friends,
            orders,
            placeOrder,
            isLoggedIn,
            loading,
            socialLoading,
            login,
            signUp,
            loginWithGoogle,
            resetPassword,
            logout,
            followRequests,
            sentFollowRequests,
            sendFollowRequest,
            acceptFollowRequest,
            rejectFollowRequest
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/context/WishlistContext.jsx",
        lineNumber: 567,
        columnNumber: 9
    }, this);
}
const useWishlist = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(WishlistContext);
}),
"[project]/src/context/CartContext.jsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CartProvider",
    ()=>CartProvider,
    "useCart",
    ()=>useCart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$WishlistContext$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/context/WishlistContext.jsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$shopify$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/shopify.js [app-ssr] (ecmascript)");
;
;
;
;
const CartContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])();
function CartProvider({ children }) {
    const { isLoggedIn } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$WishlistContext$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useWishlist"])();
    const SHIPPING_COST = 15000; // 15,000 COP
    const [cart, setCart] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>{
        const savedCart = localStorage.getItem('jes-cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });
    const [isCartOpen, setIsCartOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isCheckingOut, setIsCheckingOut] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        localStorage.setItem('jes-cart', JSON.stringify(cart));
    }, [
        cart
    ]);
    const addToCart = async (product, isGift = false)=>{
        // If product doesn't have variantId, fetch it
        let variantId = product.variantId;
        if (!variantId && product.handle) {
            const variantData = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$shopify$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getProductVariantId"])(product.handle);
            variantId = variantData?.variantId || null;
        }
        const cartId = `${product.handle}${isGift ? '-gift' : ''}`;
        setCart((prev)=>{
            const existing = prev.find((item)=>item.cartId === cartId);
            if (existing) {
                return prev.map((item)=>item.cartId === cartId ? {
                        ...item,
                        quantity: item.quantity + 1
                    } : item);
            }
            return [
                ...prev,
                {
                    ...product,
                    variantId,
                    quantity: 1,
                    isGift,
                    cartId
                }
            ];
        });
        setIsCartOpen(true);
    };
    const removeFromCart = (cartId)=>{
        setCart((prev)=>prev.filter((item)=>item.cartId !== cartId));
    };
    const updateQuantity = (cartId, delta)=>{
        setCart((prev)=>prev.map((item)=>{
                if (item.cartId === cartId) {
                    const newQty = Math.max(1, item.quantity + delta);
                    return {
                        ...item,
                        quantity: newQty
                    };
                }
                return item;
            }));
    };
    const cartCount = cart.reduce((total, item)=>total + item.quantity, 0);
    const cartSubtotal = cart.reduce((total, item)=>{
        // Remove dots (thousand separators) and currency symbols before parsing
        const cleanPrice = item.price.replace(/[$. ]/g, '');
        const price = parseFloat(cleanPrice) || 0;
        return total + price * item.quantity;
    }, 0);
    const shippingCost = isLoggedIn ? 0 : cart.length > 0 ? SHIPPING_COST : 0;
    const cartTotal = cartSubtotal + shippingCost;
    const clearCart = ()=>setCart([]);
    const startCheckout = async ()=>{
        if (cart.length === 0) return;
        setIsCheckingOut(true);
        try {
            // Ensure all items have variantIds
            const itemsWithVariants = await Promise.all(cart.map(async (item)=>{
                if (item.variantId) {
                    return {
                        variantId: item.variantId,
                        quantity: item.quantity
                    };
                }
                // Fetch variant if missing
                const variantData = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$shopify$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getProductVariantId"])(item.handle);
                return {
                    variantId: variantData?.variantId,
                    quantity: item.quantity
                };
            }));
            // Filter out items without variants
            const validItems = itemsWithVariants.filter((item)=>item.variantId);
            if (validItems.length === 0) {
                alert('No se pudieron procesar los productos. Intenta de nuevo.');
                setIsCheckingOut(false);
                return;
            }
            const checkout = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$shopify$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createShopifyCheckout"])(validItems);
            if (checkout?.checkoutUrl) {
                // Redirect to Shopify checkout
                window.location.href = checkout.checkoutUrl;
            } else {
                alert('Error al crear el checkout. Intenta de nuevo.');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Error al procesar el pago. Intenta de nuevo.');
        } finally{
            setIsCheckingOut(false);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CartContext.Provider, {
        value: {
            cart,
            addToCart,
            removeFromCart,
            updateQuantity,
            cartCount,
            cartSubtotal,
            shippingCost,
            cartTotal,
            clearCart,
            isCartOpen,
            setIsCartOpen,
            isLoggedIn,
            startCheckout,
            isCheckingOut
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/context/CartContext.jsx",
        lineNumber: 121,
        columnNumber: 9
    }, this);
}
const useCart = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(CartContext);
}),
"[project]/src/context/ThemeContext.jsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeProvider",
    ()=>ThemeProvider,
    "useTheme",
    ()=>useTheme
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
;
;
const ThemeContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])();
function ThemeProvider({ children }) {
    const [isLightMode, setIsLightMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [mounted, setMounted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const saved = localStorage.getItem('jes-theme');
        if (saved === 'light') {
            setIsLightMode(true);
        }
        setMounted(true);
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!mounted) return;
        localStorage.setItem('jes-theme', isLightMode ? 'light' : 'dark');
        if (isLightMode) {
            document.documentElement.classList.add('light-mode');
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.remove('dark-mode');
        } else {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light-mode');
        }
    }, [
        isLightMode,
        mounted
    ]);
    const toggleTheme = ()=>setIsLightMode((prev)=>!prev);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ThemeContext.Provider, {
        value: {
            isLightMode,
            toggleTheme
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/context/ThemeContext.jsx",
        lineNumber: 35,
        columnNumber: 9
    }, this);
}
const useTheme = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(ThemeContext);
}),
"[project]/src/context/TerminalContext.jsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TerminalProvider",
    ()=>TerminalProvider,
    "useTerminal",
    ()=>useTerminal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
;
;
const TerminalContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])();
function TerminalProvider({ children }) {
    const [isOpen, setIsOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [activeProduct, setActiveProduct] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const openTerminal = (product = null)=>{
        setActiveProduct(product);
        setIsOpen(true);
    };
    const closeTerminal = ()=>{
        setIsOpen(false);
        setActiveProduct(null);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(TerminalContext.Provider, {
        value: {
            isOpen,
            openTerminal,
            closeTerminal,
            activeProduct
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/context/TerminalContext.jsx",
        lineNumber: 20,
        columnNumber: 9
    }, this);
}
const useTerminal = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(TerminalContext);
}),
"[project]/src/services/ai.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "chatWithAI",
    ()=>chatWithAI
]);
const OPENROUTER_MODEL = ("TURBOPACK compile-time value", "google/gemini-2.0-flash-exp:free") || process.env.VITE_OPENROUTER_MODEL || "google/learnlm-1.5-pro-experimental:free";
async function chatWithAI(messages, productContext = []) {
    const systemPrompt = `
Eres "JARVIS" (Just A Rather Very Intelligent System), el asistente virtual de JES Store.

TU PERSONALIDAD:
- Eres inteligente, eficiente y con un toque de humor sutil como el JARVIS de Iron Man.
- Hablas de forma directa pero amable.
- Puedes bromear ocasionalmente pero siempre siendo útil.
- No usas emojis excesivos, uno o dos máximo por mensaje.

TUS CAPACIDADES:
- Recomendar productos de la tienda JES
- Ayudar con el carrito de compras
- Responder preguntas sobre productos, precios y disponibilidad
- Dar consejos sobre tecnología, moda y música

COMANDOS QUE PUEDES EJECUTAR (el sistema los detectará):
- Para añadir al carrito: [ADD_CART:handle_del_producto]
- Para quitar del carrito: [REMOVE_CART:handle_del_producto]
- Para ver un producto: [PRODUCT:handle_del_producto]
- Para buscar productos: [SEARCH:término_de_búsqueda]

REGLA IMPORTANTE:
- SOLO recomienda productos que estén en el CONTEXTO DE PRODUCTOS que te proporciono.
- Si no encuentras un producto en el contexto, di honestamente que no lo tienes.
- Usa los handles exactos del contexto para los comandos.

CONTEXTO DE PRODUCTOS DISPONIBLES:
${JSON.stringify(productContext.map((p)=>({
            title: p.title,
            handle: p.handle,
            price: p.price,
            type: p.type
        })), null, 2)}
`;
    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                systemPrompt: systemPrompt,
                messages: messages
            })
        });
        const data = await response.json();
        if (data.error) {
            console.error("AI Error:", data.error);
            return `¡Vaya! El sistema dice: "${data.error.message || data.error || 'error desconocido'}". Por favor verifica la configuración.`;
        }
        return data.choices?.[0]?.message?.content || "Lo siento, no pude procesar tu solicitud. Por favor intenta de nuevo.";
    } catch (error) {
        console.error("AI Assistant Error:", error);
        return "Error de conexión con JARVIS.";
    }
}
}),
"[project]/src/components/PurchaseTerminal.jsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PurchaseTerminal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$CartContext$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/context/CartContext.jsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$shopify$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/shopify.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$ai$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/ai.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fuse$2e$js$2f$dist$2f$fuse$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/fuse.js/dist/fuse.mjs [app-ssr] (ecmascript)");
;
;
;
;
;
;
;
function PurchaseTerminal({ isOpen, onClose, product }) {
    const [history, setHistory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([
        {
            text: 'JES STORE - TERMINAL v1.0.4',
            type: 'system'
        },
        {
            text: 'Conectando con la bodega central...',
            type: 'system'
        },
        {
            text: 'ESTADO: ONLINE',
            type: 'success'
        },
        {
            text: 'Escribe "help" para ver comandos o "jarvis" para hablar con la IA.',
            type: 'info'
        }
    ]);
    const [input, setInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const inputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const scrollRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const { addToCart, removeFromCart } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$CartContext$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCart"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [
        isOpen
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [
        history
    ]);
    const [pendingAction, setPendingAction] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [suggestedProduct, setSuggestedProduct] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [jarvisMode, setJarvisMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [jarvisHistory, setJarvisHistory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const handleCommand = async (e)=>{
        if (e.key === 'Enter') {
            const cmdText = input.trim().toLowerCase();
            const newHistory = [
                ...history,
                {
                    text: `> ${input}`,
                    type: 'user'
                }
            ];
            // Handle Pending Confirmations (y/n)
            if (pendingAction === 'confirm_buy') {
                if (cmdText === 'y' || cmdText === 'yes') {
                    if (suggestedProduct) {
                        addToCart({
                            handle: suggestedProduct.handle,
                            title: suggestedProduct.title,
                            price: suggestedProduct.price,
                            image: suggestedProduct.image
                        });
                        newHistory.push({
                            text: `[SUCCESS] ${suggestedProduct.title} añadido al carrito.`,
                            type: 'success'
                        });
                    }
                } else {
                    newHistory.push({
                        text: 'Operación cancelada.',
                        type: 'system'
                    });
                }
                setPendingAction(null);
                setSuggestedProduct(null);
                setHistory(newHistory);
                setInput('');
                return;
            }
            if (cmdText === 'help') {
                newHistory.push({
                    text: 'COMANDOS DISPONIBLES:',
                    type: 'info'
                });
                newHistory.push({
                    text: '  jarvis         - Activar modo JARVIS (IA)',
                    type: 'success'
                });
                newHistory.push({
                    text: '  search <query> - Buscar productos y añadir al carrito',
                    type: 'info'
                });
                newHistory.push({
                    text: '  buy            - Comprar producto actual (si hay uno activo)',
                    type: 'info'
                });
                newHistory.push({
                    text: '  stats          - Estadísticas del sistema',
                    type: 'info'
                });
                newHistory.push({
                    text: '  scan           - Escanear vulnerabilidades de ofertas',
                    type: 'info'
                });
                newHistory.push({
                    text: '  clear          - Limpiar la consola',
                    type: 'info'
                });
                newHistory.push({
                    text: '  exit           - Cerrar terminal',
                    type: 'info'
                });
            } else if (cmdText === 'jarvis') {
                setJarvisMode(true);
                setJarvisHistory([]);
                newHistory.push({
                    text: '',
                    type: 'system'
                });
                newHistory.push({
                    text: '╔════════════════════════════════════════════════════════╗',
                    type: 'success'
                });
                newHistory.push({
                    text: '║         J.A.R.V.I.S. INTERFACE ACTIVATED              ║',
                    type: 'success'
                });
                newHistory.push({
                    text: '║   Just A Rather Very Intelligent System               ║',
                    type: 'success'
                });
                newHistory.push({
                    text: '╚════════════════════════════════════════════════════════╝',
                    type: 'success'
                });
                newHistory.push({
                    text: '',
                    type: 'system'
                });
                newHistory.push({
                    text: 'Hola. Soy JARVIS, tu asistente personal de JES Store.',
                    type: 'info'
                });
                newHistory.push({
                    text: 'Puedo ayudarte a encontrar productos, responder preguntas',
                    type: 'info'
                });
                newHistory.push({
                    text: 'o simplemente conversar. Escribe "exit" para salir del modo JARVIS.',
                    type: 'info'
                });
                newHistory.push({
                    text: '',
                    type: 'system'
                });
            } else if (cmdText.startsWith('search ')) {
                const query = cmdText.replace('search ', '').trim();
                newHistory.push({
                    text: `Buscando "${query}" en los servidores de Shopify...`,
                    type: 'system'
                });
                try {
                    const allProducts = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$shopify$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getProducts"])(100);
                    const fuse = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fuse$2e$js$2f$dist$2f$fuse$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"](allProducts, {
                        keys: [
                            {
                                name: 'title',
                                weight: 0.7
                            },
                            {
                                name: 'type',
                                weight: 0.2
                            },
                            {
                                name: 'tags',
                                weight: 0.1
                            }
                        ],
                        threshold: 0.5,
                        distance: 100
                    });
                    const results = fuse.search(query).map((r)=>r.item).slice(0, 3);
                    if (results.length > 0) {
                        newHistory.push({
                            text: `ENCONTRADO: ${results[0].title} (${results[0].price})`,
                            type: 'info'
                        });
                        newHistory.push({
                            text: `¿Añadir al carrito? (y/n)`,
                            type: 'user'
                        });
                        setSuggestedProduct(results[0]);
                        setPendingAction('confirm_buy');
                    } else {
                        newHistory.push({
                            text: `[ERROR] No se encontraron productos para "${query}".`,
                            type: 'error'
                        });
                    }
                } catch (err) {
                    newHistory.push({
                        text: '[FATAL] Error de conexión con la base de datos.',
                        type: 'error'
                    });
                }
            } else if (cmdText === 'buy') {
                if (product) {
                    newHistory.push({
                        text: `Iniciando protocolo de compra para: ${product.title}...`,
                        type: 'system'
                    });
                    setTimeout(()=>{
                        addToCart({
                            handle: product.handle,
                            title: product.title,
                            price: product.price,
                            image: product.image || product.images && product.images[0]
                        });
                        setHistory((prev)=>[
                                ...prev,
                                {
                                    text: 'PRODUCTO AÑADIDO AL CARRITO CON ÉXITO.',
                                    type: 'success'
                                }
                            ]);
                    }, 1000);
                } else {
                    newHistory.push({
                        text: 'Error: No hay un producto activo. Usa "search <nombre>" primero.',
                        type: 'error'
                    });
                }
            } else if (cmdText === 'stats') {
                newHistory.push({
                    text: 'ESTADÍSTICAS DE LA COMUNIDAD:',
                    type: 'info'
                });
                newHistory.push({
                    text: '  Usuarios Online: 1,420',
                    type: 'info'
                });
                newHistory.push({
                    text: '  Vibe Level: 100%',
                    type: 'info'
                });
            } else if (cmdText === 'scan') {
                newHistory.push({
                    text: 'Escaneando vulnerabilidades...',
                    type: 'user'
                });
                setTimeout(()=>{
                    setHistory((prev)=>[
                            ...prev,
                            {
                                text: '¡CUPÓN DETECTADO! Usa "JES20" para un 20% off.',
                                type: 'success'
                            }
                        ]);
                }, 1500);
            } else if (cmdText === 'info') {
                if (product) {
                    newHistory.push({
                        text: `PRODUCTO: ${product.title}`,
                        type: 'info'
                    });
                    newHistory.push({
                        text: `PRECIO: ${product.price}`,
                        type: 'info'
                    });
                } else {
                    newHistory.push({
                        text: 'Error: No hay producto activo.',
                        type: 'error'
                    });
                }
            } else if (cmdText === 'clear') {
                setHistory([
                    {
                        text: 'Consola despejada.',
                        type: 'system'
                    }
                ]);
                setInput('');
                return;
            } else if (cmdText === 'exit') {
                if (jarvisMode) {
                    setJarvisMode(false);
                    newHistory.push({
                        text: 'JARVIS desactivado. Volviendo al modo terminal.',
                        type: 'system'
                    });
                } else {
                    onClose();
                    return;
                }
            } else if (jarvisMode && cmdText !== '') {
                // JARVIS Mode - Send to AI
                newHistory.push({
                    text: 'JARVIS > Procesando...',
                    type: 'info'
                });
                setHistory(newHistory);
                setInput('');
                try {
                    // Fetch products for context
                    const allProducts = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$shopify$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getProducts"])(50);
                    const newJarvisHistory = [
                        ...jarvisHistory,
                        {
                            role: 'user',
                            content: input
                        }
                    ];
                    const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$ai$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["chatWithAI"])(newJarvisHistory, allProducts);
                    setJarvisHistory([
                        ...newJarvisHistory,
                        {
                            role: 'assistant',
                            content: response
                        }
                    ]);
                    // Process JARVIS commands in response
                    const addCartMatch = response.match(/\[ADD_CART:([^\]]+)\]/);
                    const removeCartMatch = response.match(/\[REMOVE_CART:([^\]]+)\]/);
                    if (addCartMatch) {
                        const handle = addCartMatch[1];
                        const productToAdd = allProducts.find((p)=>p.handle === handle);
                        if (productToAdd) {
                            addToCart({
                                handle: productToAdd.handle,
                                title: productToAdd.title,
                                price: productToAdd.price,
                                image: productToAdd.image
                            });
                        }
                    }
                    if (removeCartMatch) {
                        const handle = removeCartMatch[1];
                        removeFromCart(handle);
                    }
                    // Clean response from commands for display
                    const cleanResponse = response.replace(/\[ADD_CART:[^\]]+\]/g, '✅ Añadido al carrito').replace(/\[REMOVE_CART:[^\]]+\]/g, '❌ Eliminado del carrito').replace(/\[PRODUCT:[^\]]+\]/g, '').replace(/\[SEARCH:[^\]]+\]/g, '');
                    // Split response into lines for terminal display
                    const lines = cleanResponse.split('\n').filter((l)=>l.trim());
                    setHistory((prev)=>[
                            ...prev.filter((h)=>h.text !== 'JARVIS > Procesando...'),
                            {
                                text: 'JARVIS:',
                                type: 'success'
                            },
                            ...lines.map((line)=>({
                                    text: `  ${line}`,
                                    type: 'info'
                                })),
                            {
                                text: '',
                                type: 'system'
                            }
                        ]);
                } catch (err) {
                    setHistory((prev)=>[
                            ...prev.filter((h)=>h.text !== 'JARVIS > Procesando...'),
                            {
                                text: '[ERROR] No se pudo conectar con JARVIS.',
                                type: 'error'
                            }
                        ]);
                }
                return;
            } else if (cmdText !== '') {
                newHistory.push({
                    text: `Error: Comando desconocido. Escribe "help".`,
                    type: 'error'
                });
            }
            setHistory(newHistory);
            setInput('');
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
        children: isOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
            initial: {
                opacity: 0
            },
            animate: {
                opacity: 1
            },
            exit: {
                opacity: 0
            },
            className: "fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-10 font-mono",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                initial: {
                    scale: 0.9,
                    y: 20
                },
                animate: {
                    scale: 1,
                    y: 0
                },
                className: "w-full max-w-4xl h-[600px] bg-zinc-950 border border-green-500/30 rounded-lg shadow-[0_0_50px_rgba(34,197,94,0.1)] flex flex-col overflow-hidden relative",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 pointer-events-none bg-[radial-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_100%),linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,100%_1px,3px_100%] z-10"
                    }, void 0, false, {
                        fileName: "[project]/src/components/PurchaseTerminal.jsx",
                        lineNumber: 238,
                        columnNumber: 25
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-green-500/20",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-3 h-3 rounded-full bg-red-500/50"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/PurchaseTerminal.jsx",
                                        lineNumber: 243,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-3 h-3 rounded-full bg-yellow-500/50"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/PurchaseTerminal.jsx",
                                        lineNumber: 244,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-3 h-3 rounded-full bg-green-500/50"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/PurchaseTerminal.jsx",
                                        lineNumber: 245,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "ml-2 text-[10px] text-green-500/50 uppercase tracking-widest",
                                        children: "jes_terminal_v1.sh"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/PurchaseTerminal.jsx",
                                        lineNumber: 246,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/PurchaseTerminal.jsx",
                                lineNumber: 242,
                                columnNumber: 29
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: onClose,
                                className: "text-green-500/50 hover:text-green-500 transition-colors",
                                children: "[X]"
                            }, void 0, false, {
                                fileName: "[project]/src/components/PurchaseTerminal.jsx",
                                lineNumber: 248,
                                columnNumber: 29
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/PurchaseTerminal.jsx",
                        lineNumber: 241,
                        columnNumber: 25
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        ref: scrollRef,
                        className: "flex-1 p-6 overflow-y-auto space-y-2 text-sm md:text-base selection:bg-green-500/30 selection:text-white no-scrollbar",
                        children: [
                            history.map((line, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: `
                                    ${line.type === 'system' ? 'text-green-500/70' : ''}
                                    ${line.type === 'success' ? 'text-green-400 font-bold' : ''}
                                    ${line.type === 'error' ? 'text-red-400' : ''}
                                    ${line.type === 'info' ? 'text-blue-400' : ''}
                                    ${line.type === 'user' ? 'text-white' : ''}
                                `,
                                    children: line.text
                                }, i, false, {
                                    fileName: "[project]/src/components/PurchaseTerminal.jsx",
                                    lineNumber: 259,
                                    columnNumber: 33
                                }, this)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2 text-green-400",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "$"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/PurchaseTerminal.jsx",
                                        lineNumber: 270,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        ref: inputRef,
                                        type: "text",
                                        value: input,
                                        onChange: (e)=>setInput(e.target.value),
                                        onKeyDown: handleCommand,
                                        className: "flex-1 bg-transparent border-none outline-none caret-green-500 p-0 text-white",
                                        autoFocus: true
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/PurchaseTerminal.jsx",
                                        lineNumber: 271,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/PurchaseTerminal.jsx",
                                lineNumber: 269,
                                columnNumber: 29
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/PurchaseTerminal.jsx",
                        lineNumber: 254,
                        columnNumber: 25
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-4 py-1 bg-green-500/10 border-t border-green-500/20 flex justify-between text-[10px] text-green-500/50 uppercase tracking-tighter",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Status: Root_Access"
                            }, void 0, false, {
                                fileName: "[project]/src/components/PurchaseTerminal.jsx",
                                lineNumber: 285,
                                columnNumber: 29
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    " ",
                                    product ? `Target: ${product.handle}` : 'System_Idle'
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/PurchaseTerminal.jsx",
                                lineNumber: 286,
                                columnNumber: 29
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "UTF-8"
                            }, void 0, false, {
                                fileName: "[project]/src/components/PurchaseTerminal.jsx",
                                lineNumber: 287,
                                columnNumber: 29
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/PurchaseTerminal.jsx",
                        lineNumber: 284,
                        columnNumber: 25
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/PurchaseTerminal.jsx",
                lineNumber: 232,
                columnNumber: 21
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/PurchaseTerminal.jsx",
            lineNumber: 226,
            columnNumber: 17
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/PurchaseTerminal.jsx",
        lineNumber: 224,
        columnNumber: 9
    }, this);
}
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/components/AIAssistant.jsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AIAssistant
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$ai$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/ai.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$shopify$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/shopify.js [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
function AIAssistant({ isFullScreen = false }) {
    const [isOpen, setIsOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(isFullScreen);
    const [messages, setMessages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>{
        const saved = localStorage.getItem('jarvis-history');
        if (saved) return JSON.parse(saved);
        return [
            {
                role: 'assistant',
                content: 'Hola. Soy JARVIS, tu asistente personal de JES Store. ¿En qué puedo ayudarte hoy?'
            }
        ];
    });
    const [input, setInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [products, setProducts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const scrollRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        localStorage.setItem('jarvis-history', JSON.stringify(messages));
    }, [
        messages
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        async function loadContext() {
            try {
                const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$shopify$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getProducts"])(20);
                setProducts(data);
            } catch (e) {
                console.warn("Could not load products for AI context");
            }
        }
        loadContext();
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isFullScreen) return;
        const handleOpen = ()=>setIsOpen(true);
        const handleToggle = ()=>setIsOpen((prev)=>!prev);
        window.addEventListener('open-ai-assistant', handleOpen);
        window.addEventListener('toggle-ai', handleToggle);
        return ()=>{
            window.removeEventListener('open-ai-assistant', handleOpen);
            window.removeEventListener('toggle-ai', handleToggle);
        };
    }, [
        isFullScreen
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [
        messages
    ]);
    const handleSend = async ()=>{
        if (!input.trim() || loading) return;
        const userMsg = {
            role: 'user',
            content: input
        };
        setMessages((prev)=>[
                ...prev,
                userMsg
            ]);
        setInput('');
        setLoading(true);
        try {
            const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$ai$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["chatWithAI"])([
                ...messages,
                userMsg
            ], products);
            setMessages((prev)=>[
                    ...prev,
                    {
                        role: 'assistant',
                        content: response
                    }
                ]);
            setLoading(false);
        } catch (error) {
            console.error("Chat error:", error);
            setLoading(false);
        }
    };
    const renderMessageContent = (content)=>{
        const productRegex = /\[PRODUCT:(.+?)\]/g;
        const matches = [
            ...content.matchAll(productRegex)
        ];
        const cleanContent = content.replace(productRegex, '').trim();
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: cleanContent
                }, void 0, false, {
                    fileName: "[project]/src/components/AIAssistant.jsx",
                    lineNumber: 83,
                    columnNumber: 17
                }, this),
                matches.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "pt-2 flex flex-wrap gap-2",
                    children: matches.map((match, idx)=>{
                        const handle = match[1];
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            href: `/product/${handle}`,
                            className: "inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-50 dark:bg-white text-zinc-900 dark:text-black rounded-full font-bold text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl border border-black/5",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    xmlns: "http://www.w3.org/2000/svg",
                                    width: "12",
                                    height: "12",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    strokeWidth: "3",
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            d: "M7 7h10v10"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/AIAssistant.jsx",
                                            lineNumber: 94,
                                            columnNumber: 215
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            d: "M7 17 17 7"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/AIAssistant.jsx",
                                            lineNumber: 94,
                                            columnNumber: 238
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/AIAssistant.jsx",
                                    lineNumber: 94,
                                    columnNumber: 37
                                }, this),
                                "Ver Producto"
                            ]
                        }, idx, true, {
                            fileName: "[project]/src/components/AIAssistant.jsx",
                            lineNumber: 89,
                            columnNumber: 33
                        }, this);
                    })
                }, void 0, false, {
                    fileName: "[project]/src/components/AIAssistant.jsx",
                    lineNumber: 85,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/AIAssistant.jsx",
            lineNumber: 82,
            columnNumber: 13
        }, this);
    };
    const chatContent = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
        initial: !isFullScreen ? {
            opacity: 0,
            scale: 0.8,
            y: 20,
            transformOrigin: 'bottom right'
        } : {
            opacity: 0
        },
        animate: {
            opacity: 1,
            scale: 1,
            y: 0
        },
        exit: {
            opacity: 0,
            scale: 0.8,
            y: 20
        },
        className: `${isFullScreen ? 'w-full h-full flex flex-col bg-white dark:bg-black transition-colors duration-300' : 'absolute bottom-20 right-0 w-[320px] md:w-[350px] h-[480px] bg-white/95 dark:bg-zinc-950/95 border border-black/10 dark:border-white/10 rounded-[32px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col backdrop-blur-2xl transition-all duration-300'}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-7 bg-black dark:bg-white text-white dark:text-black flex items-center justify-between shrink-0 transition-colors duration-300",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-10 h-10 bg-blue-600 dark:bg-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white/5 dark:border-black/5 shrink-0 transition-colors duration-300",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    xmlns: "http://www.w3.org/2000/svg",
                                    width: "20",
                                    height: "20",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "white",
                                    strokeWidth: "2",
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            d: "M12 8V4H8"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/AIAssistant.jsx",
                                            lineNumber: 120,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                            width: "16",
                                            height: "12",
                                            x: "4",
                                            y: "8",
                                            rx: "2"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/AIAssistant.jsx",
                                            lineNumber: 121,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            d: "M2 14h2"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/AIAssistant.jsx",
                                            lineNumber: 122,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            d: "M20 14h2"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/AIAssistant.jsx",
                                            lineNumber: 123,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            d: "M15 13v2"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/AIAssistant.jsx",
                                            lineNumber: 124,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            d: "M9 13v2"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/AIAssistant.jsx",
                                            lineNumber: 125,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/AIAssistant.jsx",
                                    lineNumber: 119,
                                    columnNumber: 25
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/AIAssistant.jsx",
                                lineNumber: 118,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "min-w-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-white dark:text-black font-black uppercase tracking-tighter text-base md:text-lg leading-none truncate transition-colors duration-300",
                                        children: "JARVIS"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/AIAssistant.jsx",
                                        lineNumber: 129,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-white/50 dark:text-black/50 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1 truncate transition-colors duration-300",
                                        children: "Asistente Virtual JES"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/AIAssistant.jsx",
                                        lineNumber: 130,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/AIAssistant.jsx",
                                lineNumber: 128,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/AIAssistant.jsx",
                        lineNumber: 117,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: !isFullScreen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setIsOpen(false),
                            className: "p-2.5 hover:bg-white/10 dark:hover:bg-black/5 text-white dark:text-black rounded-xl transition-colors",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                xmlns: "http://www.w3.org/2000/svg",
                                width: "20",
                                height: "20",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "2.5",
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M18 6 6 18"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/AIAssistant.jsx",
                                        lineNumber: 139,
                                        columnNumber: 209
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "m6 6 12 12"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/AIAssistant.jsx",
                                        lineNumber: 139,
                                        columnNumber: 232
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/AIAssistant.jsx",
                                lineNumber: 139,
                                columnNumber: 29
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/AIAssistant.jsx",
                            lineNumber: 135,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/AIAssistant.jsx",
                        lineNumber: 133,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/AIAssistant.jsx",
                lineNumber: 116,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: scrollRef,
                className: "flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-transparent",
                children: [
                    messages.map((m, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: `flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `max-w-[85%] p-5 rounded-[28px] text-sm leading-relaxed transition-all duration-300 ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-500/20' : 'bg-zinc-100 dark:bg-white/5 text-zinc-900 dark:text-zinc-100 border border-black/5 dark:border-white/5 rounded-tl-none shadow-sm'}`,
                                children: m.role === 'assistant' ? renderMessageContent(m.content) : m.content
                            }, void 0, false, {
                                fileName: "[project]/src/components/AIAssistant.jsx",
                                lineNumber: 151,
                                columnNumber: 25
                            }, this)
                        }, i, false, {
                            fileName: "[project]/src/components/AIAssistant.jsx",
                            lineNumber: 150,
                            columnNumber: 21
                        }, this)),
                    loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex justify-start pl-2",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-zinc-100 dark:bg-white/5 px-6 py-4 rounded-[28px] rounded-tl-none border border-black/5 dark:border-white/5 transition-colors duration-300",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-1.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "w-2 h-2 bg-black/40 dark:bg-white/40 rounded-full animate-bounce"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/AIAssistant.jsx",
                                        lineNumber: 163,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "w-2 h-2 bg-black/40 dark:bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/AIAssistant.jsx",
                                        lineNumber: 164,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "w-2 h-2 bg-black/40 dark:bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/AIAssistant.jsx",
                                        lineNumber: 165,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/AIAssistant.jsx",
                                lineNumber: 162,
                                columnNumber: 29
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/AIAssistant.jsx",
                            lineNumber: 161,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/AIAssistant.jsx",
                        lineNumber: 160,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/AIAssistant.jsx",
                lineNumber: 145,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `p-6 border-t border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-black/20 transition-colors duration-300 ${isFullScreen ? 'pb-24' : ''}`,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-3 bg-zinc-100 dark:bg-white/5 rounded-[24px] p-2 pr-2 border border-black/10 dark:border-white/5 focus-within:border-blue-500 transition-all shadow-inner",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "text",
                            value: input,
                            onChange: (e)=>setInput(e.target.value),
                            onKeyDown: (e)=>e.key === 'Enter' && handleSend(),
                            placeholder: "Escribe aquí...",
                            className: "bg-transparent border-none outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-base w-full px-4 transition-colors duration-300"
                        }, void 0, false, {
                            fileName: "[project]/src/components/AIAssistant.jsx",
                            lineNumber: 175,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: handleSend,
                            disabled: loading || !input.trim(),
                            className: "w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all shadow-lg shrink-0",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                xmlns: "http://www.w3.org/2000/svg",
                                width: "20",
                                height: "20",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "2.5",
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "m22 2-7 20-4-9-9-4Z"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/AIAssistant.jsx",
                                        lineNumber: 188,
                                        columnNumber: 205
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M22 2 11 13"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/AIAssistant.jsx",
                                        lineNumber: 188,
                                        columnNumber: 237
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/AIAssistant.jsx",
                                lineNumber: 188,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/AIAssistant.jsx",
                            lineNumber: 183,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/AIAssistant.jsx",
                    lineNumber: 174,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/AIAssistant.jsx",
                lineNumber: 173,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/AIAssistant.jsx",
        lineNumber: 106,
        columnNumber: 9
    }, this);
    if (pathname === '/ai' && !isFullScreen) return null;
    if (isFullScreen) return chatContent;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed bottom-6 right-6 z-[60]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].button, {
                whileHover: {
                    scale: 1.1,
                    y: -2
                },
                whileTap: {
                    scale: 0.9
                },
                onClick: ()=>setIsOpen(!isOpen),
                className: `w-14 h-14 bg-blue-600 dark:bg-white rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(59,130,246,0.3)] dark:shadow-[0_10px_30px_rgba(255,255,255,0.15)] text-white dark:text-black relative z-10 border border-blue-500 dark:border-white/20 hover:bg-blue-700 dark:hover:bg-zinc-100 transition-colors ${isOpen ? 'hidden md:flex' : 'hidden md:flex'}`,
                children: isOpen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    xmlns: "http://www.w3.org/2000/svg",
                    width: "24",
                    height: "24",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "2.5",
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M18 6 6 18"
                        }, void 0, false, {
                            fileName: "[project]/src/components/AIAssistant.jsx",
                            lineNumber: 208,
                            columnNumber: 201
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "m6 6 12 12"
                        }, void 0, false, {
                            fileName: "[project]/src/components/AIAssistant.jsx",
                            lineNumber: 208,
                            columnNumber: 224
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/AIAssistant.jsx",
                    lineNumber: 208,
                    columnNumber: 21
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            xmlns: "http://www.w3.org/2000/svg",
                            width: "24",
                            height: "24",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                            }, void 0, false, {
                                fileName: "[project]/src/components/AIAssistant.jsx",
                                lineNumber: 211,
                                columnNumber: 203
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/AIAssistant.jsx",
                            lineNumber: 211,
                            columnNumber: 25
                        }, this),
                        !isOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white animate-pulse"
                        }, void 0, false, {
                            fileName: "[project]/src/components/AIAssistant.jsx",
                            lineNumber: 212,
                            columnNumber: 37
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/AIAssistant.jsx",
                    lineNumber: 210,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/AIAssistant.jsx",
                lineNumber: 201,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                children: isOpen && chatContent
            }, void 0, false, {
                fileName: "[project]/src/components/AIAssistant.jsx",
                lineNumber: 217,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/AIAssistant.jsx",
        lineNumber: 199,
        columnNumber: 9
    }, this);
}
}),
"[project]/app/providers.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Providers",
    ()=>Providers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$WishlistContext$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/context/WishlistContext.jsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$CartContext$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/context/CartContext.jsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$ThemeContext$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/context/ThemeContext.jsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$TerminalContext$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/context/TerminalContext.jsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$PurchaseTerminal$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/PurchaseTerminal.jsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AIAssistant$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/AIAssistant.jsx [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
// Wrapper component that has access to Terminal context
function GlobalComponents({ children }) {
    const { isOpen, closeTerminal, activeProduct } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$TerminalContext$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTerminal"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            children,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$PurchaseTerminal$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                isOpen: isOpen,
                onClose: closeTerminal,
                product: activeProduct
            }, void 0, false, {
                fileName: "[project]/app/providers.js",
                lineNumber: 17,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$AIAssistant$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                fileName: "[project]/app/providers.js",
                lineNumber: 18,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true);
}
function Providers({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$ThemeContext$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ThemeProvider"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$WishlistContext$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WishlistProvider"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$CartContext$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CartProvider"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$context$2f$TerminalContext$2e$jsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TerminalProvider"], {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(GlobalComponents, {
                        children: children
                    }, void 0, false, {
                        fileName: "[project]/app/providers.js",
                        lineNumber: 29,
                        columnNumber: 25
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/providers.js",
                    lineNumber: 28,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/providers.js",
                lineNumber: 27,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/providers.js",
            lineNumber: 26,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/providers.js",
        lineNumber: 25,
        columnNumber: 9
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__04d165d1._.js.map