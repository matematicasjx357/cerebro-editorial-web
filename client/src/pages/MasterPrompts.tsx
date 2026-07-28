import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Edit2, FileText } from "lucide-react";
import { useState } from "react";

export default function MasterPrompts() {
  const { data: prompts, isLoading, refetch } = trpc.masterPrompts.listByProject.useQuery({ projectId: undefined });
  const createMutation = trpc.masterPrompts.create.useMutation();
  const updateMutation = trpc.masterPrompts.update.useMutation();
  const deleteMutation = trpc.masterPrompts.delete.useMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    projectId: "",
    name: "",
    template: "",
    description: "",
    tags: "",
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.template) return;
    await createMutation.mutateAsync({
      projectId: formData.projectId ? Number(formData.projectId) : undefined,
      name: formData.name,
      template: formData.template,
      description: formData.description,
      tags: formData.tags ? JSON.stringify(formData.tags.split(",").map(t => t.trim())) : undefined,
    });
    setFormData({ projectId: "", name: "", template: "", description: "", tags: "" });
    setIsOpen(false);
    refetch();
  };

  const handleEdit = async () => {
    if (!editingId) return;
    await updateMutation.mutateAsync({
      id: editingId,
      name: formData.name || undefined,
      template: formData.template || undefined,
      description: formData.description || undefined,
      tags: formData.tags ? JSON.stringify(formData.tags.split(",").map(t => t.trim())) : undefined,
    });
    setEditOpen(false);
    setEditingId(null);
    refetch();
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Eliminar este prompt?")) {
      await deleteMutation.mutateAsync({ id });
      refetch();
    }
  };

  const openEdit = (prompt: any) => {
    setEditingId(prompt.id);
    const tags = prompt.tags ? JSON.parse(prompt.tags) : [];
    setFormData({
      projectId: prompt.projectId?.toString() || "",
      name: prompt.name,
      template: prompt.template,
      description: prompt.description || "",
      tags: tags.join(", "),
    });
    setEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Prompts Maestros</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Prompts Maestros</h1>
          <p className="text-muted-foreground mt-2">Plantillas de prompts para generación de contenido</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Prompt Maestro</DialogTitle>
              <DialogDescription>Crea una plantilla de prompt reutilizable</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Nombre del prompt"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                placeholder="ID del proyecto (opcional)"
                type="number"
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              />
              <Textarea
                placeholder="Plantilla del prompt"
                value={formData.template}
                onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                className="min-h-[120px]"
              />
              <Textarea
                placeholder="Descripción (opcional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <Input
                placeholder="Tags (separados por coma)"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creando..." : "Crear Prompt"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Prompt</DialogTitle>
            <DialogDescription>Modifica los detalles del prompt</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nombre del prompt"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Textarea
              placeholder="Plantilla del prompt"
              value={formData.template}
              onChange={(e) => setFormData({ ...formData, template: e.target.value })}
              className="min-h-[120px]"
            />
            <Textarea
              placeholder="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Input
              placeholder="Tags (separados por coma)"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
            <Button onClick={handleEdit} disabled={!editingId || updateMutation.isPending} className="w-full">
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!prompts || prompts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No hay prompts aún. Crea uno para comenzar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {prompts.map((prompt: any) => (
            <Card key={prompt.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <CardTitle className="text-lg">{prompt.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {prompt.description || "Sin descripción"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {prompt.tags && (() => {
                      try {
                        return JSON.parse(prompt.tags).slice(0, 3).map((tag: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                        ));
                      } catch { return null; }
                    })()}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end">
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-24 whitespace-pre-wrap flex-1 mr-4">
                    {prompt.template}
                  </pre>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(prompt)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(prompt.id)} disabled={deleteMutation.isPending}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {prompt.projectId && (
                  <p className="text-xs text-muted-foreground mt-2">Proyecto ID: {prompt.projectId}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
