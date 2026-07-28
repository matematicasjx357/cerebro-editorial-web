/**
 * =============================================================================
 * CEREBRO EDITORIAL — DashboardFilters
 * =============================================================================
 *
 * Componente de filtros visuales para el Dashboard.
 * Permite filtrar las métricas y datos mostrados por:
 *   - Proyecto
 *   - Campaña (status, fecha)
 *   - Plataforma
 *   - Periodo de tiempo
 *   - Tipo de contenido
 *
 * Se conecta con las rutas tRPC del backend para obtener datos filtrados.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Filter,
  Calendar,
  X,
  RotateCcw,
  ChevronDown,
} from "lucide-react";

// =============================================================================
// TIPOS
// =============================================================================

export type DashboardFilterState = {
  projectId: number | null;
  campaignStatus: string;
  platform: string;
  dateFrom: string;
  dateTo: string;
  contentType: string;
  jobStatus: string;
};

interface DashboardFiltersProps {
  filters: DashboardFilterState;
  onFiltersChange: (filters: DashboardFilterState) => void;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function DashboardFilters({
  filters,
  onFiltersChange,
}: DashboardFiltersProps) {
  // Datos para los selectores
  const { data: projects = [] } = trpc.projects.list.useQuery();
  const { data: campaigns = [] } = trpc.campaigns.list.useQuery();
  const { data: automationPlatforms = [] } = trpc.automation.platforms.useQuery();

  // Estado para expandir/colapsar filtros avanzados
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Contar filtros activos
  const activeFilterCount = Object.values(filters).filter((v) => {
    if (v === null) return false;
    if (v === "") return false;
    if (v === "all") return false;
    return true;
  }).length;

  const updateFilter = (key: keyof DashboardFilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      projectId: null,
      campaignStatus: "all",
      platform: "all",
      dateFrom: "",
      dateTo: "",
      contentType: "all",
      jobStatus: "all",
    });
  };

  // Obtener plataformas únicas de las campañas
  const uniquePlatforms = new Set<string>();
  campaigns.forEach((c: any) => {
    if (c.platforms) {
      try {
        const platforms = JSON.parse(c.platforms);
        platforms.forEach((p: string) => uniquePlatforms.add(p));
      } catch {}
    }
  });
  // Añadir plataformas de automatización
  automationPlatforms.forEach((p: string) => uniquePlatforms.add(p));

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {activeFilterCount} activo{activeFilterCount > 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-7 text-xs gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Limpiar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-7 text-xs gap-1"
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              />
              Avanzados
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filtros principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Filtro por Proyecto */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Proyecto
            </label>
            <Select
              value={filters.projectId ? String(filters.projectId) : "all"}
              onValueChange={(val) =>
                updateFilter("projectId", val === "all" ? null : Number(val))
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Todos los proyectos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proyectos</SelectItem>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                    {p.status !== "active" && (
                      <span className="text-muted-foreground text-xs ml-1">
                        ({p.status})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Estado de Campaña */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Estado de Campaña
            </label>
            <Select
              value={filters.campaignStatus}
              onValueChange={(val) => updateFilter("campaignStatus", val)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Activas
                  </span>
                </SelectItem>
                <SelectItem value="paused">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Pausadas
                  </span>
                </SelectItem>
                <SelectItem value="completed">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Completadas
                  </span>
                </SelectItem>
                <SelectItem value="draft">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    Borrador
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Plataforma */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Plataforma
            </label>
            <Select
              value={filters.platform}
              onValueChange={(val) => updateFilter("platform", val)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Todas las plataformas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las plataformas</SelectItem>
                {Array.from(uniquePlatforms).map((p) => (
                  <SelectItem key={p} value={p}>
                    {getPlatformLabel(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Estado de Job */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Estado de Trabajos
            </label>
            <Select
              value={filters.jobStatus}
              onValueChange={(val) => updateFilter("jobStatus", val)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Pendientes
                  </span>
                </SelectItem>
                <SelectItem value="in_progress">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    En progreso
                  </span>
                </SelectItem>
                <SelectItem value="completed">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Completados
                  </span>
                </SelectItem>
                <SelectItem value="error">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Errores
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filtros avanzados */}
        {showAdvanced && (
          <>
            <Separator className="my-4" />
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Filtros Avanzados
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Rango de fechas */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Fecha desde
                  </label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      updateFilter("dateFrom", e.target.value)
                    }
                    className="h-9 text-sm"
                    placeholder="Fecha desde"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Fecha hasta
                  </label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter("dateTo", e.target.value)}
                    className="h-9 text-sm"
                    placeholder="Fecha hasta"
                  />
                </div>

                {/* Filtro por Tipo de Contenido */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Tipo de Contenido
                  </label>
                  <Select
                    value={filters.contentType}
                    onValueChange={(val) => updateFilter("contentType", val)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="image">Imagen</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="mixed">Mixto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tags de filtros activos */}
        {activeFilterCount > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.projectId && (
              <FilterTag
                label={`Proyecto: ${projects.find((p: any) => p.id === filters.projectId)?.name || "N/A"}`}
                onRemove={() => updateFilter("projectId", null)}
              />
            )}
            {filters.campaignStatus !== "all" && (
              <FilterTag
                label={`Estado: ${getStatusLabel(filters.campaignStatus)}`}
                onRemove={() => updateFilter("campaignStatus", "all")}
              />
            )}
            {filters.platform !== "all" && (
              <FilterTag
                label={`Plataforma: ${getPlatformLabel(filters.platform)}`}
                onRemove={() => updateFilter("platform", "all")}
              />
            )}
            {filters.jobStatus !== "all" && (
              <FilterTag
                label={`Trabajos: ${getStatusLabel(filters.jobStatus)}`}
                onRemove={() => updateFilter("jobStatus", "all")}
              />
            )}
            {filters.contentType !== "all" && (
              <FilterTag
                label={`Tipo: ${filters.contentType}`}
                onRemove={() => updateFilter("contentType", "all")}
              />
            )}
            {filters.dateFrom && (
              <FilterTag
                label={`Desde: ${filters.dateFrom}`}
                onRemove={() => updateFilter("dateFrom", "")}
              />
            )}
            {filters.dateTo && (
              <FilterTag
                label={`Hasta: ${filters.dateTo}`}
                onRemove={() => updateFilter("dateTo", "")}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// COMPONENTES AUXILIARES
// =============================================================================

/** Tag individual de filtro activo */
function FilterTag({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1 text-xs">
      {label}
      <button
        onClick={onRemove}
        className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </Badge>
  );
}

/** Obtener label legible de una plataforma */
function getPlatformLabel(platform: string): string {
  const labels: Record<string, string> = {
    wordpress: "WordPress",
    youtube: "YouTube",
    tiktok: "TikTok",
    twitter: "Twitter/X",
    facebook: "Facebook",
    instagram: "Instagram",
  };
  return labels[platform] || platform;
}

/** Obtener label legible de un estado */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "Activas",
    paused: "Pausadas",
    completed: "Completadas",
    draft: "Borrador",
    pending: "Pendientes",
    in_progress: "En progreso",
    error: "Errores",
  };
  return labels[status] || status;
}
