import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionLoader } from "@/components/ui/loader";
import { useProducts } from "@/hooks/use-products";

export default function SearchPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const query = searchParams.get("q") || "";
  
  const { data: products, isLoading, refetch } = useProducts(query);

  useEffect(() => {
    refetch();
  }, [query, refetch]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-serif text-white mb-8">
          {query ? `Search results for "${query}"` : "All Products"}
        </h1>

        {isLoading ? (
          <SectionLoader />
        ) : (
          <>
            {products && products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 border border-dashed border-white/10">
                <p className="text-neutral-500">No products found matching your search.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
