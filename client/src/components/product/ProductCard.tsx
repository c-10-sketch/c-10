import { Product } from "@shared/schema";
import { Link } from "wouter";
import { motion } from "framer-motion";

export function ProductCard({ product }: { product: Product }) {
  // Use first image or fallback
  const mainImage = product.images[0] || "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80";

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="space-y-3"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-neutral-900">
          <img
            src={mainImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          {product.discount > 0 && (
            <div className="absolute top-2 right-2 bg-white text-black text-xs font-bold px-2 py-1 uppercase tracking-wider">
              -{product.discount}%
            </div>
          )}
          {!product.enabled && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-bold uppercase tracking-widest border border-white px-4 py-2">
                Unavailable
              </span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="font-serif text-lg leading-tight text-white group-hover:underline decoration-white/30 underline-offset-4">
            {product.name}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">
              ₹{product.finalPrice.toLocaleString()}
            </span>
            {product.discount > 0 && (
              <span className="text-sm text-neutral-500 line-through">
                ₹{product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
