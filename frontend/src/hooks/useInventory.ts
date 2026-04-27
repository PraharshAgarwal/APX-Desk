import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useBatches(filters: { warehouseId?: string; productId?: string; nearExpiry?: boolean } = {}) {
  const params = new URLSearchParams();
  if (filters.warehouseId) params.set('warehouseId', filters.warehouseId);
  if (filters.productId)   params.set('productId', filters.productId);
  if (filters.nearExpiry)  params.set('nearExpiry', 'true');

  return useQuery({
    queryKey: ['inventory-batches', filters],
    queryFn: async () => (await api.get(`/inventory/batches?${params}`)).data,
  });
}

export function useStockSummary() {
  return useQuery({
    queryKey: ['stock-summary'],
    queryFn: async () => (await api.get('/inventory/stock')).data.data,
    staleTime: 60 * 1000,
  });
}

export function useNearExpiry() {
  return useQuery({
    queryKey: ['near-expiry'],
    queryFn: async () => (await api.get('/inventory/near-expiry')).data.data,
  });
}

export function useAdjustBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      batchId: string;
      reason: string;
      quantityDelta: number;
      notes?: string;
    }) => (await api.post('/inventory/adjust', data)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-batches'] });
      qc.invalidateQueries({ queryKey: ['stock-summary'] });
    },
  });
}
