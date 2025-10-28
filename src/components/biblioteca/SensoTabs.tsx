import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SensoType } from "@/types/criteria";
import { Criteria } from "@/types/criteria";

interface SensoTabsProps {
  criteria: Criteria[];
  activeTab: SensoType | "Todos";
  onTabChange: (tab: SensoType | "Todos") => void;
}

const SensoTabs = ({ criteria, activeTab, onTabChange }: SensoTabsProps) => {
  const getCriteriaCount = (senso: SensoType | "Todos") => {
    if (senso === "Todos") return criteria.length;
    return criteria.filter((c) => c.senso === senso).length;
  };

  const tabs = [
    { value: "Todos", label: "Todos" },
    { value: "1S", label: "1S - Utilização" },
    { value: "2S", label: "2S - Organização" },
    { value: "3S", label: "3S - Limpeza" },
    { value: "4S", label: "4S - Padronização" },
    { value: "5S", label: "5S - Disciplina" },
  ] as const;

  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as any)}>
      <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="whitespace-nowrap data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            {tab.label} ({getCriteriaCount(tab.value as any)})
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default SensoTabs;
