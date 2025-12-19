import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import type { SensoScore } from '@/lib/reports/reportTypes';
import { SENSO_CONFIG, SensoKey } from '@/lib/reports/reportTypes';

interface SensoRadarChartProps {
  data: SensoScore[];
  size?: 'sm' | 'md' | 'lg';
}

export function SensoRadarChart({ data, size = 'md' }: SensoRadarChartProps) {
  const chartData = data.map(item => ({
    senso: item.senso,
    score: item.score,
    fullMark: 100,
  }));

  const heights = {
    sm: 200,
    md: 280,
    lg: 350,
  };

  return (
    <div style={{ width: '100%', height: heights[size] }}>
      <ResponsiveContainer>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis 
            dataKey="senso" 
            tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]} 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.5}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface SensoBarChartProps {
  data: SensoScore[];
}

export function SensoBarChart({ data }: SensoBarChartProps) {
  return (
    <div className="space-y-3">
      {data.map((senso) => {
        const config = SENSO_CONFIG[senso.senso as SensoKey];
        return (
          <div key={senso.senso} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{senso.senso}</span>
              <span className="text-muted-foreground">
                {senso.score.toFixed(0)}% ({senso.conforme}/{senso.total})
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${senso.score}%`,
                  backgroundColor: config?.color || 'hsl(var(--primary))'
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
