import { Navbar } from "@/components/layout/Navbar";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateOrder, useProducts } from "@/hooks/use-orders";

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, itemCount } = useCart();
  const { user } = useAuth();
  const { data: products } = useProducts();
  const createOrder = useCreateOrder();
  
  const [step, setStep] = useState<"cart" | "checkout">("cart");

  // Checkout State
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  // Detailed address state
  const [village, setVillage] = useState("");
  const [postOffice, setPostOffice] = useState("");
  const [policeStation, setPoliceStation] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");

  const handleCheckout = () => {
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    setStep("checkout");
  };

  const handlePlaceOrder = () => {
    if (!user) return;
    
    const fullAddress = `${village}, ${postOffice}, ${policeStation}, PIN: ${pinCode}, ${district}, ${state}`;
    
    createOrder.mutate({
      userId: user.id,
      customerName: name,
      customerPhone: phone,
      customerAddress: fullAddress,
      items: items.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
        price: item.price,
        productUrl: window.location.origin + item.url
      }))
    }, {
      onSuccess: (data) => {
        // WhatsApp Redirect in new tab
        const message = `Hello, I've placed an order (ID: ${data.id}) on C10 Store.\nTotal: ₹${data.total}\n\nPlease confirm my order.`;
        const waLink = `https://wa.me/918617528664?text=${encodeURIComponent(message)}`;
        window.open(waLink, '_blank');
        
        // Clear cart and redirect to order details
        items.forEach(item => removeItem(item.productId, item.color, item.size));
        window.location.href = `/orders/${data.id}`;
      }
    });
  };

  if (step === "checkout") {
    return (
      <div className="min-h-screen bg-background text-foreground pb-20">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" onClick={() => setStep("cart")} className="mb-6 text-neutral-400 pl-0 hover:text-white">
            ← Back to Cart
          </Button>
          
          <h1 className="text-3xl font-serif font-bold text-white mb-8">Checkout</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-xl font-medium text-white">Shipping Details</h2>
              
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border-white/10" required />
              </div>
              
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-white/5 border-white/10" required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Village / Area</Label>
                  <Input value={village} onChange={e => setVillage(e.target.value)} className="bg-white/5 border-white/10" required />
                </div>
                <div className="space-y-2">
                  <Label>Post Office</Label>
                  <Input value={postOffice} onChange={e => setPostOffice(e.target.value)} className="bg-white/5 border-white/10" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Police Station</Label>
                  <Input value={policeStation} onChange={e => setPoliceStation(e.target.value)} className="bg-white/5 border-white/10" required />
                </div>
                <div className="space-y-2">
                  <Label>PIN Code</Label>
                  <Input value={pinCode} onChange={e => setPinCode(e.target.value)} className="bg-white/5 border-white/10" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>District</Label>
                  <Input value={district} onChange={e => setDistrict(e.target.value)} className="bg-white/5 border-white/10" required />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={state} onChange={e => setState(e.target.value)} className="bg-white/5 border-white/10" required />
                </div>
              </div>
            </div>

            <div className="bg-white/5 p-6 h-fit">
              <h2 className="text-xl font-medium text-white mb-4">Order Summary</h2>
              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
                {items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-neutral-400">{item.name} x{item.quantity}</span>
                    <span className="text-white">₹{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-white/10 pt-4 flex justify-between items-center mb-6">
                <span className="text-lg font-bold">Total</span>
                <span className="text-lg font-bold">₹{total.toLocaleString()}</span>
              </div>
              
              <Button 
                className="w-full bg-white text-black hover:bg-neutral-200 h-12 text-base font-bold uppercase tracking-widest"
                onClick={handlePlaceOrder}
                disabled={!name || !phone || !village || !postOffice || !policeStation || !pinCode || !district || !state || createOrder.isPending}
              >
                {createOrder.isPending ? "Processing..." : "Confirm via WhatsApp"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-8 tracking-tight">Shopping Bag ({itemCount})</h1>
        
        {items.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10">
            <h2 className="text-2xl text-white mb-4">Your bag is empty</h2>
            <Link href="/products">
              <Button className="bg-white text-black hover:bg-neutral-200 uppercase tracking-widest">
                Continue Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8 space-y-6">
              {items.map((item) => (
                <div key={`${item.productId}-${item.color}-${item.size}`} className="flex gap-4 p-4 border border-white/10 bg-white/[0.02]">
                  <div className="h-24 w-24 bg-neutral-900 shrink-0">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link href={item.url} className="text-lg font-serif text-white hover:underline">{item.name}</Link>
                        <div className="text-sm text-neutral-500 mt-1 uppercase tracking-wide">
                          {item.color} / {item.size}
                        </div>
                      </div>
                      <p className="font-medium text-white">₹{item.price.toLocaleString()}</p>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline" size="icon" className="h-8 w-8 rounded-none border-neutral-700"
                          onClick={() => updateQuantity(item.productId, item.color, item.size, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button 
                          variant="outline" size="icon" className="h-8 w-8 rounded-none border-neutral-700"
                          onClick={() => {
                            const product = products?.find((p: any) => p.id === item.productId);
                            const maxStock = product?.stock ?? 999;
                            updateQuantity(item.productId, item.color, item.size, Math.min(maxStock, item.quantity + 1));
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:text-red-300 hover:bg-transparent px-0"
                        onClick={() => removeItem(item.productId, item.color, item.size)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="lg:col-span-4">
              <div className="bg-white/5 p-6 sticky top-24">
                <h3 className="text-lg font-serif text-white mb-6">Order Summary</h3>
                <div className="flex justify-between mb-4 text-sm text-neutral-400">
                  <span>Subtotal</span>
                  <span className="text-white">₹{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-6 text-sm text-neutral-400">
                  <span>Shipping</span>
                  <span className="text-white">Calculated at Checkout</span>
                </div>
                <div className="border-t border-white/10 pt-4 flex justify-between items-center mb-8">
                  <span className="text-lg font-bold text-white">Total</span>
                  <span className="text-lg font-bold text-white">₹{total.toLocaleString()}</span>
                </div>
                
                <Button 
                  className="w-full h-12 bg-white text-black hover:bg-neutral-200 uppercase tracking-widest font-bold"
                  onClick={handleCheckout}
                >
                  Checkout <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
