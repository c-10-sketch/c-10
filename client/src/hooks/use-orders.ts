import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertOrder } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useMyOrders() {
  return useQuery({
    queryKey: [api.orders.list.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.orders.list.path);
      return api.orders.list.responses[200].parse(await res.json());
    },
  });
}

export function useAllOrders() {
  return useQuery({
    queryKey: [api.orders.listAll.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.orders.listAll.path);
      return api.orders.listAll.responses[200].parse(await res.json());
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: [api.orders.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.orders.get.path, { id });
      const res = await apiRequest("GET", url);
      return api.orders.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertOrder) => {
      const res = await apiRequest("POST", api.orders.create.path, data);
      return api.orders.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Order failed", description: err.message });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const url = buildUrl(api.orders.updateStatus.path, { id });
      const res = await apiRequest("PATCH", url, { status });
      return api.orders.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.listAll.path] });
      toast({ title: "Status updated" });
    },
  });
}

export function useProducts() {
  return useQuery({
    queryKey: [api.products.list.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.products.list.path);
      return api.products.list.responses[200].parse(await res.json());
    },
  });
}
