import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: authData, isLoading } = useQuery({
    queryKey: ["/api/auth/status"],
    retry: false,
  });

  return {
    isAuthenticated: (authData as any)?.authenticated === true,
    isLoading,
    user: (authData as any)?.user,
  };
}