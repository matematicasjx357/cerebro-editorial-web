import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Globe, FileText, Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CampaignDetail() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/campaigns/:id");
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [contentForm, setContentForm] = useState({
    title: "",
    type: "text",
    content: "",
    scheduledAt: "",
  });

  if (!match) return null;
  const campaignId = Number(params?.id);

  const { data: campaign, isLoading: loadingCampaign } = trpc.campaigns.get.useQuery({ id: campaignId }, {
    enabled: !isNaN(campaignId),
  });
  const { data: contentPackages, isLoading: loadingContent, refetch: refetchContent } = trpc.contentPackages.listByCampaign.useQuery(
    { campaignId },
    { enabled: !isNaN(campaignId) }
  );
  const createContentMutation = trpc.contentPackages.create.useMutation();
  const deleteContentMutation = trpc.contentPackages.delete.useMutation();

  const handleCreateContent = async () => {
    if (!contentForm.title) return;
    await createContentMutation.mutateAsync({
      campaignId,
      title: contentForm.title,
      type: contentForm.type as any,
      content: contentForm.content,
      scheduledAt: contentForm.scheduledAt ? new Date(contentForm.scheduledAt) : undefined,
      status: "draft",
    });
    setContentForm({ title: "", type: "text", content: "", scheduledAt: "" });
    setShowContentDialog(false);
    refetchContent();
  };

  const handleDeleteContent = async (id: number) => {
    if (confirm("¿Eliminar este paquete de contenido?")) {
      await deleteContentMutation.mutateAsync({ id });
      refetchContent();
    }
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-500",
    paused: "bg-yellow-500",
    completed: "bg-blue-500",
    draft: "bg-gray-500",
  };

  if (loadingCampaign) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/campaigns")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Campaña no encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/campaigns")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{campaign.title}</h1>
          <p className="text-muted-foreground mt-1">{campaign.description || "Sin descripción"}</p>
        </div>
        <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
          {campaign.status === "active" ? "Activa" : campaign.status === "paused" ? "Pausada" : campaign.status === "completed" ? "Completada" : "Borrador"}
        </Badge>
      </div>

      {/* Campaign Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Campaña</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Proyecto ID</p>
              <p className="font-medium">{campaign.projectId}</p>
            </div>
            {campaign.platforms && (
              <div>
                <p className="text-sm text-muted-foreground">Plataformas</p>
                <p className="font-medium flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  {(() => {
                    try { return JSON.parse(campaign.platforms).join(", "); } catch { return campaign.platforms; }
                  })()}
                </p>
              </div>
            )}
            {campaign.startDate && (
              <div>
                <p className="text-sm text-muted-foreground">Fecha inicio</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(campaign.startDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Packages */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Paquetes de Contenido</h2>
        <Dialog open={showContentDialog} onOpenChange={setShowContentDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Agregar Contenido
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Paquete de Contenido</DialogTitle>
              <DialogDescription>Agrega contenido a esta campaña</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Título del contenido"
                value={contentForm.title}
                onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })}
              />
              <Select value={contentForm.type} onValueChange={(v) => setContentForm({ ...contentForm, type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de contenido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="image">Imagen</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="mixed">Mixto</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Contenido (texto, URL, descripción)"
                value={contentForm.content}
                onChange={(e) => setContentForm({ ...contentForm, content: e.target.value })}
              />
              <div>
                <label className="text-sm text-muted-foreground">Programar para</label>
                <Input
                  type="datetime-local"
                  value={contentForm.scheduledAt}
                  onChange={(e) => setContentForm({ ...contentForm, scheduledAt: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateContent} disabled={createContentMutation.isPending} className="w-full">
                {createContentMutation.isPending ? "Creando..." : "Crear Contenido"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loadingContent ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : !contentPackages || contentPackages.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No hay paquetes de contenido aún.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {contentPackages.map((pkg: any) => (
            <Card key={pkg.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{pkg.title}</p>
                      <p className="text-xs text-muted-foreground">{pkg.type} · {pkg.status}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {pkg.status !== "draft" && (
                      <Badge variant="default">{pkg.status}</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteContent(pkg.id)}
                      disabled={deleteContentMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {pkg.content && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{pkg.content}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
