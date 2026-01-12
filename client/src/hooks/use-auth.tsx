import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, InsertUser, LoginRequest } from "@shared/schema";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  loginMutation: ReturnType<typeof useLogin>;
  logoutMutation: ReturnType<typeof useLogout>;
  registerMutation: ReturnType<typeof useRegister>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function useLogin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      queryClient.setQueryData([api.auth.me.path], data.user);
      toast({ title: "Welcome back", description: `Signed in as ${data.user.name}` });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Login failed", description: error.message });
    },
  });
}

function useRegister() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Registration failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      // Some register endpoints might return user/token directly, but our current one returns message/userId
      // If we want auto-login after register, we'd need to change backend.
      toast({ title: "Account created", description: "Please log in with your new account." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Registration failed", description: error.message });
    },
  });
}

function useLogout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem("token");
      return true; 
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      toast({ title: "Logged out", description: "See you soon." });
    },
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) return null;
      
      const res = await fetch(api.auth.me.path, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        return null;
      }
      if (!res.ok) throw new Error("Failed to fetch user");
      return await res.json();
    },
    retry: false,
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const registerMutation = useRegister();

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        token: localStorage.getItem("token"),
        isLoading,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
