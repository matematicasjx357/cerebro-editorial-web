import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, TrendingUp } from "lucide-react";
import { useState } from "react";

export default function Keywords() {
  const { data: projects, isLoading: loadingProjects } = trpc.projects.list.useQuery();
  const { data: keywords, isLoading, refetch } = trpc.keywords.listAll.useQuery();
  const createMutation = trpc.keywords.create.useMutation();
  const updateMutation = trpc.keywords.update.useMutation();
  const deleteMutation = trpc.keywords.delete.useMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    projectId: "",
    keyword: "",
    metrics: "",
  });

  const handleCreate = async () => {
    if (!formData.keyword || !formData.projectId) return;
    await createMutation.mutateAsync({
      projectId: Number(formData.projectId),
      keyword: formData.keyword,
      metrics: formData.metrics || undefined,
    });
    setFormData({ projectId: "", keyword: "", metrics: "" });
    setIsOpen(false);
    refetch();
  };

  const handleEdit = async () => {
    if (!editingId) return;
    await updateMutation.mutateAsync({
      id: editingId,
      keyword: formData.keyword || undefined,
      metrics: formData.metrics || undefined,
    });
    setEditOpen(false);
    setEditingId(null);
    refetch();
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Eliminar esta keyword?")) {
      await deleteMutation.mutateAsync({ id });
      refetch();
    }
  };

  const openEdit = (kw: any) => {
    setEditingId(kw.id);
    setFormData({
      projectId: kw.projectId.toString(),
      keyword: kw.keyword,
      metrics: kw.metrics || "",
    });
    setEditOpen(true);
  };

  if (isLoading || loadingProjects) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Keywords</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Palabras Clave</h1>
          <p className="text-muted-foreground mt-2">Gestiona tus keywords con métricas de rendimiento</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Keyword
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Palabra Clave</DialogTitle>
              <DialogDescription>Agrega una keyword con métricas de rendimiento</DialogDescription>
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
                placeholder="Palabra clave"
                value={formData.keyword}
                onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
              />
              <Textarea
                placeholder='Métricas (JSON, ej: {"searchVolume": 1000, "difficulty": "medium"})'
                value={formData.metrics}
                onChange={(e) => setFormData({ ...formData, metrics: e.target.value })}
              />
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creando..." : "Crear Keyword"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Keyword</DialogTitle>
            <DialogDescription>Modifica los detalles de la keyword</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Palabra clave"
              value={formData.keyword}
              onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
            />
            <Textarea
              placeholder='Métricas (JSON)'
              value={formData.metrics}
              onChange={(e) => setFormData({ ...formData, metrics: e.target.value })}
            />
            <Button onClick={handleEdit} disabled={!editingId || updateMutation.isPending} className="w-full">
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!keywords || keywords.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No hay keywords aún. Agrega una para comenzar.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Keyword</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Proyecto</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Métricas</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((kw: any) => (
                  <tr key={kw.id} className="border-b last:border-0 hover:bg-accent/50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span className="font-medium">{kw.keyword}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">ID: {kw.projectId}</Badge>
                    </td>
                    <td className="p-4">
                      {kw.metrics ? (
                        <pre className="text-xs bg-muted p-2 rounded max-h-16 overflow-y-auto">
                          {(() => { try { return JSON.stringify(JSON.parse(kw.metrics), null, 2); } catch { return kw.metrics; } })()}
                        </pre>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin métricas</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(kw)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(kw.id)} disabled={deleteMutation.isPending}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
