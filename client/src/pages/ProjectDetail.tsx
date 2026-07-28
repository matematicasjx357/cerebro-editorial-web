import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function ProjectDetail() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/projects/:id");

  if (!match) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/projects")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">Detalles del Proyecto</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Proyecto ID: {params?.id}</CardTitle>
          <CardDescription>Información detallada del proyecto</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cargando detalles del proyecto...</p>
        </CardContent>
      </Card>
    </div>
  );
}
