import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConversationInputBarProps {
  onNewAudit: () => void;
}

export function ConversationInputBar({ onNewAudit }: ConversationInputBarProps) {
  return (
    <div className="sticky bottom-0 z-20 bg-card border-t border-border px-3 py-2 safe-area-bottom">
      <Button
        onClick={onNewAudit}
        className="w-full gap-2"
      >
        <Plus className="h-4 w-4" />
        Nova Auditoria
      </Button>
    </div>
  );
}
