import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, BookOpen, Link2, Image, FileText } from "lucide-react";
import { useState } from "react";

const typeIcons: Record<string, typeof BookOpen> = {
  document: FileText,
  link: Link2,
  image: Image,
  reference: BookOpen,
};

export default function KnowledgeBase() {
  const { data: projects, isLoading: loadingProjects } = trpc.projects.list.useQuery();
  const { data: entries, isLoading, refetch } = trpc.knowledgeBase.listAll.useQuery();
  const createMutation = trpc.knowledgeBase.create.useMutation();
  const updateMutation = trpc.knowledgeBase.update.useMutation();
  const deleteMutation = trpc.knowledgeBase.delete.useMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    projectId: "",
    title: "",
    content: "",
    type: "document",
    tags: "",
  });

  const handleCreate = async () => {
    if (!formData.title || !formData.content || !formData.projectId) return;
    await createMutation.mutateAsync({
      projectId: Number(formData.projectId),
      title: formData.title,
      content: formData.content,
      type: formData.type as any,
      tags: formData.tags ? JSON.stringify(formData.tags.split(",").map(t => t.trim())) : undefined,
    });
    setFormData({ projectId: "", title: "", content: "", type: "document", tags: "" });
    setIsOpen(false);
    refetch();
  };

  const handleEdit = async () => {
    if (!editingId) return;
    await updateMutation.mutateAsync({
      id: editingId,
      title: formData.title || undefined,
      content: formData.content || undefined,
      type: formData.type as any,
      tags: formData.tags ? JSON.stringify(formData.tags.split(",").map(t => t.trim())) : undefined,
    });
    setEditOpen(false);
    setEditingId(null);
    refetch();
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Eliminar este recurso?")) {
      await deleteMutation.mutateAsync({ id });
      refetch();
    }
  };

  const openEdit = (entry: any) => {
    setEditingId(entry.id);
    const tags = entry.tags ? JSON.parse(entry.tags) : [];
    setFormData({
      projectId: entry.projectId.toString(),
      title: entry.title,
      content: entry.content,
      type: entry.type,
      tags: tags.join(", "),
    });
    setEditOpen(true);
  };

  if (isLoading || loadingProjects) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Base de Conocimiento</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Base de Conocimiento</h1>
          <p className="text-muted-foreground mt-2">Recursos y referencias editoriales</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Recurso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuevo Recurso</DialogTitle>
              <DialogDescription>Agrega un recurso a la base de conocimiento</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Proyecto</label>
                <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Título del recurso"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de recurso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Documento</SelectItem>
                  <SelectItem value="link">Enlace</SelectItem>
                  <SelectItem value="image">Imagen</SelectItem>
                  <SelectItem value="reference">Referencia</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Contenido del recurso"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="min-h-[100px]"
              />
              <Input
                placeholder="Tags (separados por coma)"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creando..." : "Crear Recurso"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Recurso</DialogTitle>
            <DialogDescription>Modifica los detalles del recurso</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Título"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document">Documento</SelectItem>
                <SelectItem value="link">Enlace</SelectItem>
                <SelectItem value="image">Imagen</SelectItem>
                <SelectItem value="reference">Referencia</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Contenido"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="min-h-[100px]"
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

      {!entries || entries.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No hay recursos aún. Agrega uno para comenzar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {entries.map((entry: any) => {
            const TypeIcon = typeIcons[entry.type] || FileText;
            return (
              <Card key={entry.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <TypeIcon className="w-5 h-5 text-primary mt-1" />
                      <div>
                        <CardTitle className="text-lg">{entry.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{entry.type}</Badge>
                          <span className="text-xs text-muted-foreground">Proyecto ID: {entry.projectId}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {entry.tags && (() => {
                        try {
                          return JSON.parse(entry.tags).slice(0, 3).map((tag: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                          ));
                        } catch { return null; }
                      })()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end">
                    <p className="text-sm text-muted-foreground line-clamp-3 flex-1 mr-4">{entry.content}</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(entry)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
