import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Brain, Calendar } from "lucide-react";
import { useState } from "react";

const typeConfig: Record<string, { color: string; label: string }> = {
  decision: { color: "bg-blue-100 text-blue-800", label: "Decisión" },
  style: { color: "bg-purple-100 text-purple-800", label: "Estilo" },
  preference: { color: "bg-green-100 text-green-800", label: "Preferencia" },
  guideline: { color: "bg-amber-100 text-amber-800", label: "Guía" },
};

export default function EditorialMemory() {
  const { data: projects, isLoading: loadingProjects } = trpc.projects.list.useQuery();
  const { data: entries, isLoading, refetch } = trpc.editorialMemory.listAll.useQuery();
  const createMutation = trpc.editorialMemory.create.useMutation();
  const updateMutation = trpc.editorialMemory.update.useMutation();
  const deleteMutation = trpc.editorialMemory.delete.useMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    projectId: "",
    entry: "",
    type: "decision",
  });

  const handleCreate = async () => {
    if (!formData.entry || !formData.projectId) return;
    await createMutation.mutateAsync({
      projectId: Number(formData.projectId),
      entry: formData.entry,
      type: formData.type as any,
    });
    setFormData({ projectId: "", entry: "", type: "decision" });
    setIsOpen(false);
    refetch();
  };

  const handleEdit = async () => {
    if (!editingId) return;
    await updateMutation.mutateAsync({
      id: editingId,
      entry: formData.entry || undefined,
      type: formData.type as any,
    });
    setEditOpen(false);
    setEditingId(null);
    refetch();
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Eliminar este registro de memoria?")) {
      await deleteMutation.mutateAsync({ id });
      refetch();
    }
  };

  const openEdit = (entry: any) => {
    setEditingId(entry.id);
    setFormData({
      projectId: entry.projectId.toString(),
      entry: entry.entry,
      type: entry.type,
    });
    setEditOpen(true);
  };

  if (isLoading || loadingProjects) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Memoria Editorial</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Memoria Editorial</h1>
          <p className="text-muted-foreground mt-2">Historial de decisiones, estilos y preferencias editoriales</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Registro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Registro de Memoria</DialogTitle>
              <DialogDescription>Registra una decisión, estilo o preferencia editorial</DialogDescription>
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
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="decision">Decisión</SelectItem>
                  <SelectItem value="style">Estilo</SelectItem>
                  <SelectItem value="preference">Preferencia</SelectItem>
                  <SelectItem value="guideline">Guía</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Describe la decisión, estilo o preferencia..."
                value={formData.entry}
                onChange={(e) => setFormData({ ...formData, entry: e.target.value })}
                className="min-h-[100px]"
              />
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creando..." : "Crear Registro"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
            <DialogDescription>Modifica los detalles del registro de memoria</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="decision">Decisión</SelectItem>
                <SelectItem value="style">Estilo</SelectItem>
                <SelectItem value="preference">Preferencia</SelectItem>
                <SelectItem value="guideline">Guía</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Describe la decisión, estilo o preferencia..."
              value={formData.entry}
              onChange={(e) => setFormData({ ...formData, entry: e.target.value })}
              className="min-h-[100px]"
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
            <p className="text-center text-muted-foreground">No hay registros aún. Crea uno para comenzar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry: any) => {
            const config = typeConfig[entry.type] || typeConfig.decision;
            return (
              <Card key={entry.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3 flex-1">
                      <Brain className="w-5 h-5 text-primary mt-1" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{entry.entry}</p>
                        <p className="text-xs text-muted-foreground mt-1">Proyecto ID: {entry.projectId}</p>
                      </div>
                    </div>
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
