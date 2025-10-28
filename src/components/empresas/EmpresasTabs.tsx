import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EmpresasTabsProps {
  activeTab: "list" | "overview";
  onTabChange: (tab: "list" | "overview") => void;
}

export const EmpresasTabs = ({ activeTab, onTabChange }: EmpresasTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as any)}>
      <TabsList className="w-full justify-start h-auto p-1">
        <TabsTrigger
          value="list"
          className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
        >
          Listagem
        </TabsTrigger>
        <TabsTrigger
          value="overview"
          className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
        >
          Overview 5S
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
