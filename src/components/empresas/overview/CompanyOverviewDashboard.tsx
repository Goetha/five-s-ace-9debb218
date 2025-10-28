import { useState, useMemo } from "react";
import { OverviewStatsCards } from "./OverviewStatsCards";
import { OverviewFilters } from "./OverviewFilters";
import { Company5SCard } from "./Company5SCard";
import { Company } from "@/types/company";
import { MasterModel } from "@/types/model";

interface CompanyOverviewDashboardProps {
  companies: Company[];
  models: MasterModel[];
}

export const CompanyOverviewDashboard = ({ companies, models }: CompanyOverviewDashboardProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score-desc");

  const filteredCompanies = useMemo(() => {
    let filtered = [...companies];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Score filter
    if (scoreFilter !== "all" && filtered.length > 0) {
      filtered = filtered.filter((c) => {
        const score = c.fiveSData?.average_5s_score || 0;
        switch (scoreFilter) {
          case "excellent":
            return score >= 9;
          case "good":
            return score >= 7 && score < 9;
          case "needs-improvement":
            return score >= 4 && score < 7;
          case "critical":
            return score < 4;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      const aScore = a.fiveSData?.average_5s_score || 0;
      const bScore = b.fiveSData?.average_5s_score || 0;
      const aLastAudit = a.fiveSData?.last_audit_date || "";
      const bLastAudit = b.fiveSData?.last_audit_date || "";

      switch (sortBy) {
        case "score-desc":
          return bScore - aScore;
        case "score-asc":
          return aScore - bScore;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "last-audit":
          return new Date(bLastAudit).getTime() - new Date(aLastAudit).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [companies, searchTerm, scoreFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <OverviewStatsCards companies={companies} />

      {/* Filters */}
      <OverviewFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        scoreFilter={scoreFilter}
        onScoreFilterChange={setScoreFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />

      {/* Companies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCompanies.map((company) => (
          <Company5SCard key={company.id} company={company} models={models} />
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhuma empresa encontrada com os filtros selecionados</p>
        </div>
      )}
    </div>
  );
};
