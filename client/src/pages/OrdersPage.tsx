import { Navbar } from "@/components/layout/Navbar";
import { useMyOrders } from "@/hooks/use-orders";
import { SectionLoader } from "@/components/ui/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Package, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function OrdersPage() {
  const { data: orders, isLoading } = useMyOrders();

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-8 tracking-tight">My Orders</h1>

        {isLoading ? (
          <SectionLoader />
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-lg">
            <Package className="mx-auto h-12 w-12 text-neutral-600 mb-4" />
            <h2 className="text-xl text-white mb-2">No orders found</h2>
            <p className="text-neutral-500 mb-6">You haven't placed any orders yet.</p>
            <Link href="/products">
              <button className="bg-white text-black px-6 py-2 rounded-none font-bold uppercase tracking-widest hover:bg-neutral-200 transition-colors">
                Start Shopping
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="bg-white/[0.03] border-white/10 hover:bg-white/[0.05] transition-colors cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-neutral-500">{order.id}</span>
                          <Badge variant="outline" className="rounded-none border-white/20 text-white uppercase text-[10px] tracking-widest">
                            {order.status}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-serif text-white">
                          {order.items.length} {order.items.length === 1 ? 'Item' : 'Items'}
                        </h3>
                        <p className="text-sm text-neutral-500">
                          Placed on {format(new Date(order.createdAt), "PPP")}
                        </p>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-8">
                        <div className="text-right">
                          <p className="text-sm text-neutral-500 uppercase tracking-widest">Total</p>
                          <p className="text-xl font-bold text-white">₹{order.total.toLocaleString()}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-neutral-600 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
