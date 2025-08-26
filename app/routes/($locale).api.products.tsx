import {json, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, Link} from '@remix-run/react';
import type {ProductSortKeys} from '@shopify/hydrogen/storefront-api-types';
import {flattenConnection, Image, Money} from '@shopify/hydrogen';
import invariant from 'tiny-invariant';

import {PRODUCT_CARD_FRAGMENT} from '~/data/fragments';

/**
 * Fetch a given set of products from the storefront API
 */
export async function loader({
  request,
  context: {storefront},
}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);

  const query = searchParams.get('query') ?? '';
  const sortKey =
    (searchParams.get('sortKey') as null | ProductSortKeys) ?? 'BEST_SELLING';

  let reverse = false;
  try {
    const _reverse = searchParams.get('reverse');
    if (_reverse === 'true') {
      reverse = true;
    }
  } catch (_) {
    // noop
  }

  let count = 12; // Increased default count
  try {
    const _count = searchParams.get('count');
    if (typeof _count === 'string') {
      count = parseInt(_count);
    }
  } catch (_) {
    // noop
  }

  const {products} = await storefront.query(API_ALL_PRODUCTS_QUERY, {
    variables: {
      count,
      query,
      reverse,
      sortKey,
      country: storefront.i18n.country,
      language: storefront.i18n.language,
    },
    cache: storefront.CacheLong(),
  });

  invariant(products, 'No data returned from top products query');

  return json({
    products: flattenConnection(products),
    searchParams: {
      query,
      sortKey,
      reverse,
      count,
    },
  });
}

export default function ProductsApiRoute() {
  const {products, searchParams} = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {searchParams.query ? `Products for "${searchParams.query}"` : 'All Products'}
              </h1>
              <p className="text-gray-600 mt-2">
                Found {products.length} products
              </p>
            </div>
            
            {/* Filter Controls */}
            <div className="mt-4 md:mt-0 flex flex-wrap gap-4">
              <select 
                className="select select-bordered w-full max-w-xs"
                defaultValue={searchParams.sortKey}
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('sortKey', e.target.value);
                  window.location.href = url.toString();
                }}
              >
                <option value="BEST_SELLING">Best Selling</option>
                <option value="CREATED_AT">Newest</option>
                <option value="PRICE">Price: Low to High</option>
                <option value="TITLE">A-Z</option>
              </select>
              
              <select 
                className="select select-bordered w-full max-w-xs"
                defaultValue={searchParams.count.toString()}
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('count', e.target.value);
                  window.location.href = url.toString();
                }}
              >
                <option value="8">8 per page</option>
                <option value="12">12 per page</option>
                <option value="24">24 per page</option>
                <option value="48">48 per page</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No products found</h2>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Load More Button */}
      {products.length >= searchParams.count && (
        <div className="text-center pb-8">
          <button 
            className="btn btn-outline btn-lg"
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('count', (searchParams.count + 12).toString());
              window.location.href = url.toString();
            }}
          >
            Load More Products
          </button>
        </div>
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({product}: {product: any}) {
  const featuredImage = product.featuredImage;
  const priceRange = product.priceRange?.minVariantPrice;
  const compareAtPrice = product.compareAtPriceRange?.minVariantPrice;

  return (
    <Link 
      to={`/products/${product.handle}`}
      className="group"
      prefetch="intent"
    >
      <div className="card bg-white shadow-sm hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
        {/* Product Image */}
        <figure className="relative overflow-hidden aspect-square">
          {featuredImage ? (
            <Image
              data={featuredImage}
              aspectRatio="1/1"
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="bg-gray-200 w-full h-full flex items-center justify-center">
              <span className="text-gray-400 text-4xl">📷</span>
            </div>
          )}
          
          {/* Sale Badge */}
          {compareAtPrice && compareAtPrice.amount > priceRange?.amount && (
            <div className="badge badge-error absolute top-3 left-3 text-white">
              Sale
            </div>
          )}
          
          {/* Quick View Button */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button className="btn btn-primary btn-sm">Quick View</button>
          </div>
        </figure>

        {/* Product Info */}
        <div className="card-body p-4">
          <h3 className="card-title text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          
          {/* Vendor */}
          {product.vendor && (
            <p className="text-sm text-gray-500 mb-2">{product.vendor}</p>
          )}
          
          {/* Price */}
          <div className="flex items-center gap-2">
            {priceRange && (
              <Money
                data={priceRange}
                className="text-lg font-bold text-gray-900"
              />
            )}
            {compareAtPrice && compareAtPrice.amount > priceRange?.amount && (
              <Money
                data={compareAtPrice}
                className="text-sm text-gray-500 line-through"
              />
            )}
          </div>

          {/* Product Description */}
          {product.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mt-2">
              {product.description}
            </p>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.tags.slice(0, 3).map((tag: string) => (
                <span key={tag} className="badge badge-outline badge-xs">
                  {tag}
                </span>
              ))}
              {product.tags.length > 3 && (
                <span className="badge badge-outline badge-xs">
                  +{product.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Add to Cart Button */}
          <div className="card-actions justify-end mt-4">
            <button 
              className="btn btn-primary btn-sm w-full"
              onClick={(e) => {
                e.preventDefault();
                // Add to cart logic here
                console.log('Add to cart:', product.id);
              }}
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

const API_ALL_PRODUCTS_QUERY = `#graphql
  query ApiAllProducts(
    $query: String
    $count: Int
    $reverse: Boolean
    $country: CountryCode
    $language: LanguageCode
    $sortKey: ProductSortKeys
  ) @inContext(country: $country, language: $language) {
    products(first: $count, sortKey: $sortKey, reverse: $reverse, query: $query) {
      nodes {
        ...ProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;