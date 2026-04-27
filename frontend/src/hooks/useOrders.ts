import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function useOrders(filters: { status?: string; businessId?: string; page?: number } = {}) {
  const { user, primaryRole } = useAuthStore();
  const role = primaryRole();

  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.businessId) params.set('businessId', filters.businessId);
  if (filters.page) params.set('page', String(filters.page));

  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => (await api.get(`/orders?${params}`)).data,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => (await api.get(`/orders/${id}`)).data.data,
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      businessId: string;
      warehouseId?: string;
      items: { productId: string; quantity: number }[];
      notes?: string;
    }) => (await api.post('/orders', data)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useChangeOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status, notes }: { orderId: string; status: string; notes?: string }) =>
      (await api.patch(`/orders/${orderId}/status`, { status, notes })).data.data,
    onSuccess: (_, { orderId }) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', orderId] });
    },
  });
}
