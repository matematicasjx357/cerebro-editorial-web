/**
 * =============================================================================
 * CEREBRO EDITORIAL — Cola de Automatización (/jobs)
 * =============================================================================
 *
 * Vista de cola y estado de automatización con:
 *   - Vista Kanban (columnas por estado)
 *   - Vista Tabla interactiva
 *   - Botón de reejecución de trabajos fallidos
 *   - Estadísticas en tiempo real
 *   - Filtros y búsqueda
 *
 * Estados soportados:
 *   - pending (PENDIENTE)
 *   - generating (GENERANDO)
 *   - wordpress_ready (WORDPRESS_LISTO)
 *   - youtube_uploaded (YOUTUBE_SUBIDO)
 *   - social_published (REDES_PUBLICADAS)
 *   - completed (COMPLETADO)
 *   - error (ERROR)
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot,
  RotateCcw,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Calendar,
  Zap,
  Eye,
  Trash2,
  Activity,
  FileText,
  ChevronDown,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// =============================================================================
// TIPOS Y CONSTANTES
// =============================================================================

/** Estados extendidos de la cola de automatización */
const JOB_STATUSES = {
  pending: { label: "Pendiente", icon: Clock, color: "amber", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", badge: "bg-amber-100 text-amber-700" },
  generating: { label: "Generando", icon: Loader2, color: "blue", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" },
  wordpress_ready: { label: "WordPress Listo", icon: CheckCircle2, color: "green", bg: "bg-green-50", text: "text-green-700", border: "border-green-200", badge: "bg-green-100 text-green-700" },
  youtube_uploaded: { label: "YouTube Subido", icon: CheckCircle2, color: "red", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", badge: "bg-red-100 text-red-700" },
  social_published: { label: "Redes Publicadas", icon: CheckCircle2, color: "purple", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", badge: "bg-purple-100 text-purple-700" },
  completed: { label: "Completado", icon: CheckCircle2, color: "emerald", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700" },
  error: { label: "Error", icon: AlertTriangle, color: "rose", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", badge: "bg-rose-100 text-rose-700" },
} as const;

type JobStatus = keyof typeof JOB_STATUSES;
const ALL_STATUS_KEYS = Object.keys(JOB_STATUSES) as JobStatus[];

const JOB_TYPES = ["publish", "analyze", "generate", "upload", "social_share"] as const;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function JobsQueue() {
  const [, navigate] = useLocation();
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

  // Queries
  const { data: jobs = [], isLoading, refetch } = trpc.automationJobs.list.useQuery();
  const { data: stats } = trpc.automation.stats.useQuery();
  const utils = trpc.useUtils();

  // Mutations
  const rerunMutation = trpc.automationJobs.rerun.useMutation();
  const deleteMutation = trpc.automationJobs.delete.useMutation();
  const processPendingMutation = trpc.automation.processPending.useMutation();
  const createMutation = trpc.automationJobs.create.useMutation();
  const updateStatusMutation = trpc.automationJobs.update.useMutation();

  // =============================================================================
  // FILTRADO Y BÚSQUEDA
  // =============================================================================

  const filteredJobs = useMemo(() => {
    let result = jobs;

    // Filtrar por estado
    if (statusFilter !== "all") {
      result = result.filter((j) => j.status === statusFilter);
    }

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((j) => {
        return (
          j.type?.toLowerCase().includes(q) ||
          j.payload?.toLowerCase().includes(q) ||
          String(j.campaignId || "").includes(q) ||
          j.result?.toLowerCase().includes(q) ||
          j.logs?.toLowerCase().includes(q)
        );
      });
    }

    // Ordenar por más reciente
    return result.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [jobs, statusFilter, searchQuery]);

  // Agrupar por estado para Kanban
  const jobsByStatus = useMemo(() => {
    const grouped: Record<string, typeof jobs> = {};
    ALL_STATUS_KEYS.forEach((status) => {
      grouped[status] = filteredJobs.filter((j) => j.status === status);
    });
    return grouped;
  }, [filteredJobs]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleRerun = async (jobId: number) => {
    try {
      await rerunMutation.mutateAsync({ jobId });
      toast.success(`Trabajo #${jobId} reejecutado`);
      utils.automationJobs.list.invalidate();
      utils.automation.stats.invalidate();
    } catch (error: any) {
      toast.error(`Error al reejecutar: ${error.message}`);
    }
  };

  const handleDelete = async (jobId: number) => {
    try {
      await deleteMutation.mutateAsync({ id: jobId });
      toast.success(`Trabajo #${jobId} eliminado`);
      utils.automationJobs.list.invalidate();
      utils.automation.stats.invalidate();
    } catch (error: any) {
      toast.error(`Error al eliminar: ${error.message}`);
    }
  };

  const handleProcessPending = async () => {
    try {
      await processPendingMutation.mutateAsync();
      toast.success("Procesando trabajos pendientes...");
      utils.automationJobs.list.invalidate();
      utils.automation.stats.invalidate();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleStatusChange = async (jobId: number, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id: jobId, status: newStatus as any });
      toast.success(`Estado actualizado a ${newStatus}`);
      utils.automationJobs.list.invalidate();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (isLoading) {
    return <JobsQueueSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bot className="w-8 h-8 text-primary" />
              Cola de Automatización
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitoreo en tiempo real de trabajos de publicación
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleProcessPending}
            disabled={processPendingMutation.isPending}
            className="gap-2"
          >
            {processPendingMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Procesar Pendientes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {ALL_STATUS_KEYS.map((status) => {
          const config = JOB_STATUSES[status];
          const Icon = config.icon;
          const count = jobs.filter((j) => j.status === status).length;
          return (
            <Card
              key={status}
              className={`cursor-pointer hover:shadow-md transition-shadow ${config.bg}`}
              onClick={() => {
                setStatusFilter(statusFilter === status ? "all" : status);
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.text}`} />
                  <span className="text-xs font-medium truncate">{config.label}</span>
                </div>
                <p className={`text-2xl font-bold mt-1 ${config.text}`}>{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por tipo, payload, campaign ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-48">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {ALL_STATUS_KEYS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {JOB_STATUSES[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {filteredJobs.length} trabajo{filteredJobs.length !== 1 ? "s" : ""}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vista Kanban / Tabla */}
      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="kanban" className="gap-2">
              <Activity className="w-4 h-4" /> Kanban
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2">
              <FileText className="w-4 h-4" /> Tabla
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Vista Kanban */}
        <TabsContent value="kanban">
          <KanbanView
            jobsByStatus={jobsByStatus}
            onRerun={handleRerun}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            expandedJobId={expandedJobId}
            setExpandedJobId={setExpandedJobId}
            navigate={navigate}
            rerunPending={rerunMutation.isPending}
          />
        </TabsContent>

        {/* Vista Tabla */}
        <TabsContent value="table">
          <TableView
            jobs={filteredJobs}
            onRerun={handleRerun}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            expandedJobId={expandedJobId}
            setExpandedJobId={setExpandedJobId}
            navigate={navigate}
            rerunPending={rerunMutation.isPending}
          />
        </TabsContent>
      </Tabs>

      {/* Stats Footer */}
      {stats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Estadísticas Generales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Trabajos</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">En Cola</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completados</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">
                  {Math.round(stats.successRate * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">Tasa de Éxito</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// VISTA KANBAN
// =============================================================================

interface KanbanViewProps {
  jobsByStatus: Record<string, any[]>;
  onRerun: (jobId: number) => void;
  onDelete: (jobId: number) => void;
  onStatusChange: (jobId: number, status: string) => void;
  expandedJobId: number | null;
  setExpandedJobId: (id: number | null) => void;
  navigate: (path: string) => void;
  rerunPending: boolean;
}

function KanbanView({
  jobsByStatus,
  onRerun,
  onDelete,
  onStatusChange,
  expandedJobId,
  setExpandedJobId,
  navigate,
  rerunPending,
}: KanbanViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {ALL_STATUS_KEYS.map((status) => {
        const config = JOB_STATUSES[status];
        const Icon = config.icon;
        const columnJobs = jobsByStatus[status] || [];

        return (
          <div
            key={status}
            className={`rounded-xl border ${config.border} bg-background/50`}
          >
            {/* Column Header */}
            <div className={`p-3 border-b ${config.bg} rounded-t-xl`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.text}`} />
                  <span className={`text-sm font-semibold ${config.text}`}>
                    {config.label}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {columnJobs.length}
                </Badge>
              </div>
            </div>

            {/* Column Body */}
            <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
              {columnJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  Sin trabajos
                </div>
              ) : (
                columnJobs.map((job: any) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    config={config}
                    isExpanded={expandedJobId === job.id}
                    onToggleExpand={() =>
                      setExpandedJobId(expandedJobId === job.id ? null : job.id)
                    }
                    onRerun={() => onRerun(job.id)}
                    onDelete={() => onDelete(job.id)}
                    onStatusChange={onStatusChange}
                    navigate={navigate}
                    rerunPending={rerunPending}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// TARJETA DE TRABAJO (KANBAN)
// =============================================================================

interface JobCardProps {
  job: any;
  config: (typeof JOB_STATUSES)[JobStatus];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRerun: () => void;
  onDelete: () => void;
  onStatusChange: (jobId: number, status: string) => void;
  navigate: (path: string) => void;
  rerunPending: boolean;
}

function JobCard({
  job,
  config,
  isExpanded,
  onToggleExpand,
  onRerun,
  onDelete,
  onStatusChange,
  navigate,
  rerunPending,
}: JobCardProps) {
  return (
    <div className={`p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow ${config.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">
              #{job.id}
            </span>
            <Badge variant="outline" className="text-xs capitalize">
              {job.type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {job.campaignId && (
              <button
                onClick={() => navigate(`/campaigns/${job.campaignId}`)}
                className="hover:text-primary transition-colors"
              >
                Campaña #{job.campaignId}
              </button>
            )}
          </p>
        </div>
        <button
          onClick={onToggleExpand}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Timestamp */}
      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
        <Calendar className="w-3 h-3" />
        {job.createdAt && new Date(job.createdAt).toLocaleString("es-ES")}
      </div>

      {/* Error summary */}
      {job.status === "error" && job.result && (() => {
        try {
          const result = JSON.parse(job.result);
          return (
            <p className="text-xs text-rose-600 mt-1 truncate">
              {result.error || "Error desconocido"}
            </p>
          );
        } catch {
          return null;
        }
      })()}

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 space-y-2 pt-2 border-t">
          {/* Payload */}
          {job.payload && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Payload:</p>
              <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-24 overflow-y-auto">
                {job.payload.length > 200 ? job.payload.slice(0, 200) + "..." : job.payload}
              </pre>
            </div>
          )}

          {/* Result */}
          {job.result && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Resultado:</p>
              <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-24 overflow-y-auto">
                {job.result.length > 200 ? job.result.slice(0, 200) + "..." : job.result}
              </pre>
            </div>
          )}

          {/* Logs */}
          {job.logs && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Logs:</p>
              <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">
                {job.logs.length > 500 ? job.logs.slice(0, 500) + "..." : job.logs}
              </pre>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {job.startedAt && (
              <div>
                <span className="text-muted-foreground">Inicio:</span>
                <p>{new Date(job.startedAt).toLocaleString("es-ES")}</p>
              </div>
            )}
            {job.completedAt && (
              <div>
                <span className="text-muted-foreground">Fin:</span>
                <p>{new Date(job.completedAt).toLocaleString("es-ES")}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {job.status === "error" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRerun}
                      disabled={rerunPending}
                      className="h-7 text-xs gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reejecutar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reiniciar este trabajo fallido</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Change status */}
            <Select
              value={job.status}
              onValueChange={(val) => onStatusChange(job.id, val)}
            >
              <SelectTrigger className="h-7 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUS_KEYS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {JOB_STATUSES[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar trabajo</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Estás seguro de que deseas eliminar el trabajo #{job.id}?
                    Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// VISTA TABLA
// =============================================================================

interface TableViewProps {
  jobs: any[];
  onRerun: (jobId: number) => void;
  onDelete: (jobId: number) => void;
  onStatusChange: (jobId: number, status: string) => void;
  expandedJobId: number | null;
  setExpandedJobId: (id: number | null) => void;
  navigate: (path: string) => void;
  rerunPending: boolean;
}

function TableView({
  jobs,
  onRerun,
  onDelete,
  onStatusChange,
  expandedJobId,
  setExpandedJobId,
  navigate,
  rerunPending,
}: TableViewProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Campaña</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Creado</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Inicio</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fin</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted-foreground">
                  No hay trabajos que mostrar
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const config = JOB_STATUSES[job.status as JobStatus] || JOB_STATUSES.pending;
                const Icon = config.icon;
                const isExpanded = expandedJobId === job.id;

                return (
                  <tbody key={job.id}>
                    <tr className={`border-t hover:bg-accent/50 transition-colors ${isExpanded ? "bg-accent/30" : ""}`}>
                      <td className="px-4 py-3 font-mono text-xs">{job.id}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs capitalize">{job.type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={config.badge}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {job.campaignId ? (
                          <button
                            onClick={() => navigate(`/campaigns/${job.campaignId}`)}
                            className="text-xs text-primary hover:underline"
                          >
                            #{job.campaignId}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {job.createdAt && new Date(job.createdAt).toLocaleString("es-ES")}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {job.startedAt ? new Date(job.startedAt).toLocaleString("es-ES") : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {job.completedAt ? new Date(job.completedAt).toLocaleString("es-ES") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Expand */}
                          <button
                            onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                            className="p-1.5 rounded hover:bg-accent transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>

                          {/* Rerun (solo para errores) */}
                          {job.status === "error" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRerun(job.id)}
                              disabled={rerunPending}
                              className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          {/* Delete */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminar trabajo</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas eliminar el trabajo #{job.id}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onDelete(job.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {isExpanded && (
                      <tr className="bg-muted/30">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="space-y-3">
                            {/* Error info */}
                            {job.status === "error" && job.result && (() => {
                              try {
                                const result = JSON.parse(job.result);
                                return (
                                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                                    <p className="text-sm font-medium text-rose-700">Error:</p>
                                    <p className="text-sm text-rose-600">{result.error || JSON.stringify(result)}</p>
                                  </div>
                                );
                              } catch {
                                return null;
                              }
                            })()}

                            {/* Payload */}
                            {job.payload && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Payload:</p>
                                <pre className="text-xs bg-background rounded p-2 border overflow-x-auto max-h-20 overflow-y-auto">
                                  {job.payload}
                                </pre>
                              </div>
                            )}

                            {/* Result */}
                            {job.result && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Resultado:</p>
                                <pre className="text-xs bg-background rounded p-2 border overflow-x-auto max-h-20 overflow-y-auto">
                                  {job.result.length > 1000 ? job.result.slice(0, 1000) + "..." : job.result}
                                </pre>
                              </div>
                            )}

                            {/* Logs */}
                            {job.logs && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Logs completos:</p>
                                <pre className="text-xs bg-background rounded p-2 border overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
                                  {job.logs}
                                </pre>
                              </div>
                            )}

                            {/* Status change */}
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">Cambiar estado:</span>
                              <Select
                                value={job.status}
                                onValueChange={(val) => onStatusChange(job.id, val)}
                              >
                                <SelectTrigger className="h-8 text-xs w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ALL_STATUS_KEYS.map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {JOB_STATUSES[s].label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

function JobsQueueSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[...Array(7)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="py-3">
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              {[...Array(3)].map((_, j) => (
                <Skeleton key={j} className="h-16 w-full mb-2" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
