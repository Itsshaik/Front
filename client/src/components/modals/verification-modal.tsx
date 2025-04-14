import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AvatarWithStatus } from "@/components/ui/avatar-with-status";
import { ArrowLeftRight, QrCode } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { User } from "@shared/schema";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: User & { isVerified?: boolean };
  onVerify: () => Promise<void>;
}

export function VerificationModal({
  isOpen,
  onClose,
  contact,
  onVerify,
}: VerificationModalProps) {
  const { user } = useAuth();
  const [isVerifying, setIsVerifying] = React.useState(false);
  
  // Generate fake security code numbers for display
  const securityCodeNumbers = React.useMemo(() => {
    const numbers = [];
    for (let i = 0; i < 12; i++) {
      numbers.push(Math.floor(Math.random() * 100).toString().padStart(2, '0'));
    }
    return numbers;
  }, [contact.id]);
  
  const handleVerify = async () => {
    setIsVerifying(true);
    await onVerify();
    setIsVerifying(false);
    onClose();
  };
  
  if (!user || !contact) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Verify Security Code</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center mb-4">
            <AvatarWithStatus name={user.displayName || user.username} size="md" />
            <ArrowLeftRight className="mx-3 text-zinc-500" />
            <AvatarWithStatus name={contact.displayName || contact.username} size="md" />
          </div>
          
          <p className="text-center text-sm mb-4">
            To verify that your messages and calls with {contact.displayName || contact.username} are end-to-end encrypted, compare the security code shown below with the code on their device.
          </p>
          
          <div className="bg-zinc-100 p-4 rounded-lg w-full mb-4">
            <div className="grid grid-cols-4 gap-2">
              {securityCodeNumbers.map((number, index) => (
                <div key={index} className="bg-white p-2 rounded text-center font-mono">
                  {number}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col items-center mb-4">
            <div className="w-48 h-48 bg-zinc-100 flex items-center justify-center p-2">
              <div className="w-full h-full border-4 border-zinc-300 p-6 flex items-center justify-center">
                <QrCode className="h-24 w-24 text-zinc-500" />
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Scan this code with {contact.displayName || contact.username}'s device
            </p>
          </div>
          
          <div className="flex w-full">
            <Button variant="outline" className="flex-1 mr-2" onClick={onClose}>
              Later
            </Button>
            <Button 
              className="flex-1 bg-emerald-500 hover:bg-emerald-600" 
              onClick={handleVerify}
              disabled={isVerifying}
            >
              {isVerifying ? "Verifying..." : "Verified"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
