import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, RefreshCw, Clock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const statusConfig = {
  pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", label: "Pendiente" },
  in_progress: { icon: Loader2, color: "text-blue-600", bg: "bg-blue-50", label: "En Progreso" },
  completed: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", label: "Completado" },
  error: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", label: "Error" },
};

export default function AutomationPanel() {
  const { data: jobs, isLoading, refetch } = trpc.automationJobs.list.useQuery();
  const createMutation = trpc.automationJobs.create.useMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    campaignId: "",
    contentPackageId: "",
    type: "",
    payload: "",
    scheduledAt: "",
  });

  const handleCreate = async () => {
    if (!formData.type) return;
    await createMutation.mutateAsync({
      campaignId: formData.campaignId ? Number(formData.campaignId) : undefined,
      contentPackageId: formData.contentPackageId ? Number(formData.contentPackageId) : undefined,
      type: formData.type,
      payload: formData.payload || undefined,
      scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt) : undefined,
    });
    setFormData({ campaignId: "", contentPackageId: "", type: "", payload: "", scheduledAt: "" });
    setIsOpen(false);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Panel de Automatización</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  // Group jobs by status
  const grouped = {
    pending: (jobs || []).filter((j: any) => j.status === "pending"),
    in_progress: (jobs || []).filter((j: any) => j.status === "in_progress"),
    completed: (jobs || []).filter((j: any) => j.status === "completed"),
    error: (jobs || []).filter((j: any) => j.status === "error"),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Panel de Automatización</h1>
          <p className="text-muted-foreground mt-2">Vista Kanban de trabajos de automatización</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Actualizar
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nuevo Trabajo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Trabajo de Automatización</DialogTitle>
                <DialogDescription>Crea un nuevo trabajo para el bot de automatización</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de trabajo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publish">Publicar</SelectItem>
                    <SelectItem value="analyze">Analizar</SelectItem>
                    <SelectItem value="generate">Generar</SelectItem>
                    <SelectItem value="schedule">Programar</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="ID de campaña (opcional)"
                  type="number"
                  value={formData.campaignId}
                  onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                />
                <Input
                  placeholder="ID de paquete de contenido (opcional)"
                  type="number"
                  value={formData.contentPackageId}
                  onChange={(e) => setFormData({ ...formData, contentPackageId: e.target.value })}
                />
                <Textarea
                  placeholder="Payload (JSON, opcional)"
                  value={formData.payload}
                  onChange={(e) => setFormData({ ...formData, payload: e.target.value })}
                />
                <Input
                  placeholder="Programar para (opcional)"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                />
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "Creando..." : "Crear Trabajo"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const Icon = config.icon;
          const statusJobs = grouped[status as keyof typeof grouped];
          return (
            <Card key={status} className={`${config.bg}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {statusJobs.length} trabajo{statusJobs.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statusJobs.length === 0 ? (
                  <p className="text-center text-muted-foreground text-xs py-8">Sin trabajos</p>
                ) : (
                  <div className="space-y-2">
                    {statusJobs.map((job: any) => (
                      <div key={job.id} className="bg-white/80 rounded-lg p-3 border shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs">{job.type}</Badge>
                          {job.campaignId && (
                            <span className="text-xs text-muted-foreground">Camp. #{job.campaignId}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ID: {job.id}
                        </p>
                        {job.scheduledAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Programado: {new Date(job.scheduledAt).toLocaleString()}
                          </p>
                        )}
                        {job.logs && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {job.logs}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
