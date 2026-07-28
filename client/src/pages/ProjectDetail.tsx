import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Rocket, Calendar, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProjectDetail() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/projects/:id");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", status: "active" });

  if (!match) return null;
  const projectId = Number(params?.id);

  const { data: project, isLoading: loadingProject } = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: !isNaN(projectId) }
  );
  const { data: campaigns, isLoading: loadingCampaigns, refetch: refetchCampaigns } = trpc.campaigns.listByProject.useQuery(
    { projectId },
    { enabled: !isNaN(projectId) }
  );
  const { data: prompts, isLoading: loadingPrompts } = trpc.masterPrompts.listByProject.useQuery(
    { projectId },
    { enabled: !isNaN(projectId) }
  );
  const { data: keywords, isLoading: loadingKeywords } = trpc.keywords.listByProject.useQuery(
    { projectId },
    { enabled: !isNaN(projectId) }
  );
  const { data: memory, isLoading: loadingMemory } = trpc.editorialMemory.listByProject.useQuery(
    { projectId },
    { enabled: !isNaN(projectId) }
  );
  const { data: knowledgeBase, isLoading: loadingKB } = trpc.knowledgeBase.listByProject.useQuery(
    { projectId },
    { enabled: !isNaN(projectId) }
  );
  const updateMutation = trpc.projects.update.useMutation();
  const deleteMutation = trpc.projects.delete.useMutation();

  const handleEdit = async () => {
    await updateMutation.mutateAsync({
      id: projectId,
      name: editForm.name || undefined,
      description: editForm.description || undefined,
      status: editForm.status as any,
    });
    setEditOpen(false);
  };

  const handleDelete = async () => {
    if (confirm("¿Estás seguro de que deseas eliminar este proyecto?")) {
      await deleteMutation.mutateAsync({ id: projectId });
      navigate("/projects");
    }
  };

  const openEdit = () => {
    if (project) {
      setEditForm({
        name: project.name,
        description: project.description || "",
        status: project.status,
      });
    }
    setEditOpen(true);
  };

  if (loadingProject) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/projects")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Proyecto no encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/projects")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <Badge variant={project.status === "active" ? "default" : "secondary"}>
              {project.status === "active" ? "Activo" : project.status === "archived" ? "Archivado" : "Borrador"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">{project.description || "Sin descripción"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Edit2 className="w-4 h-4 mr-1" /> Editar
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-1" /> Eliminar
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Proyecto</DialogTitle>
            <DialogDescription>Modifica los detalles del proyecto</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nombre del proyecto"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <Textarea
              placeholder="Descripción"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
            <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="archived">Archivado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleEdit} disabled={updateMutation.isPending} className="w-full">
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{campaigns?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Campañas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{prompts?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Prompts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{keywords?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Keywords</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{memory?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Memoria</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{knowledgeBase?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Conocimiento</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5" /> Campañas
              </CardTitle>
              <CardDescription>Campañas asociadas a este proyecto</CardDescription>
            </div>
            <Button size="sm" onClick={() => navigate("/campaigns")}>Ver todas</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCampaigns ? (
            <Skeleton className="h-16" />
          ) : !campaigns || campaigns.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No hay campañas asociadas</p>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/campaigns/${c.id}`)}
                >
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.description?.slice(0, 80)}...</p>
                  </div>
                  <Badge variant={c.status === "active" ? "default" : "secondary"}>
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Access Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Memoria Editorial</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMemory ? <Skeleton className="h-12" /> : !memory || memory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin registros</p>
            ) : (
              <div className="space-y-2">
                {memory.slice(0, 3).map((m: any) => (
                  <div key={m.id} className="text-sm">
                    <Badge variant="outline" className="mr-2">{m.type}</Badge>
                    <span className="text-muted-foreground">{m.entry.slice(0, 60)}...</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingKeywords ? <Skeleton className="h-12" /> : !keywords || keywords.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin keywords</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {keywords.slice(0, 8).map((k: any) => (
                  <Badge key={k.id} variant="secondary">{k.keyword}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
