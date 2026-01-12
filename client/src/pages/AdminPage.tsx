import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProducts, useCreateProduct, useDeleteProduct, useUpdateProduct } from "@/hooks/use-products";
import { useAllOrders, useUpdateOrderStatus } from "@/hooks/use-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { InsertProduct, Product } from "@shared/schema";
import { Trash2, Edit, Plus, Eye, Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user || user.role !== "admin") {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-serif font-bold text-white mb-8">Admin Dashboard</h1>
        
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="bg-neutral-900 border border-white/10 mb-8">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="products">
            <ProductsTab />
          </TabsContent>
          
          <TabsContent value="orders">
            <OrdersTab />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: settings, isLoading } = useQuery<any>({ queryKey: ["/api/settings"] });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateSettings = useMutation({
    mutationFn: async (updates: any) => {
      const res = await apiRequest("PATCH", "/api/settings", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings updated" });
    }
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card className="bg-neutral-900 border-white/10 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          General Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="space-y-0.5">
            <Label className="text-base">Email OTP Verification</Label>
            <p className="text-sm text-neutral-400">Require users to verify their email via OTP during registration</p>
          </div>
          <Switch 
            checked={settings.emailVerificationEnabled}
            onCheckedChange={(checked) => updateSettings.mutate({ emailVerificationEnabled: checked })}
          />
        </div>

        <div className="space-y-2">
          <Label>OTP Send API URL</Label>
          <div className="flex gap-2">
            <Input 
              defaultValue={settings.otpApiUrl} 
              className="bg-black/50 border-white/10" 
              onBlur={(e) => updateSettings.mutate({ otpApiUrl: e.target.value })}
            />
          </div>
          <p className="text-xs text-neutral-500">Google Script URL for sending OTP emails</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>OTP Resend Interval (seconds)</Label>
            <Input
              type="number"
              min={0}
              defaultValue={settings.otpResendIntervalSeconds ?? 60}
              className="bg-black/50 border-white/10"
              onBlur={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!Number.isNaN(value) && value >= 0) {
                  updateSettings.mutate({ otpResendIntervalSeconds: value });
                }
              }}
            />
            <p className="text-xs text-neutral-500">
              Minimum time a user must wait before requesting another OTP for the same email.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Max OTP Sends per Email (per hour)</Label>
            <Input
              type="number"
              min={1}
              defaultValue={settings.otpMaxPerEmailPerHour ?? 5}
              className="bg-black/50 border-white/10"
              onBlur={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!Number.isNaN(value) && value >= 1) {
                  updateSettings.mutate({ otpMaxPerEmailPerHour: value });
                }
              }}
            />
            <p className="text-xs text-neutral-500">
              Limits how many OTP codes can be sent to the same email address within a rolling hour.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductsTab() {
  const { data: products } = useProducts();
  const deleteProduct = useDeleteProduct();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [stock, setStock] = useState("0");
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [colors, setColors] = useState<string[]>([""]);
  const [sizes, setSizes] = useState<string[]>([""]);

  const resetForm = () => {
    setName("");
    setDesc("");
    setPrice("0");
    setDiscount("0");
    setStock("0");
    setImageUrls([""]);
    setColors([""]);
    setSizes([""]);
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setDesc(product.description);
    setPrice(product.originalPrice.toString());
    setDiscount(product.discount.toString());
    setStock((product as any).stock?.toString() || "0");
    setImageUrls(product.images.length > 0 ? product.images : [""]);
    setColors(product.colors.length > 0 ? product.colors : [""]);
    setSizes(product.sizes.length > 0 ? product.sizes : [""]);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const data: InsertProduct = {
      name,
      description: desc,
      originalPrice: Number(price),
      discount: Number(discount),
      stock: Number(stock),
      images: imageUrls.filter(Boolean),
      colors: colors.filter(Boolean),
      sizes: sizes.filter(Boolean),
      enabled: true
    };
    
    if (editingProduct) {
      updateProduct.mutate({ id: editingProduct.id, data }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          resetForm();
        }
      });
    } else {
      createProduct.mutate(data, {
        onSuccess: () => {
          setIsDialogOpen(false);
          resetForm();
        }
      });
    }
  };

  const addField = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, ""]);
  };

  const updateField = (index: number, value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removeField = (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Product Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-white text-black hover:bg-neutral-200"><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="bg-neutral-900 border-white/10 text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} className="bg-black/50 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={desc} onChange={e => setDesc(e.target.value)} className="bg-black/50 border-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="bg-black/50 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label>Discount %</Label>
                  <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="bg-black/50 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label>Stock Quantity</Label>
                  <Input type="number" value={stock} onChange={e => setStock(e.target.value)} className="bg-black/50 border-white/10" />
                </div>
              </div>

              {/* Dynamic Images */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Image URLs</Label>
                  <Button variant="ghost" size="sm" onClick={() => addField(setImageUrls)} className="h-6 px-2 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                {imageUrls.map((url, i) => (
                  <div key={i} className="flex gap-2">
                    <Input 
                      value={url} 
                      onChange={e => updateField(i, e.target.value, setImageUrls)} 
                      placeholder="https://..." 
                      className="bg-black/50 border-white/10" 
                    />
                    {imageUrls.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeField(i, setImageUrls)} className="text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Dynamic Colors */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Available Colors</Label>
                  <Button variant="ghost" size="sm" onClick={() => addField(setColors)} className="h-6 px-2 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {colors.map((color, i) => (
                    <div key={i} className="flex gap-2">
                      <Input 
                        value={color} 
                        onChange={e => updateField(i, e.target.value, setColors)} 
                        placeholder="e.g. Black" 
                        className="bg-black/50 border-white/10" 
                      />
                      {colors.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeField(i, setColors)} className="text-red-400 h-9 w-9">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Sizes */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Available Sizes</Label>
                  <Button variant="ghost" size="sm" onClick={() => addField(setSizes)} className="h-6 px-2 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {sizes.map((size, i) => (
                    <div key={i} className="flex gap-2">
                      <Input 
                        value={size} 
                        onChange={e => updateField(i, e.target.value, setSizes)} 
                        placeholder="e.g. XL" 
                        className="bg-black/50 border-white/10" 
                      />
                      {sizes.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeField(i, setSizes)} className="text-red-400 h-9 w-9">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleSubmit} className="w-full bg-white text-black mt-4" disabled={createProduct.isPending || updateProduct.isPending}>
                {editingProduct ? "Update Product" : "Create Product"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border border-white/10 rounded-md overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white">Image</TableHead>
              <TableHead className="text-white">Name</TableHead>
              <TableHead className="text-white">Price</TableHead>
              <TableHead className="text-white">Stock</TableHead>
              <TableHead className="text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products?.map((product) => (
              <TableRow key={product.id} className="border-white/10 hover:bg-white/5">
                <TableCell>
                  <img src={product.images[0]} alt="" className="h-12 w-12 object-cover" />
                </TableCell>
                <TableCell className="font-medium text-white">{product.name}</TableCell>
                <TableCell className="text-neutral-400">₹{product.finalPrice}</TableCell>
                <TableCell className="text-neutral-400">{(product as any).stock ?? 0}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="hover:bg-white/10"
                      onClick={() => handleEdit(product)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-400 hover:text-red-300 hover:bg-white/10"
                      onClick={() => deleteProduct.mutate(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function OrdersTab() {
  const { data: orders } = useAllOrders();
  const updateStatus = useUpdateOrderStatus();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [confirmUpdate, setConfirmUpdate] = useState<{ id: string, status: string } | null>(null);

  const filteredOrders = orders?.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (id: string, status: string) => {
    setConfirmUpdate({ id, status });
  };

  const executeUpdate = () => {
    if (confirmUpdate) {
      updateStatus.mutate({ id: confirmUpdate.id, status: confirmUpdate.status as any });
      setConfirmUpdate(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold text-white">Order Management</h2>
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <Input 
            placeholder="Search by Order ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black/50 border-white/10 text-white w-full md:w-64"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px] bg-black/50 border-white/10 text-white">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-white/10 text-white">
              <SelectItem value="all">All Orders</SelectItem>
              {["Pending", "Accepted", "Out for Delivery", "Delivered", "Cancelled"].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      <Dialog open={!!confirmUpdate} onOpenChange={(open) => !open && setConfirmUpdate(null)}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Confirm Status Update</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to update the status of order <strong>{confirmUpdate?.id}</strong> to <strong>{confirmUpdate?.status}</strong>?</p>
          </div>
          <div className="flex justify-end gap-4">
            <Button variant="ghost" onClick={() => setConfirmUpdate(null)} className="text-white hover:bg-white/10">No, Cancel</Button>
            <Button onClick={executeUpdate} className="bg-white text-black hover:bg-neutral-200">Yes, Update</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="border border-white/10 rounded-md overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white">Order ID</TableHead>
              <TableHead className="text-white">Customer</TableHead>
              <TableHead className="text-white">Total</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders?.map((order) => (
              <TableRow key={order.id} className="border-white/10 hover:bg-white/5">
                <TableCell className="font-mono text-xs text-neutral-400">{order.id}</TableCell>
                <TableCell className="text-white">{order.customerName}</TableCell>
                <TableCell className="text-white">₹{order.total}</TableCell>
                <TableCell>
                  <Select 
                    value={order.status} 
                    onValueChange={(val) => handleStatusChange(order.id, val)}
                  >
                    <SelectTrigger className="w-[140px] h-8 bg-transparent border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-white/10 text-white">
                      {["Pending", "Accepted", "Out for Delivery", "Delivered", "Cancelled"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                        <Eye className="h-4 w-4 mr-2" /> View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-neutral-900 border-white/10 text-white max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Order Details: {order.id}</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-8 py-4">
                         <div>
                            <h4 className="font-bold text-neutral-400 text-xs uppercase tracking-widest mb-2">Customer</h4>
                            <p>{order.customerName}</p>
                            <p>{order.customerPhone}</p>
                            <p className="mt-2 text-sm text-neutral-400 whitespace-pre-wrap">{order.customerAddress}</p>
                         </div>
                         <div>
                            <h4 className="font-bold text-neutral-400 text-xs uppercase tracking-widest mb-2">Items</h4>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                              {order.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span>{item.name} ({item.size}) x{item.quantity}</span>
                                  <span>₹{item.price * item.quantity}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between font-bold">
                              <span>Total</span>
                              <span>₹{order.total}</span>
                            </div>
                         </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
