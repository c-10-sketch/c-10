import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Product } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  color: string;
  size: string;
  url: string; // To keep reference for re-ordering
};

type CartContextType = {
  items: CartItem[];
  addItem: (product: Product, color: string, size: string, quantity: number) => void;
  removeItem: (productId: string, color: string, size: string) => void;
  updateQuantity: (productId: string, color: string, size: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { toast } = useToast();

  // Load cart from local storage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("c10-cart");
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }
  }, []);

  // Save cart to local storage on change
  useEffect(() => {
    localStorage.setItem("c10-cart", JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, color: string, size: string, quantity: number) => {
    setItems((prev) => {
      const existingItemIndex = prev.findIndex(
        (item) => item.productId === product.id && item.color === color && item.size === size
      );

      if (existingItemIndex > -1) {
        const newItems = [...prev];
        newItems[existingItemIndex].quantity += quantity;
        return newItems;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: product.finalPrice,
            image: product.images[0],
            quantity,
            color,
            size,
            url: `/products/${product.id}`,
          },
        ];
      }
    });
    toast({
      title: "Added to Bag",
      description: `${product.name} (${size}, ${color}) added.`,
    });
  };

  const removeItem = (productId: string, color: string, size: string) => {
    setItems((prev) => prev.filter(
      (item) => !(item.productId === productId && item.color === color && item.size === size)
    ));
  };

  const updateQuantity = (productId: string, color: string, size: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId && item.color === color && item.size === size
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
