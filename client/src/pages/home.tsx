import React, { useState, useEffect } from "react";
import { ContactsSidebar } from "@/components/contacts/contacts-sidebar";
import { ConversationArea } from "@/components/conversation/conversation-area";
import { ProfilePanel } from "@/components/profile/profile-panel";
import { SettingsModal } from "@/components/modals/settings-modal";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Lock, Shield, Settings, LogOut } from "lucide-react";
import { AvatarWithStatus } from "@/components/ui/avatar-with-status";
import { initializeSignalProtocol } from "@/lib/signal";

export default function Home() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize Signal Protocol
  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      initializeSignalProtocol().then(() => {
        setIsInitialized(true);
      });
    }
  }, [isAuthenticated, isInitialized]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);
  
  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-100">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-primary rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-zinc-200 rounded mb-2"></div>
          <div className="h-3 w-24 bg-zinc-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  const handleLogout = () => {
    logout();
    setLocation("/login");
  };
  
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 py-3 px-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-primary font-semibold text-xl flex items-center">
            <Lock className="h-5 w-5 mr-2" />
            SecureChat
          </div>
          <div className="ml-4 flex items-center text-xs text-emerald-500">
            <Shield className="h-3 w-3 mr-1" />
            <span>End-to-End Encrypted</span>
          </div>
        </div>
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="p-2 text-zinc-600 rounded-full"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            className="p-2 text-zinc-600 rounded-full ml-1"
            onClick={handleLogout}
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
          <div className="ml-3 flex items-center">
            <AvatarWithStatus name={user.displayName || user.username} size="sm" />
            <span className="ml-2 font-medium">
              {user.displayName || user.username}
            </span>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <ContactsSidebar />
        <ConversationArea onOpenProfile={() => setIsProfileOpen(true)} />
        <ProfilePanel isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      </div>
      
      {/* Modals */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
