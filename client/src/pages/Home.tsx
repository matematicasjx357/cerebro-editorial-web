import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { startLogin } from "@/const";
import { 
  Zap, 
  BarChart3, 
  Users, 
  Smartphone, 
  Shield, 
  Rocket,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-12 w-12 bg-primary rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Cerebro Editorial</span>
          </div>
          <Button 
            onClick={() => startLogin()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Iniciar Sesión
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
              Gestiona tu contenido multicanal con{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                inteligencia
              </span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Automatiza la publicación de contenido en YouTube, TikTok, Instagram y más. 
              Centraliza tus campañas, optimiza tu flujo editorial y crece exponencialmente.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button 
              size="lg"
              onClick={() => startLogin()}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              Comenzar Ahora
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-slate-600 text-slate-200 hover:bg-slate-800"
            >
              Ver Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Funcionalidades Poderosas</h2>
            <p className="text-slate-300 text-lg">Todo lo que necesitas para gestionar contenido multicanal</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Automatización Inteligente",
                description: "Publica automáticamente en múltiples plataformas con un solo clic"
              },
              {
                icon: BarChart3,
                title: "Métricas en Tiempo Real",
                description: "Visualiza el rendimiento de tus campañas con dashboards interactivos"
              },
              {
                icon: Users,
                title: "Gestión de Equipos",
                description: "Colabora con tu equipo editorial de forma segura y eficiente"
              },
              {
                icon: Smartphone,
                title: "Multicanal",
                description: "Soporta YouTube, TikTok, Instagram, Twitter y más plataformas"
              },
              {
                icon: Shield,
                title: "Seguridad Empresarial",
                description: "Autenticación segura y control de acceso basado en roles"
              },
              {
                icon: Rocket,
                title: "Escalabilidad",
                description: "Crece sin límites con infraestructura cloud moderna"
              }
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="bg-slate-700/50 border-slate-600 hover:border-slate-500 transition-colors">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-white">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-300">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">¿Por qué elegir Cerebro Editorial?</h2>
          
          <div className="space-y-4">
            {[
              "Reduce el tiempo de publicación en un 80%",
              "Gestiona todas tus plataformas desde un único dashboard",
              "Automatiza tareas repetitivas y enfócate en la creatividad",
              "Acceso a análisis detallados de rendimiento",
              "Soporte 24/7 y actualizaciones continuas",
              "Integración con herramientas de IA para generación de contenido"
            ].map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                <span className="text-slate-200">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-bold text-white">¿Listo para revolucionar tu contenido?</h2>
          <p className="text-xl text-blue-100">Únete a cientos de creadores que ya están usando Cerebro Editorial</p>
          <Button 
            size="lg"
            onClick={() => startLogin()}
            className="bg-white text-blue-600 hover:bg-slate-100 gap-2"
          >
            Comenzar Gratis
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-slate-400">
          <p>&copy; 2026 Cerebro Editorial Universal. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
