import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardFilters, {
  type DashboardFilterState,
} from "@/components/DashboardFilters";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Zap,
  Radio,
  Network,
  Rocket,
  Bot,
  FileText,
  Brain,
  TrendingUp,
  Globe,
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useLocation } from "wouter";

// =============================================================================
// ESTADO INICIAL DE FILTROS
// =============================================================================

const defaultFilters: DashboardFilterState = {
  projectId: null,
  campaignStatus: "all",
  platform: "all",
  dateFrom: "",
  dateTo: "",
  contentType: "all",
  jobStatus: "all",
};

// =============================================================================
// TIPOS DE MÉTRICAS
// =============================================================================

type BaseMetrics = {
  activeCampaigns: number;
  scheduledPublications: number;
  botStatus: string;
  connectedChannels: number;
  pendingJobs: number;
  errorJobs: number;
  totalProjects: number;
};

type FilteredMetrics = BaseMetrics & {
  inProgressJobs: number;
  completedJobs: number;
  totalCampaigns: number;
  filteredCampaigns: number;
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [filters, setFilters] = useState<DashboardFilterState>(defaultFilters);

  // Determinar si hay filtros activos
  const hasActiveFilters = useMemo(() => {
    return (
      filters.projectId !== null ||
      filters.campaignStatus !== "all" ||
      filters.platform !== "all" ||
      filters.jobStatus !== "all" ||
      filters.dateFrom !== "" ||
      filters.dateTo !== ""
    );
  }, [filters]);

  // Query de métricas filtradas (se usa cuando hay filtros activos)
  const { data: filteredMetrics, isLoading: isLoadingFiltered } =
    trpc.dashboard.filteredMetrics.useQuery(
      {
        projectId: filters.projectId || undefined,
        campaignStatus: filters.campaignStatus,
        platform: filters.platform,
        jobStatus: filters.jobStatus,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      },
      {
        enabled: hasActiveFilters,
        refetchOnWindowFocus: false,
      }
    );

  // Query de métricas base (sin filtros)
  const { data: metrics, isLoading: isLoadingBase } =
    trpc.dashboard.metrics.useQuery(undefined, {
      enabled: !hasActiveFilters,
      refetchOnWindowFocus: false,
    });

  // Query de campañas filtradas
  const { data: filteredCampaigns = [] } =
    trpc.dashboard.filteredCampaigns.useQuery(
      {
        projectId: filters.projectId || undefined,
        status: filters.campaignStatus !== "all" ? filters.campaignStatus : undefined,
        platform: filters.platform !== "all" ? filters.platform : undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      },
      {
        enabled: hasActiveFilters,
        refetchOnWindowFocus: false,
      }
    );

  // Query de jobs filtrados
  const { data: filteredJobs = [] } =
    trpc.dashboard.filteredJobs.useQuery(
      {
        projectId: filters.projectId || undefined,
        status: filters.jobStatus !== "all" ? filters.jobStatus : undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      },
      {
        enabled: hasActiveFilters,
        refetchOnWindowFocus: false,
      }
    );

  // Query de todos los datos para las secciones sin filtro
  const { data: allProjects = [] } = trpc.projects.list.useQuery();
  const { data: allCampaigns = [] } = trpc.campaigns.list.useQuery();
  const { data: allJobs = [] } = trpc.automationJobs.list.useQuery();

  const isLoading = isLoadingBase || isLoadingFiltered;

  // Determinar qué métricas mostrar (con cast de tipo)
  const displayMetrics = hasActiveFilters && filteredMetrics
    ? (filteredMetrics as FilteredMetrics)
    : (metrics as BaseMetrics | undefined);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!displayMetrics) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Error al cargar las métricas. Verifica la conexión con la base de datos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =============================================================================
  // DATOS PARA LAS TARJETAS DE MÉTRICAS
  // =============================================================================

  const dm = displayMetrics as FilteredMetrics;
  const totalCampaigns = dm.totalCampaigns !== undefined ? dm.totalCampaigns : allCampaigns.length;

  const metricCards = [
    {
      title: "Campañas Activas",
      value: dm.activeCampaigns,
      icon: Activity,
      description: "Campañas en ejecución",
      color: "bg-blue-500",
      path: "/campaigns",
      trend: totalCampaigns > 0
        ? Math.round((dm.activeCampaigns / totalCampaigns) * 100)
        : 0,
    },
    {
      title: "Publicaciones Programadas",
      value: dm.scheduledPublications,
      icon: Zap,
      description: "Contenidos pendientes",
      color: "bg-amber-500",
      path: "/campaigns",
    },
    {
      title: "Estado del Bot",
      value: dm.botStatus === "active" ? "Activo" : "Inactivo",
      icon: Radio,
      description: "Estado de automatización",
      color: dm.botStatus === "active" ? "bg-green-500" : "bg-gray-500",
      path: "/automation",
    },
    {
      title: "Canales Conectados",
      value: dm.connectedChannels,
      icon: Network,
      description: "Plataformas disponibles",
      color: "bg-purple-500",
    },
  ];

  // Campañas recientes (filtradas o todas)
  const recentCampaigns = hasActiveFilters
    ? filteredCampaigns.slice(0, 5)
    : allCampaigns.slice(0, 5);

  // Jobs recientes (filtrados o todos)
  const recentJobs = hasActiveFilters
    ? filteredJobs.slice(0, 5)
    : allJobs.slice(0, 5);

  // Jobs counts
  const pendingCount = dm.pendingJobs;
  const errorCount = dm.errorJobs;
  const inProgressCount = dm.inProgressJobs !== undefined ? dm.inProgressJobs : allJobs.filter((j: any) => j.status === "in_progress").length;
  const completedCount = dm.completedJobs !== undefined ? dm.completedJobs : allJobs.filter((j: any) => j.status === "completed").length;

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Resumen de tu actividad editorial
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Globe className="w-3 h-3" />
          Cerebro Editorial v1.0
        </Badge>
      </div>

      {/* DashboardFilters — Integrado */}
      <DashboardFilters filters={filters} onFiltersChange={setFilters} />

      {/* Indicador de filtros activos */}
      {hasActiveFilters && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-3 flex items-center gap-3">
            <FilterIcon className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">
              Mostrando datos filtrados. Se mostraron{" "}
              <span className="font-medium">{totalCampaigns} campañas</span>{" "}
              y{" "}
              <span className="font-medium">{allJobs.length} trabajos</span>{" "}
              antes de filtrar.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card
              key={metric.title}
              className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => metric.path && navigate(metric.path)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                  <div className={`${metric.color} p-2 rounded-lg text-white`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold">{metric.value}</div>
                  {metric.trend !== undefined && metric.trend > 0 && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="w-3 h-3" />
                      {metric.trend}%
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Access + Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Proyectos */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/projects")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="w-5 h-5" /> Proyectos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dm.totalProjects}</p>
            <p className="text-xs text-muted-foreground mt-1">Proyectos editoriales</p>
            <div className="flex gap-2 mt-3">
              <Badge variant="outline" className="text-xs">
                {allProjects.filter((p: any) => p.status === "active").length} activos
              </Badge>
              <Badge variant="outline" className="text-xs">
                {allProjects.filter((p: any) => p.status === "draft").length} borrador
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Trabajos de Automatización */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/automation")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="w-5 h-5" /> Trabajos de Automatización
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 rounded-lg bg-amber-50">
                <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-50">
                <p className="text-xl font-bold text-red-600">{errorCount}</p>
                <p className="text-xs text-muted-foreground">Errores</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-blue-50">
                <p className="text-xl font-bold text-blue-600">{inProgressCount}</p>
                <p className="text-xs text-muted-foreground">En progreso</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-green-50">
                <p className="text-xl font-bold text-green-600">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Completados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prompts Maestros */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/prompts")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5" /> Prompts Maestros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Accede a tus plantillas de prompts para generar contenido
            </p>
            <div className="mt-3 flex gap-2">
              <Badge variant="secondary" className="text-xs">Plantillas reutilizables</Badge>
              <Badge variant="secondary" className="text-xs">Tags inteligentes</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity — Campañas y Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campañas Recientes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" /> Campañas Recientes
              </CardTitle>
              <button onClick={() => navigate("/campaigns")} className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todas <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <CardDescription>
              {hasActiveFilters
                ? `${filteredCampaigns.length} campañas filtradas`
                : "Últimas campañas creadas"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">No hay campañas que mostrar</p>
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((campaign: any) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{campaign.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(campaign.createdAt).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <CampaignStatusBadge status={campaign.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trabajos Recientes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" /> Trabajos Recientes
              </CardTitle>
              <button onClick={() => navigate("/automation")} className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todos <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <CardDescription>
              {hasActiveFilters
                ? `${filteredJobs.length} trabajos filtrados`
                : "Últimos trabajos de automatización"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">No hay trabajos que mostrar</p>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job: any) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => navigate("/automation")}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{job.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(job.createdAt).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumen del Sistema + Acciones Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" /> Resumen del Sistema
            </CardTitle>
            <CardDescription>
              Estado general de tu cerebro editorial
              {hasActiveFilters && <span className="text-amber-600 ml-2">(filtrado)</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Campañas activas</span>
                <span className="font-semibold text-green-600">{dm.activeCampaigns}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Publicaciones programadas</span>
                <span className="font-semibold text-amber-600">{dm.scheduledPublications}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Trabajos pendientes</span>
                <span className="font-semibold text-blue-600">{pendingCount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Trabajos con error</span>
                <span className="font-semibold text-red-600">{errorCount}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm">Total proyectos</span>
                <span className="font-semibold">{dm.totalProjects}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acciones Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>Navegación directa a las secciones principales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Proyectos", path: "/projects", icon: Rocket },
                { label: "Campañas", path: "/campaigns", icon: Activity },
                { label: "Automatización", path: "/automation", icon: Bot },
                { label: "Prompts", path: "/prompts", icon: FileText },
                { label: "Keywords", path: "/keywords", icon: Zap },
                { label: "Memoria", path: "/editorial-memory", icon: Brain },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent hover:border-accent transition-colors text-left"
                  >
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTES AUXILIARES
// =============================================================================

/** Badge de estado para campañas */
function CampaignStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    active: { label: "Activa", className: "bg-green-100 text-green-700" },
    paused: { label: "Pausada", className: "bg-yellow-100 text-yellow-700" },
    completed: { label: "Completada", className: "bg-blue-100 text-blue-700" },
    draft: { label: "Borrador", className: "bg-gray-100 text-gray-600" },
  };
  const cfg = config[status] || config.draft;
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

/** Badge de estado para jobs de automatización */
function JobStatusBadge({ status }: { status: string }) {
  const icons: Record<string, any> = {
    pending: Clock,
    in_progress: Activity,
    completed: CheckCircle,
    error: AlertTriangle,
  };
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: "Pendiente", className: "bg-amber-100 text-amber-700" },
    in_progress: { label: "En progreso", className: "bg-blue-100 text-blue-700" },
    completed: { label: "Completado", className: "bg-green-100 text-green-700" },
    error: { label: "Error", className: "bg-red-100 text-red-700" },
  };
  const cfg = config[status] || config.pending;
  const Icon = icons[status] || Clock;
  return (
    <Badge className={cfg.className}>
      <Icon className="w-3 h-3 mr-1" />
      {cfg.label}
    </Badge>
  );
}

/** Icono de filtro SVG */
function FilterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
