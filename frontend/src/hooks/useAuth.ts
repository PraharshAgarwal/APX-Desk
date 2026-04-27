import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function useLogin() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await api.post('/auth/login', { email, password });
      return res.data.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      qc.clear();
      router.push('/dashboard');
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const { logout, refreshToken } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout', { refreshToken });
    },
    onSettled: () => {
      logout();
      qc.clear();
      router.replace('/login');
    },
  });
}

export function useMe() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data.data,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
