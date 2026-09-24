import { useEffect, useState, type ReactNode } from "react";

import { AuthContext, type User } from "./authcontext";


const API_URL = import.meta.env.VITE_API_URL;

interface AuthResponse {
  message?: string;
  user?: User;
}

/** Parse a JSON body without assuming the response is JSON. */
async function parseResponse(response: Response): Promise<AuthResponse> {
  const text = await response.text();
  try {
    return JSON.parse(text) as AuthResponse;
  } catch {
    return { message: text.trim() || response.statusText || "Request failed" };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/auth/me`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setUser(data.user);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function login(email: string, password: string) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      throw new Error(data.message ?? "Login failed");
    }

    setUser(data.user ?? null);
  }

  async function register(email: string, username: string, password: string) {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        username,
        password,
      }),
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      throw new Error(data.message ?? "Registration failed");
    }
  }

  async function logout() {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    setUser(null);
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
