import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function CampaignDetail() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/campaigns/:id");

  if (!match) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/campaigns")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">Detalles de la Campaña</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Campaña ID: {params?.id}</CardTitle>
          <CardDescription>Información detallada de la campaña</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cargando detalles de la campaña...</p>
        </CardContent>
      </Card>
    </div>
  );
}
