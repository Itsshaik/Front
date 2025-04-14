import React from "react";
import { AvatarWithStatus } from "@/components/ui/avatar-with-status";
import { Button } from "@/components/ui/button";
import { X, Shield, QrCode, FileText, Image, Link, BellOff, Trash } from "lucide-react";
import { useMessages } from "@/contexts/message-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { VerificationModal } from "@/components/modals/verification-modal";

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfilePanel({ isOpen, onClose }: ProfilePanelProps) {
  const { selectedContact, verifyContact } = useMessages();
  const [isVerificationModalOpen, setIsVerificationModalOpen] = React.useState(false);
  
  if (!selectedContact) {
    return null;
  }
  
  const handleVerify = async () => {
    await verifyContact(selectedContact.id);
    setIsVerificationModalOpen(false);
  };
  
  return (
    <>
      <div className={`w-80 border-l border-zinc-200 bg-white h-full ${!isOpen && "hidden md:block"}`}>
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="font-medium">Contact Info</h2>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-4 flex flex-col items-center border-b border-zinc-200">
          <AvatarWithStatus
            name={selectedContact.displayName || selectedContact.username}
            isOnline={selectedContact.status === "Available"}
            size="xl"
          />
          <h3 className="mt-3 text-xl font-medium">
            {selectedContact.displayName || selectedContact.username}
          </h3>
          <p className="text-sm text-zinc-500">{selectedContact.status}</p>
        </div>
        
        <div className="p-4 border-b border-zinc-200">
          <h3 className="text-sm font-medium text-zinc-500 mb-3">Encryption Info</h3>
          <div className="bg-zinc-100 p-3 rounded-lg">
            <div className="flex items-center mb-2">
              <Shield className="h-4 w-4 text-emerald-500 mr-2" />
              <span className="text-sm font-medium">End-to-End Encrypted</span>
            </div>
            <p className="text-xs text-zinc-500">
              Messages and calls are secured with end-to-end encryption. Not even we can read or listen to them.
            </p>
          </div>
          
          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsVerificationModalOpen(true)}
            >
              <QrCode className="h-4 w-4 mr-2" />
              Verify Security Code
            </Button>
          </div>
        </div>
        
        <div className="p-4 border-b border-zinc-200">
          <h3 className="text-sm font-medium text-zinc-500 mb-3">Files & Media</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-100 aspect-square rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-zinc-500" />
            </div>
            <div className="bg-zinc-100 aspect-square rounded-lg flex items-center justify-center">
              <Image className="h-5 w-5 text-zinc-500" />
            </div>
            <div className="bg-zinc-100 aspect-square rounded-lg flex items-center justify-center">
              <Link className="h-5 w-5 text-zinc-500" />
            </div>
          </div>
          <Button variant="link" className="mt-3 h-auto p-0 text-primary text-sm">
            View All
          </Button>
        </div>
        
        <div className="p-4">
          <h3 className="text-sm font-medium text-zinc-500 mb-3">Actions</h3>
          <Button
            variant="ghost"
            className="w-full justify-start text-zinc-600 mb-2 h-auto py-3"
          >
            <BellOff className="h-4 w-4 mr-2" />
            Mute Notifications
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 h-auto py-3"
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete Conversation
          </Button>
        </div>
      </div>
      
      <VerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        contact={selectedContact}
        onVerify={handleVerify}
      />
    </>
  );
}
