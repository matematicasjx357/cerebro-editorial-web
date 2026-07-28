import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Calendar, Globe } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Campaigns() {
  const [, navigate] = useLocation();
  const { data: campaigns, isLoading, refetch } = trpc.campaigns.list.useQuery();
  const createMutation = trpc.campaigns.create.useMutation();
  const updateMutation = trpc.campaigns.update.useMutation();
  const deleteMutation = trpc.campaigns.delete.useMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    projectId: "",
    title: "",
    description: "",
    platforms: "",
    startDate: "",
    endDate: "",
    status: "draft",
  });

  const handleCreate = async () => {
    if (!formData.title || !formData.projectId) return;
    await createMutation.mutateAsync({
      projectId: Number(formData.projectId),
      title: formData.title,
      description: formData.description,
      platforms: formData.platforms ? JSON.stringify(formData.platforms.split(",").map(p => p.trim())) : undefined,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      status: formData.status as any,
    });
    setFormData({ projectId: "", title: "", description: "", platforms: "", startDate: "", endDate: "", status: "draft" });
    setIsOpen(false);
    refetch();
  };

  const handleEdit = async () => {
    if (!editingId) return;
    await updateMutation.mutateAsync({
      id: editingId,
      title: formData.title || undefined,
      description: formData.description || undefined,
      platforms: formData.platforms ? JSON.stringify(formData.platforms.split(",").map(p => p.trim())) : undefined,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      status: formData.status as any,
    });
    setEditOpen(false);
    setEditingId(null);
    refetch();
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta campaña?")) {
      await deleteMutation.mutateAsync({ id });
      refetch();
    }
  };

  const openEdit = (campaign: any) => {
    setEditingId(campaign.id);
    const platforms = campaign.platforms ? JSON.parse(campaign.platforms) : [];
    setFormData({
      projectId: campaign.projectId.toString(),
      title: campaign.title,
      description: campaign.description || "",
      platforms: platforms.join(", "),
      startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split("T")[0] : "",
      endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split("T")[0] : "",
      status: campaign.status,
    });
    setEditOpen(true);
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-500",
    paused: "bg-yellow-500",
    completed: "bg-blue-500",
    draft: "bg-gray-500",
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Campañas</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Campañas Multicanal</h1>
          <p className="text-muted-foreground mt-2">Gestiona tus campañas de contenido</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Campaña
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Campaña</DialogTitle>
              <DialogDescription>Crea una nueva campaña multicanal</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="ID del proyecto"
                type="number"
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              />
              <Input
                placeholder="Título de la campaña"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              <Textarea
                placeholder="Descripción (opcional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <Input
                placeholder="Plataformas (separadas por coma, ej: youtube, tiktok, instagram)"
                value={formData.platforms}
                onChange={(e) => setFormData({ ...formData, platforms: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Fecha inicio</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Fecha fin</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="paused">Pausada</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creando..." : "Crear Campaña"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Campaña</DialogTitle>
            <DialogDescription>Modifica los detalles de la campaña</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="ID del proyecto"
              type="number"
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            />
            <Input
              placeholder="Título de la campaña"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <Textarea
              placeholder="Descripción (opcional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Input
              placeholder="Plataformas (separadas por coma)"
              value={formData.platforms}
              onChange={(e) => setFormData({ ...formData, platforms: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Fecha inicio</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Fecha fin</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="paused">Pausada</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleEdit} disabled={!editingId || updateMutation.isPending} className="w-full">
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!campaigns || campaigns.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No hay campañas aún. Crea una para comenzar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign: any) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1 cursor-pointer" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                    <div className="flex items-center gap-2">
                      <CardTitle>{campaign.title}</CardTitle>
                      <span
                        className={`${statusColors[campaign.status] || "bg-gray-500"} w-2.5 h-2.5 rounded-full`}
                        title={campaign.status}
                      />
                    </div>
                    <CardDescription className="mt-2">{campaign.description || "Sin descripción"}</CardDescription>
                    <div className="flex items-center gap-4 mt-3">
                      {campaign.platforms && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Globe className="w-3 h-3" />
                          <span>
                            {(() => {
                              try { return JSON.parse(campaign.platforms).join(", "); } catch { return campaign.platforms; }
                            })()}
                          </span>
                        </div>
                      )}
                      {campaign.startDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(campaign.startDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
                      {campaign.status === "active" ? "Activa" : campaign.status === "paused" ? "Pausada" : campaign.status === "completed" ? "Completada" : "Borrador"}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(campaign)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(campaign.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
