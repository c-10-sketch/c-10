import { Navbar } from "@/components/layout/Navbar";
import { useOrder } from "@/hooks/use-orders";
import { SectionLoader } from "@/components/ui/loader";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ChevronLeft, MapPin, Phone, User, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useOrder(id || "");
  const { toast } = useToast();

  const cancelOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order Cancelled",
        description: "Your order has been cancelled successfully."
      });
    }
  });

  if (isLoading) return <SectionLoader />;
  if (!order) return <div className="text-center py-20 text-white">Order not found</div>;

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this order?")) {
      cancelOrder.mutate(order.id);
    }
  };

  const canCancel = ["Pending", "Accepted"].includes(order.status);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <Link href="/orders">
            <Button variant="ghost" className="text-neutral-400 pl-0 hover:text-white">
              <ChevronLeft className="mr-2 h-4 w-4" /> Back to Orders
            </Button>
          </Link>

          {canCancel && (
            <Button 
              variant="destructive" 
              size="sm" 
              className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors"
              onClick={handleCancel}
              disabled={cancelOrder.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" /> 
              {cancelOrder.isPending ? "Cancelling..." : "Cancel Order"}
            </Button>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-serif font-bold text-white tracking-tight">{order.id}</h1>
              <Badge className="bg-white text-black rounded-none uppercase text-xs tracking-widest">
                {order.status}
              </Badge>
            </div>
            <p className="text-neutral-500">Ordered on {format(new Date(order.createdAt), "PPP p")}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-neutral-500 uppercase tracking-widest">Total Amount</p>
            <p className="text-3xl font-bold text-white">₹{order.total.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Items */}
            <div className="space-y-4">
              <h2 className="text-xl font-serif text-white border-b border-white/10 pb-2">Order Items</h2>
              {order.items.map((item, i) => (
                <div key={i} className="flex gap-4 p-4 bg-white/[0.02] border border-white/10">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{item.name}</h3>
                    <div className="flex gap-4 mt-1 text-xs text-neutral-500 uppercase tracking-wider">
                      <span>Color: {item.color}</span>
                      <span>Size: {item.size}</span>
                      <span>Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">₹{(item.price * item.quantity).toLocaleString()}</p>
                    <p className="text-xs text-neutral-500">₹{item.price.toLocaleString()} each</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {/* Customer Details */}
            <div className="bg-white/[0.03] border border-white/10 p-6 space-y-6">
              <h2 className="text-lg font-serif text-white mb-4 flex items-center gap-2">
                <User className="h-4 w-4" /> Customer Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] mb-1">Full Name</p>
                  <p className="text-white">{order.customerName}</p>
                </div>
                
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-neutral-500 mt-1" />
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] mb-1">Phone</p>
                    <p className="text-white">{order.customerPhone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-neutral-500 mt-1" />
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] mb-1">Delivery Address</p>
                    <p className="text-white whitespace-pre-wrap leading-relaxed">{order.customerAddress}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Need Help? */}
            <div className="p-6 border border-white/10 bg-neutral-900/50">
              <h3 className="text-white font-serif mb-2">Need help with your order?</h3>
              <p className="text-sm text-neutral-500 mb-4">Contact our support team for any queries regarding delivery or returns.</p>
              <a 
                href={`https://wa.me/918617528664?text=Hi, I need help with my order ${order.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-white text-black py-3 text-sm font-bold uppercase tracking-widest hover:bg-neutral-200 transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
