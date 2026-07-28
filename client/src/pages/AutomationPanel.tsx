import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AutomationPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Panel de Automatización</h1>
        <p className="text-muted-foreground mt-2">Vista Kanban de trabajos de automatización</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {["Pendiente", "En Progreso", "Completado", "Error"].map((status) => (
          <Card key={status}>
            <CardHeader>
              <CardTitle className="text-lg">{status}</CardTitle>
              <CardDescription>0 trabajos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground text-sm">Sin trabajos</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
