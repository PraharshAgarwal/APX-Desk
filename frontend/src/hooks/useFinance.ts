import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useBalance(businessId: string | null) {
  return useQuery({
    queryKey: ['balance', businessId],
    queryFn: async () => (await api.get(`/finance/balance/${businessId}`)).data.data,
    enabled: !!businessId,
  });
}

export function useAllBalances() {
  return useQuery({
    queryKey: ['all-balances'],
    queryFn: async () => (await api.get('/finance/balances')).data.data,
  });
}

export function useLedger(businessId: string | null, page = 1) {
  return useQuery({
    queryKey: ['ledger', businessId, page],
    queryFn: async () => (await api.get(`/finance/ledger/${businessId}?page=${page}`)).data,
    enabled: !!businessId,
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      businessId: string;
      amount: number;
      method: string;
      reference?: string;
      invoiceId?: string;
    }) => (await api.post('/finance/payments', data)).data.data,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['balance', vars.businessId] });
      qc.invalidateQueries({ queryKey: ['ledger', vars.businessId] });
      qc.invalidateQueries({ queryKey: ['all-balances'] });
    },
  });
}

export function useInvoices(businessId?: string) {
  return useQuery({
    queryKey: ['invoices', businessId],
    queryFn: async () => (await api.get(`/finance/invoices${businessId ? `?businessId=${businessId}` : ''}`)).data.data,
  });
}
