import { Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConversationInputBarProps {
  onNewAudit: () => void;
}

export function ConversationInputBar({ onNewAudit }: ConversationInputBarProps) {
  return (
    <div className="sticky bottom-0 z-20 bg-muted/95 backdrop-blur-sm border-t px-2 py-2 safe-area-bottom">
      <div className="flex items-center gap-2">
        {/* Botão + */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 flex-shrink-0"
          onClick={onNewAudit}
        >
          <Plus className="h-6 w-6 text-muted-foreground" />
        </Button>

        {/* Input Fake */}
        <button
          onClick={onNewAudit}
          className="flex-1 bg-background border rounded-full px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          Iniciar nova auditoria...
        </button>

        {/* Botão Enviar */}
        <Button
          size="icon"
          className="h-10 w-10 rounded-full flex-shrink-0"
          onClick={onNewAudit}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
