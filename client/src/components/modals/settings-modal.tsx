import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Key, Fingerprint, Shield, UserMinus, Timer } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user } = useAuth();
  const [securityNotifications, setSecurityNotifications] = React.useState(true);
  const [readReceipts, setReadReceipts] = React.useState(true);
  
  if (!user) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-3">Security</h3>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Key className="h-4 w-4 text-primary mr-2" />
                  <span>Manage Encryption Keys</span>
                </div>
                <Button variant="link" className="p-0 h-auto">View</Button>
              </div>
              <p className="text-xs text-zinc-500">View and manage your encryption key pairs</p>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Fingerprint className="h-4 w-4 text-primary mr-2" />
                  <span>Identity Verification</span>
                </div>
                <Button variant="link" className="p-0 h-auto">Setup</Button>
              </div>
              <p className="text-xs text-zinc-500">Configure how contacts can verify your identity</p>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 text-primary mr-2" />
                  <span>Security Notifications</span>
                </div>
                <Switch
                  checked={securityNotifications}
                  onCheckedChange={setSecurityNotifications}
                />
              </div>
              <p className="text-xs text-zinc-500">Get alerted about security-related events</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-3">Privacy</h3>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <UserMinus className="h-4 w-4 text-primary mr-2" />
                  <span>Read Receipts</span>
                </div>
                <Switch
                  checked={readReceipts}
                  onCheckedChange={setReadReceipts}
                />
              </div>
              <p className="text-xs text-zinc-500">Show when you've read messages</p>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Timer className="h-4 w-4 text-primary mr-2" />
                  <span>Message Expiration</span>
                </div>
                <Button variant="link" className="p-0 h-auto">Configure</Button>
              </div>
              <p className="text-xs text-zinc-500">Set messages to disappear after a certain time</p>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose} className="bg-primary w-full">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
