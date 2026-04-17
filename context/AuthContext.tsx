"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";

type User = { id: string; name: string; email: string; role: string };
type AuthCtx = {
  user: User | null;
  token: string | null;
  isAuthed: boolean;
  isGuest: boolean;
  setAuth: (u: User, t: string) => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const createGuestSession = async () => {
    try {
      const response = await axios.post("/api/auth/guest");
      if (response.data.token) {
        const guestToken = response.data.token;
        localStorage.setItem("guestToken", guestToken);
        setToken(guestToken);
        setIsGuest(true);
        setUser({ id: "guest", name: "Guest User", email: "", role: "guest" });
      }
    } catch (error) {
      console.error("Failed to create guest session:", error);
      // Even if this fails, mark as guest so ProtectedRoute lets them through
      setIsGuest(true);
      setUser({ id: "guest", name: "Guest User", email: "", role: "guest" });
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const t = localStorage.getItem("token");
      const u = localStorage.getItem("user");
      const guestToken = localStorage.getItem("guestToken");

      if (t && u) {
        setToken(t);
        try {
          setUser(JSON.parse(u));
          setIsGuest(false);
        } catch {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          await createGuestSession();
        }
      } else if (guestToken) {
        try {
          const payload = parseJwt(guestToken);
          if (payload?.exp && payload.exp * 1000 < Date.now()) {
            localStorage.removeItem("guestToken");
            await createGuestSession();
          } else {
            setToken(guestToken);
            setIsGuest(true);
            setUser({ id: "guest", name: "Guest User", email: "", role: "guest" });
          }
        } catch {
          await createGuestSession();
        }
      } else {
        await createGuestSession();
      }

      setIsInitialized(true);
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAuth = (u: User, t: string) => {
    localStorage.removeItem("guestToken");
    setUser(u);
    setToken(t);
    setIsGuest(false);
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsGuest(false);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("guestToken");
    localStorage.removeItem("guestChatMessages");
    createGuestSession();
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthed: !!token && !isGuest,
      isGuest,
      setAuth,
      logout,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, token, isGuest]
  );

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen text-white bg-gray-950">
        <div className="text-center">
          <div className="mb-2 text-xl">Loading…</div>
          <div className="text-sm text-gray-400">Initializing SigmaGPT</div>
        </div>
      </div>
    );
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
