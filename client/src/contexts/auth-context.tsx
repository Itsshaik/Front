import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { generateIdentityKeyPair } from "@/lib/encryption";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, displayName: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user data is in localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/auth/login", { username, password });
      const userData = await response.json();
      
      // Generate keys if not already present
      if (!userData.publicKey || !userData.identityKey) {
        try {
          const { publicKey, privateKey } = await generateIdentityKeyPair();
          
          const keysResponse = await apiRequest("POST", `/api/users/${userData.id}/keys`, {
            publicKey: publicKey.toString('base64'),
            identityKey: privateKey.toString('base64'),
          });
          
          const updatedUserData = await keysResponse.json();
          setUser(updatedUserData);
          localStorage.setItem("user", JSON.stringify(updatedUserData));
        } catch (error) {
          console.error("Failed to generate or store keys:", error);
          toast({
            title: "Key Generation Failed",
            description: "Could not generate encryption keys for secure messaging.",
            variant: "destructive",
          });
          return false;
        }
      } else {
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      }
      
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      toast({
        title: "Login Failed",
        description: "Invalid username or password.",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  };

  const register = async (username: string, password: string, displayName: string) => {
    try {
      setIsLoading(true);
      
      // Generate identity key pair for the new user
      const { publicKey, privateKey } = await generateIdentityKeyPair();
      
      // Register the user
      const registerResponse = await apiRequest("POST", "/api/auth/register", {
        username,
        password,
        displayName,
      });
      
      if (!registerResponse.ok) {
        const error = await registerResponse.json();
        throw new Error(error.message || "Registration failed");
      }
      
      const userData = await registerResponse.json();
      
      // Update user with keys
      const keysResponse = await apiRequest("POST", `/api/users/${userData.id}/keys`, {
        publicKey: publicKey.toString('base64'),
        identityKey: privateKey.toString('base64'),
      });
      
      if (!keysResponse.ok) {
        const error = await keysResponse.json();
        throw new Error(error.message || "Failed to update user keys");
      }
      
      const updatedUserData = await keysResponse.json();
      setUser(updatedUserData);
      localStorage.setItem("user", JSON.stringify(updatedUserData));
      
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Registration failed:", error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Registration failed. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
