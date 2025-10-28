import { useState } from "react";
import { Company } from "@/types/company";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail } from "lucide-react";

interface SendEmailModalProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: () => void;
}

export function SendEmailModal({ 
  company, 
  open, 
  onOpenChange, 
  onSend 
}: SendEmailModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sendCopy, setSendCopy] = useState(false);

  const handleSend = () => {
    onSend();
    onOpenChange(false);
    setSubject('');
    setMessage('');
    setSendCopy(false);
  };

  if (!company) return null;

  const isValid = subject.trim().length > 0 && message.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6" />
            <div>
              <DialogTitle>Enviar Email</DialogTitle>
              <p className="text-sm text-muted-foreground">{company.name}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="to">Para *</Label>
            <Input
              id="to"
              value={company.admin.email}
              disabled
              className="bg-muted"
            />
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="send-copy"
                checked={sendCopy}
                onCheckedChange={(checked) => setSendCopy(checked as boolean)}
              />
              <Label htmlFor="send-copy" className="cursor-pointer font-normal text-sm">
                Enviar cópia para mim (admin@ifa.com.br)
              </Label>
            </div>
          </div>

          <div>
            <Label htmlFor="subject">Assunto *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Atualização sobre seus modelos 5S"
              required
            />
          </div>

          <div>
            <Label htmlFor="message">Mensagem *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={8}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length} caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={!isValid}>
            <Mail className="h-4 w-4 mr-2" />
            Enviar Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
