import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default function Keywords() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Palabras Clave</h1>
          <p className="text-muted-foreground mt-2">Gestión de keywords con métricas</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Palabra Clave
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No hay palabras clave aún. Agrega una para comenzar.</p>
        </CardContent>
      </Card>
    </div>
  );
}
