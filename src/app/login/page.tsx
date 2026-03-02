'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useApi } from '@/hooks/useApi';
import { LoginForm } from '@/components/auth/LoginForm';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Role } from '@/types';

export default function LoginPage() {
  const { user, loading, setUser, setLoading } = useAuthStore();
  const api = useApi();
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await api.auth.me();
        setUser({
          id: data.user.id as string,
          username: data.user.username as string,
          role: data.user.role as Role,
          organizationId: data.user.organizationId as string,
          organizationName: data.user.organizationName as string,
        });
      } catch {
        setLoading(false);
      }
    }
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8" style={{ color: 'var(--accent)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <LoginForm />
    </ThemeProvider>
  );
}
