import { create } from 'zustand';
import { Role } from '@/types';

interface UserData {
  id: string;
  username: string;
  role: Role;
  organizationId: string;
  organizationName: string;
}

interface AuthState {
  user: UserData | null;
  loading: boolean;
  setUser: (user: UserData | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null, loading: false }),
}));
