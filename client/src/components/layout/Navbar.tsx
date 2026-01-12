import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useProducts } from "@/hooks/use-products";
import { ShoppingBag, Search, Menu, X, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, logoutMutation } = useAuth();
  const { itemCount } = useCart();
  const { data: allProducts } = useProducts();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const suggestions = searchQuery.trim().length > 0 
    ? allProducts?.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      const url = `/search?q=${encodeURIComponent(trimmed)}`;
      if (window.location.pathname === '/search') {
        window.location.href = url;
      } else {
        setLocation(url);
      }
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden text-white">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-background border-r border-white/10">
            <div className="flex flex-col gap-8 mt-10">
              <Link href="/" className="text-2xl font-serif font-bold text-white">NOIR COLLECTION</Link>
              <div className="flex flex-col gap-4">
                <Link href="/" className="text-lg text-white/80 hover:text-white transition-colors">Home</Link>
                <Link href="/products" className="text-lg text-white/80 hover:text-white transition-colors">Collection</Link>
                {user?.role === 'admin' && (
                  <Link href="/admin" className="text-lg text-white/80 hover:text-white transition-colors">Admin Panel</Link>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="text-2xl font-serif font-bold tracking-widest text-white hover:opacity-80 transition-opacity">
          C10
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm font-medium text-white/70 hover:text-white transition-colors uppercase tracking-widest">
            Home
          </Link>
          <Link href="/products" className="text-sm font-medium text-white/70 hover:text-white transition-colors uppercase tracking-widest">
            Shop
          </Link>
          {user?.role === 'admin' && (
            <Link href="/admin" className="text-sm font-medium text-white/70 hover:text-white transition-colors uppercase tracking-widest">
              Admin
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <UserIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-white/10">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="cursor-pointer">
                  <Link href="/orders" className="w-full">My Orders</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem 
                  className="cursor-pointer text-red-400 focus:text-red-400"
                  onClick={() => logoutMutation.mutate()}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <UserIcon className="h-5 w-5" />
              </Button>
            </Link>
          )}

          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/10">
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar Animation */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-white/10 bg-neutral-900"
          >
            <div className="container mx-auto px-4 py-4">
              <div className="relative">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Search products..."
                    className="pl-10 bg-neutral-800 border-none text-white placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-white/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>
                
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-800 border border-white/10 rounded-md overflow-hidden z-50">
                    {suggestions.map((product) => (
                      <Link 
                        key={product.id} 
                        href={`/products/${product.id}`}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-0"
                      >
                        <img src={product.images[0]} className="w-10 h-10 object-cover" alt="" />
                        <div>
                          <p className="text-sm font-medium text-white">{product.name}</p>
                          <p className="text-xs text-neutral-500">₹{product.finalPrice.toLocaleString()}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
