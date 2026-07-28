import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Zap, Radio, Network, Rocket, Bot, FileText, Brain } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: metrics, isLoading } = trpc.dashboard.metrics.useQuery();

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

  if (!metrics) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Error al cargar las métricas. Verifica la conexión con la base de datos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metricCards = [
    {
      title: "Campañas Activas",
      value: metrics.activeCampaigns,
      icon: Activity,
      description: "Campañas en ejecución",
      color: "bg-blue-500",
      path: "/campaigns",
    },
    {
      title: "Publicaciones Programadas",
      value: metrics.scheduledPublications,
      icon: Zap,
      description: "Contenidos pendientes",
      color: "bg-amber-500",
      path: "/campaigns",
    },
    {
      title: "Estado del Bot",
      value: metrics.botStatus === "active" ? "Activo" : "Inactivo",
      icon: Radio,
      description: "Estado de automatización",
      color: metrics.botStatus === "active" ? "bg-green-500" : "bg-gray-500",
      path: "/automation",
    },
    {
      title: "Canales Conectados",
      value: metrics.connectedChannels,
      icon: Network,
      description: "Plataformas disponibles",
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Resumen de tu actividad editorial</p>
      </div>

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
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/projects")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="w-5 h-5" /> Proyectos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.totalProjects}</p>
            <p className="text-xs text-muted-foreground mt-1">Proyectos editoriales</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/automation")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="w-5 h-5" /> Trabajos de Automatización
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-2xl font-bold text-amber-600">{metrics.pendingJobs}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{metrics.errorJobs}</p>
                <p className="text-xs text-muted-foreground">Errores</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/prompts")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5" /> Prompts Maestros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Accede a tus plantillas de prompts para generar contenido</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" /> Resumen del Sistema
            </CardTitle>
            <CardDescription>Estado general de tu cerebro editorial</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Campañas activas</span>
                <span className="font-semibold text-green-600">{metrics.activeCampaigns}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Publicaciones programadas</span>
                <span className="font-semibold text-amber-600">{metrics.scheduledPublications}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Trabajos pendientes</span>
                <span className="font-semibold text-blue-600">{metrics.pendingJobs}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Trabajos con error</span>
                <span className="font-semibold text-red-600">{metrics.errorJobs}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm">Total proyectos</span>
                <span className="font-semibold">{metrics.totalProjects}</span>
              </div>
            </div>
          </CardContent>
        </Card>

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
