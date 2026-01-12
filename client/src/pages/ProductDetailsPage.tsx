import { useRoute } from "wouter";
import { useProduct } from "@/hooks/use-products";
import { Navbar } from "@/components/layout/Navbar";
import { FullPageLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Star, Minus, Plus, Heart, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { api, buildUrl } from "@shared/routes";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { InsertReview, Review } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

export default function ProductDetailsPage() {
  const [, params] = useRoute("/products/:id");
  const { data: product, isLoading } = useProduct(params?.id || "");
  const { addItem } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);

  // Set default image once product loads
  useEffect(() => {
    if (product && product.images.length > 0) {
      setSelectedImage(product.images[0]);
    }
  }, [product]);

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: [api.reviews.list.path, params?.id],
    enabled: !!params?.id,
    queryFn: async () => {
      const res = await fetch(buildUrl(api.reviews.list.path, { id: params!.id }));
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    }
  });

  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
    : 0;

  if (isLoading) return <FullPageLoader />;
  if (!product) return <div className="min-h-screen flex items-center justify-center text-white">Product not found</div>;

  const handleAddToCart = () => {
    if (!selectedColor || !selectedSize) return;
    addItem(product, selectedColor, selectedSize, quantity);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description,
        url: url,
      }).catch(() => {
        navigator.clipboard.writeText(url);
        toast({ title: "Link copied to clipboard" });
      });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard" });
    }
  };

  const discountValue = product.originalPrice - product.finalPrice;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />
      
      <div className="container mx-auto px-0 md:px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* IMAGE SECTION (Flipkart Style) */}
          <div className="lg:col-span-7 flex flex-col-reverse lg:flex-row gap-4">
            
            {/* Thumbnails (Vertical list on desktop) */}
            <div className="hidden lg:flex flex-col gap-4 w-24 h-[600px] overflow-y-auto pr-2 scrollbar-hide">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={cn(
                    "relative aspect-[3/4] w-full overflow-hidden border-2 transition-all",
                    selectedImage === img ? "border-white opacity-100" : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <img src={img} alt={`View ${idx}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            {/* Mobile Thumbnails (Horizontal list) */}
            <div className="flex lg:hidden gap-3 overflow-x-auto px-4 pb-4 scrollbar-hide">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={cn(
                    "relative flex-none aspect-[3/4] w-20 overflow-hidden border-2 rounded-sm transition-all",
                    selectedImage === img ? "border-white opacity-100" : "border-transparent opacity-60"
                  )}
                >
                  <img src={img} alt={`View ${idx}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            {/* Main Preview */}
            <div className="flex-1 relative aspect-[3/4] bg-neutral-900 overflow-hidden lg:h-[600px]">
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  src={selectedImage}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </AnimatePresence>
              
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                 <Button size="icon" variant="secondary" className="rounded-full h-10 w-10 bg-black/50 text-white backdrop-blur-md hover:bg-white hover:text-black">
                   <Heart className="h-5 w-5" />
                 </Button>
                 <Button 
                   size="icon" 
                   variant="secondary" 
                   className="rounded-full h-10 w-10 bg-black/50 text-white backdrop-blur-md hover:bg-white hover:text-black"
                   onClick={handleShare}
                 >
                   <Share2 className="h-5 w-5" />
                 </Button>
              </div>
            </div>
          </div>

          {/* PRODUCT DETAILS SECTION */}
          <div className="lg:col-span-5 px-4 lg:px-0 space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-white">
                {product.name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <div className="flex text-yellow-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={cn(
                        "h-4 w-4", 
                        star <= Math.round(averageRating) ? "fill-current" : "text-neutral-600"
                      )} 
                    />
                  ))}
                </div>
                <span>({reviews.length} Reviews)</span>
              </div>
            </div>

            <div className="flex items-baseline gap-4 border-b border-white/10 pb-6">
              <span className="text-3xl font-bold text-white">₹{product.finalPrice.toLocaleString()}</span>
              {product.discount > 0 && (
                <>
                  <span className="text-xl text-neutral-500 line-through">₹{product.originalPrice.toLocaleString()}</span>
                  <span className="text-green-500 font-bold uppercase text-sm">
                    {product.discount}% OFF
                  </span>
                </>
              )}
              <Badge variant="outline" className="text-neutral-400 border-neutral-800 ml-auto">
                {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
              </Badge>
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
              <span className="text-sm uppercase tracking-widest text-neutral-500 font-bold">Select Color</span>
              <div className="flex flex-wrap gap-3">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "px-4 py-2 border text-sm font-medium transition-all uppercase",
                      selectedColor === color 
                        ? "border-white bg-white text-black" 
                        : "border-neutral-700 bg-transparent text-white hover:border-neutral-500"
                    )}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm uppercase tracking-widest text-neutral-500 font-bold">Select Size</span>
                <button className="text-xs underline text-neutral-400">Size Guide</button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={cn(
                      "py-3 border text-sm font-medium transition-all uppercase",
                      selectedSize === size
                        ? "border-white bg-white text-black"
                        : "border-neutral-700 bg-transparent text-white hover:border-neutral-500"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-3">
              <span className="text-sm uppercase tracking-widest text-neutral-500 font-bold">Quantity</span>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" size="icon" 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="rounded-none border-neutral-700"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg w-8 text-center">{quantity}</span>
                <Button 
                  variant="outline" size="icon"
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="rounded-none border-neutral-700"
                  disabled={quantity >= product.stock}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4">
               <Button 
                 size="lg" 
                 className="w-full h-14 text-base font-bold uppercase tracking-widest rounded-none bg-white text-black hover:bg-neutral-200"
                 disabled={!selectedColor || !selectedSize || !product.enabled || product.stock <= 0}
                 onClick={handleAddToCart}
               >
                 {!product.enabled ? "Currently Unavailable" : product.stock <= 0 ? "Out of Stock" : "Add to Bag"}
               </Button>
               {(!selectedColor || !selectedSize) && product.enabled && (
                 <p className="text-center text-red-400 text-sm mt-2">Please select a size and color</p>
               )}
            </div>

            {/* Description */}
            <div className="pt-8 border-t border-white/10 space-y-4">
              <h3 className="font-serif text-xl text-white">Description</h3>
              <p className="text-neutral-400 leading-relaxed">
                {product.description}
              </p>
            </div>
            
            <ReviewsSection productId={product.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewsSection({ productId }: { productId: string }) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: [api.reviews.list.path, productId],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.reviews.list.path, { id: productId }));
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    }
  });

  const createReview = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.reviews.create.path, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit review");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.reviews.list.path, productId] });
      toast({ title: "Review Submitted" });
      setComment("");
      setRating(0);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: error.message });
    }
  });

  const handleSubmit = () => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to leave a review.", variant: "destructive" });
      return;
    }
    if (rating === 0) return toast({ variant: "destructive", title: "Rating required" });
    createReview.mutate({
      productId,
      rating,
      comment
    });
  };

  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState("");
  const [editRating, setEditRating] = useState(0);

  const deleteReview = useMutation({
    mutationFn: async (reviewId: string) => {
      const res = await fetch(buildUrl(api.reviews.delete.path, { id: reviewId }), {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
      });
      if (!res.ok) throw new Error("Failed to delete review");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.reviews.list.path, productId] });
      toast({ title: "Review deleted" });
    }
  });

  const updateReview = useMutation({
    mutationFn: async ({ id, rating, comment }: { id: string, rating: number, comment: string }) => {
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, comment }),
      });
      if (!res.ok) throw new Error("Failed to update review");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.reviews.list.path, productId] });
      toast({ title: "Review updated" });
      setEditingReviewId(null);
    }
  });

  return (
    <div className="pt-8 border-t border-white/10 space-y-6">
      <h3 className="font-serif text-xl text-white">Reviews</h3>
      
      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-neutral-500 text-sm">No reviews yet. Be the first to review!</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-white/5 p-4 rounded-sm space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{review.userName}</p>
                    {(user?.role === 'admin' || user?.id === review.userId) && (
                      <div className="flex items-center gap-3 ml-2">
                        {user?.id === review.userId && !editingReviewId && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingReviewId(review.id);
                              setEditComment(review.comment);
                              setEditRating(review.rating);
                            }}
                            className="h-7 px-2 text-xs text-neutral-400 hover:text-white hover:bg-white/10"
                          >
                            Edit
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteReview.mutate(review.id)}
                          className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex text-yellow-500 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={cn("h-3 w-3", i < review.rating ? "fill-current" : "text-neutral-600")} />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-neutral-500">{new Date(review.date).toLocaleDateString()}</span>
              </div>
              {editingReviewId === review.id ? (
                <div className="space-y-4 mt-4 p-4 bg-white/5 border border-white/10 rounded-md">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Update Rating</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => setEditRating(star)} className="hover:scale-110 transition-transform">
                          <Star className={cn("h-5 w-5", editRating >= star ? "fill-yellow-500 text-yellow-500" : "text-neutral-600")} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Update Comment</span>
                    <Textarea 
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      className="bg-black/50 border-white/10 text-white min-h-[100px] text-sm focus-visible:ring-white/20 resize-none"
                      placeholder="Update your review..."
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button 
                      size="sm"
                      onClick={() => updateReview.mutate({ id: review.id, rating: editRating, comment: editComment })}
                      disabled={updateReview.isPending}
                      className="bg-white text-black hover:bg-neutral-200"
                    >
                      {updateReview.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setEditingReviewId(null)}
                      className="border-white/10 text-white hover:bg-white/5"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-neutral-400 leading-relaxed">{review.comment}</p>
              )}
            </div>
          ))
        )}
      </div>

      {user ? (
        <div className="bg-white/5 p-6 space-y-4">
          <h4 className="font-medium text-white">Write a Review</h4>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Your Rating</span>
            <div className="flex gap-1">
               {[1, 2, 3, 4, 5].map((star) => (
                 <button key={star} onClick={() => setRating(star)} className="hover:scale-110 transition-transform">
                   <Star className={cn("h-6 w-6", rating >= star ? "fill-yellow-500 text-yellow-500" : "text-neutral-600")} />
                 </button>
               ))}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Your Comment</span>
            <Textarea 
              placeholder="Share your thoughts about this product..." 
              className="bg-black/50 border-white/10 text-white min-h-[120px] focus-visible:ring-white/20 resize-none"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={createReview.isPending}
            className="bg-white text-black hover:bg-neutral-200 h-11 px-8 font-bold uppercase tracking-widest text-xs"
          >
            {createReview.isPending ? "Submitting..." : "Post Review"}
          </Button>
        </div>
      ) : (
        <div className="p-4 bg-white/5 text-center text-neutral-400 text-sm">
          Please <a href="/auth" className="text-white underline">log in</a> to leave a review.
        </div>
      )}
    </div>
  );
}
