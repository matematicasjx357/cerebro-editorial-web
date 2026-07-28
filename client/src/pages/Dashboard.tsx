import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Zap, Radio, Network } from "lucide-react";

export default function Dashboard() {
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
    return <div>Error loading metrics</div>;
  }

  const metricCards = [
    {
      title: "Campañas Activas",
      value: metrics.activeCampaigns,
      icon: Activity,
      description: "Campañas en ejecución",
      color: "bg-blue-500",
    },
    {
      title: "Publicaciones Programadas",
      value: metrics.scheduledPublications,
      icon: Zap,
      description: "Contenidos pendientes",
      color: "bg-amber-500",
    },
    {
      title: "Estado del Bot",
      value: metrics.botStatus === "active" ? "Activo" : "Inactivo",
      icon: Radio,
      description: "Estado de automatización",
      color: metrics.botStatus === "active" ? "bg-green-500" : "bg-gray-500",
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
            <Card key={metric.title} className="overflow-hidden">
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

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Trabajos de Automatización</CardTitle>
            <CardDescription>Estado actual de los trabajos pendientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Pendientes</span>
                <span className="font-semibold text-amber-600">{metrics.pendingJobs}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Con errores</span>
                <span className="font-semibold text-red-600">{metrics.errorJobs}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proyectos</CardTitle>
            <CardDescription>Total de proyectos editoriales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-2">Proyectos en el sistema</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
