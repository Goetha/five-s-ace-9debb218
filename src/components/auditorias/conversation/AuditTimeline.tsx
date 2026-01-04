import { useMemo, useRef, useEffect } from "react";
import { format, isSameDay } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DateDivider } from "./DateDivider";
import { AuditMessageBubble } from "./AuditMessageBubble";

interface AuditData {
  id: string;
  location_id: string;
  location_name: string;
  environment_name: string;
  area_name: string;
  score: number | null;
  status: string;
  started_at: string;
  completed_at: string | null;
}

interface AuditTimelineProps {
  audits: AuditData[];
  onAuditClick: (auditId: string) => void;
  isLoading?: boolean;
}

export function AuditTimeline({ audits, onAuditClick, isLoading }: AuditTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ordenar auditorias por data (mais antigas primeiro para timeline)
  const sortedAudits = useMemo(() => {
    return [...audits].sort(
      (a, b) =>
        new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    );
  }, [audits]);

  // Agrupar por data
  const groupedByDate = useMemo(() => {
    const groups: { date: Date; audits: AuditData[] }[] = [];
    let currentGroup: { date: Date; audits: AuditData[] } | null = null;

    for (const audit of sortedAudits) {
      const auditDate = new Date(audit.started_at);

      if (!currentGroup || !isSameDay(currentGroup.date, auditDate)) {
        currentGroup = { date: auditDate, audits: [audit] };
        groups.push(currentGroup);
      } else {
        currentGroup.audits.push(audit);
      }
    }

    return groups;
  }, [sortedAudits]);

  // Scroll para o final quando carregar
  useEffect(() => {
    if (scrollRef.current && !isLoading) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }, [audits, isLoading]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (audits.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl">📋</span>
        </div>
        <h3 className="font-medium text-foreground mb-1">Nenhuma auditoria</h3>
        <p className="text-sm text-muted-foreground">
          Inicie uma nova auditoria para esta empresa
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1" ref={scrollRef}>
      <div
        className="min-h-full py-4 space-y-2"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {groupedByDate.map((group, groupIndex) => (
          <div key={groupIndex}>
            <DateDivider date={group.date} />
            <div className="space-y-2">
              {group.audits.map((audit) => (
                <AuditMessageBubble
                  key={audit.id}
                  id={audit.id}
                  locationName={audit.location_name}
                  environmentName={audit.environment_name}
                  areaName={audit.area_name}
                  score={audit.score}
                  status={audit.status}
                  startedAt={audit.started_at}
                  completedAt={audit.completed_at}
                  onClick={() => onAuditClick(audit.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
