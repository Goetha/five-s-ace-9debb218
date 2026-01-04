import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConversationInputBarProps {
  onNewAudit: () => void;
}

export function ConversationInputBar({ onNewAudit }: ConversationInputBarProps) {
  return (
    <div className="sticky bottom-0 z-20 bg-card border-t border-border px-4 py-3 safe-area-bottom">
      <Button
        onClick={onNewAudit}
        className="w-full gap-2"
        size="lg"
      >
        <Plus className="h-5 w-5" />
        Nova Auditoria
      </Button>
    </div>
  );
}
