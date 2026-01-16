import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionLoader } from "@/components/ui/loader";
import { motion } from "framer-motion";

export default function HomePage() {
  const { data: products, isLoading } = useProducts();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
 <section className="relative h-[85vh] w-full overflow-hidden">
  {/* Video Background */}
  <video
    className="absolute inset-0 h-full w-full object-cover opacity-60"
    autoPlay
    muted
    loop
    playsInline
  >
    <source
      src="https://tkserver.serv00.net/vdo/WhatsApp%20Video%202026-01-16%20at%208.29.20%20PM.mp4"
      type="video/mp4"
    />
  </video>

  {/* Optional dark overlay */}
  <div className="absolute inset-0 bg-black/40" />

  {/* Content */}
  <div className="relative z-10 flex h-full items-center justify-center">
    {/* your text / buttons */}
  </div>
</section>



          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>

        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center px-4">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm md:text-base font-medium tracking-[0.2em] text-white/80 uppercase mb-4"
          >
            Redefining Luxury Streetwear
          </motion.h2>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-6xl md:text-8xl lg:text-9xl font-serif font-bold text-white mb-8 tracking-tighter"
          >
            NOIR<br />COLLECTION
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Link href="/products">
              <Button size="lg" className="rounded-none bg-white text-black hover:bg-neutral-200 px-10 py-6 text-sm uppercase tracking-widest font-bold">
                Shop Collection
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 px-4 container mx-auto">
        <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-serif text-white mb-2">Latest Arrivals</h2>
            <p className="text-neutral-400">Curated pieces for the modern aesthetic.</p>
          </div>
          <Link href="/products" className="text-white hover:text-white/70 underline underline-offset-4 text-sm uppercase tracking-widest">
            View All
          </Link>
        </div>

        {isLoading ? (
          <SectionLoader />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
            {products?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Brand Statement */}
      <section className="py-32 bg-neutral-900/30 border-y border-white/5">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-serif text-white mb-6 leading-tight">
            "Fashion is not just what you wear, it's a statement of who you are in the dark."
          </h2>
          <p className="text-neutral-500 text-lg">
            Designed in the shadows. Crafted for the spotlight.
          </p>
        </div>
      </section>
      
      <footer className="py-12 border-t border-white/10 text-center text-neutral-500 text-sm">
        <div className="container mx-auto px-4">
       <p>
           © {new Date().getFullYear()} C10 NOIR · Made with ❤ by{" "}
      <a href="https://github.com/MrTusarRX" target="_blank" rel="noopener noreferrer">
      Tusar Khan
    </a>{" "}
     &{" "}
      <a href="https://github.com/techflux0" target="_blank" rel="noopener noreferrer">
    techflux0
     </a>
       </p>
        </div>
      </footer>
    </div>
  );
}
