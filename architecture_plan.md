# Plan de Arquitectura y Diseño del Sistema

## 1. Introducción

Este documento detalla el plan de arquitectura y diseño para el **Cerebro Editorial Universal (Sistema ZENIT)**, un dashboard web destinado a la gestión y automatización de la publicación de contenido multicanal. El sistema se construirá sobre una base React, Node.js, MySQL y tRPC, aprovechando la configuración existente del proyecto Manus.

## 2. Requisitos Funcionales

El sistema debe cumplir con las siguientes funcionalidades clave:

*   **Dashboard Principal:** Vista general con métricas clave (campañas activas, publicaciones programadas, estado del bot, canales conectados).
*   **Gestión de Proyectos Editoriales:** CRUD (Crear, Leer, Actualizar, Eliminar) de proyectos con estado y metadatos.
*   **Gestor de Campañas Multicanal:** CRUD de campañas con título, descripción, plataformas objetivo (YouTube, TikTok, etc.) y fechas de ejecución.
*   **Visor de Paquetes de Contenido:** Visualización y gestión de contenidos asociados a cada campaña.
*   **Panel de Automatización (Kanban):** Vista Kanban para trabajos de automatización (pendiente, en progreso, completado, error).
*   **Editor de Prompts Maestros:** Creación y edición de plantillas de prompts para generación de contenido.
*   **Base de Conocimiento Editorial:** Gestión de recursos, referencias y materiales de apoyo por proyecto.
*   **Tabla de Keywords:** Listado, adición y gestión de palabras clave con métricas de rendimiento.
*   **Memoria Editorial:** Historial de decisiones, estilos y preferencias editoriales por proyecto.
*   **Autenticación y Control de Acceso:** Todas las rutas protegidas con Manus OAuth.
*   **Sistema de Alertas Automáticas:** Notificaciones al propietario sobre fallos de automatización, campañas completadas o errores críticos.

## 3. Arquitectura del Sistema

El sistema seguirá una arquitectura de microservicios con un frontend React, un backend Node.js (Express) con tRPC, y una base de datos MySQL. La autenticación se gestionará a través de Manus OAuth.

### 3.1. Componentes Principales

*   **Frontend (Cliente):** Desarrollado con React, utilizando Vite para el bundling y Tailwind CSS con Shadcn/ui para el diseño. Consumirá los procedimientos tRPC del backend.
*   **Backend (Servidor):** Desarrollado con Node.js y Express. Expondrá una API tRPC para la comunicación con el frontend. Gestionará la lógica de negocio, la interacción con la base de datos y la integración con el bot de automatización.
*   **Base de Datos (MySQL):** Almacenará todos los datos del sistema, incluyendo usuarios, proyectos, campañas, contenidos, prompts, keywords y la memoria editorial. Se utilizará Drizzle ORM para la interacción con la base de datos.
*   **Bot de Automatización (Python):** Un componente externo (ya existente en el repositorio clonado) que se encargará de la ejecución de tareas de automatización en plataformas multicanal. Se comunicará con el backend para obtener tareas y reportar estados.
*   **Sistema de Alertas:** Integración con el sistema de notificaciones de Manus para enviar alertas al propietario.

### 3.2. Flujo de Datos (Ejemplo: Creación de Campaña)

1.  El usuario interactúa con el frontend (React) para crear una nueva campaña.
2.  El frontend invoca un procedimiento tRPC (`trpc.campaign.create.useMutation()`) en el backend.
3.  El backend valida los datos, interactúa con la base de datos (Drizzle ORM) para almacenar la nueva campaña.
4.  El backend puede enviar una notificación al bot de automatización (si la campaña requiere acciones inmediatas) o programar tareas futuras.
5.  El backend devuelve una respuesta al frontend, que actualiza la interfaz de usuario.

## 4. Diseño de la Base de Datos (Esquema Propuesto)

Se extenderá el esquema `drizzle/schema.ts` existente con las siguientes tablas:

### `projects` (Proyectos Editoriales)

| Campo         | Tipo        | Descripción                                       | Clave Primaria | Clave Foránea | Notas                                        |
| :------------ | :---------- | :------------------------------------------------ | :------------- | :------------ | :------------------------------------------- |
| `id`          | `int`       | ID único del proyecto                             | Sí             |               | Auto-incremento                              |
| `name`        | `varchar`   | Nombre del proyecto                               |                |               |                                              |
| `description` | `text`      | Descripción detallada del proyecto                |                |               |                                              |
| `status`      | `enum`      | Estado del proyecto (activo, archivado, borrador) |                |               |                                              |
| `metadata`    | `json`      | Metadatos adicionales del proyecto                |                |               |                                              |
| `createdAt`   | `timestamp` | Fecha de creación                                 |                |               | `defaultNow()`                               |
| `updatedAt`   | `timestamp` | Última actualización                              |                |               | `onUpdateNow()`                              |

### `campaigns` (Campañas Multicanal)

| Campo           | Tipo        | Descripción                                          | Clave Primaria | Clave Foránea | Notas                                        |
| :-------------- | :---------- | :--------------------------------------------------- | :------------- | :------------ | :------------------------------------------- |
| `id`            | `int`       | ID único de la campaña                              | Sí             |               | Auto-incremento                              |
| `projectId`     | `int`       | ID del proyecto al que pertenece la campaña         |                | `projects.id` |                                              |
| `title`         | `varchar`   | Título de la campaña                                |                |               |                                              |
| `description`   | `text`      | Descripción de la campaña                            |                |               |                                              |
| `platforms`     | `json`      | Plataformas objetivo (ej: `['youtube', 'tiktok']`) |                |               |                                              |
| `startDate`     | `timestamp` | Fecha de inicio de la campaña                       |                |               |                                              |
| `endDate`       | `timestamp` | Fecha de fin de la campaña                          |                |               |                                              |
| `status`        | `enum`      | Estado de la campaña (activa, pausada, completada)  |                |               |                                              |
| `createdAt`     | `timestamp` | Fecha de creación                                    |                |               | `defaultNow()`                               |
| `updatedAt`     | `timestamp` | Última actualización                                 |                |               | `onUpdateNow()`                              |

### `content_packages` (Paquetes de Contenido)

| Campo         | Tipo        | Descripción                                       | Clave Primaria | Clave Foránea | Notas                                        |
| :------------ | :---------- | :------------------------------------------------ | :------------- | :------------ | :------------------------------------------- |\n| `id`          | `int`       | ID único del paquete de contenido                 | Sí             |               | Auto-incremento                              |
| `campaignId`  | `int`       | ID de la campaña a la que pertenece               |                | `campaigns.id`|                                              |
| `title`       | `varchar`   | Título del contenido                              |                |               |                                              |
| `type`        | `enum`      | Tipo de contenido (video, texto, imagen, audio)   |                |               |                                              |
| `content`     | `text`      | Contenido (ej: texto del artículo, URL de video)  |                |               |                                              |
| `status`      | `enum`      | Estado (borrador, aprobado, publicado)            |                |               |                                              |
| `scheduledAt` | `timestamp` | Fecha de publicación programada                   |                |               |                                              |
| `publishedAt` | `timestamp` | Fecha de publicación real                         |                |               |                                              |
| `metadata`    | `json`      | Metadatos adicionales (ej: duración, hashtags)    |                |               |                                              |
| `createdAt`   | `timestamp` | Fecha de creación                                 |                |               | `defaultNow()`                               |
| `updatedAt`   | `timestamp` | Última actualización                              |                |               | `onUpdateNow()`                              |

### `automation_jobs` (Trabajos de Automatización)

| Campo         | Tipo        | Descripción                                       | Clave Primaria | Clave Foránea | Notas                                        |
| :------------ | :---------- | :------------------------------------------------ | :------------- | :------------ | :------------------------------------------- |
| `id`          | `int`       | ID único del trabajo de automatización            | Sí             |               | Auto-incremento                              |
| `campaignId`  | `int`       | ID de la campaña asociada (opcional)              |                | `campaigns.id`|                                              |
| `type`        | `enum`      | Tipo de trabajo (publicación, análisis, etc.)     |                |               |                                              |
| `status`      | `enum`      | Estado (pendiente, en progreso, completado, error)|                |               |                                              |
| `payload`     | `json`      | Datos necesarios para el bot (ej: `contentId`)    |                |               |                                              |
| `result`      | `json`      | Resultado del trabajo (ej: URL de publicación)    |                |               |                                              |
| `logs`        | `text`      | Registros del trabajo                             |                |               |                                              |
| `scheduledAt` | `timestamp` | Fecha de ejecución programada                     |                |               |                                              |
| `startedAt`   | `timestamp` | Fecha de inicio de ejecución                      |                |               |                                              |
| `completedAt` | `timestamp` | Fecha de finalización de ejecución                |                |               |                                              |
| `createdAt`   | `timestamp` | Fecha de creación                                 |                |               | `defaultNow()`                               |
| `updatedAt`   | `timestamp` | Última actualización                              |                |               | `onUpdateNow()`                              |

### `master_prompts` (Prompts Maestros)

| Campo         | Tipo        | Descripción                                       | Clave Primaria | Clave Foránea | Notas                                        |
| :------------ | :---------- | :------------------------------------------------ | :------------- | :------------ | :------------------------------------------- |
| `id`          | `int`       | ID único del prompt                               | Sí             |               | Auto-incremento                              |
| `projectId`   | `int`       | ID del proyecto asociado (opcional)               |                | `projects.id` |                                              |
| `name`        | `varchar`   | Nombre del prompt                                 |                |               |                                              |
| `template`    | `text`      | Plantilla del prompt                              |                |               |                                              |
| `description` | `text`      | Descripción del prompt                            |                |               |                                              |
| `tags`        | `json`      | Etiquetas para categorización                     |                |               |                                              |
| `createdAt`   | `timestamp` | Fecha de creación                                 |                |               | `defaultNow()`                               |
| `updatedAt`   | `timestamp` | Última actualización                              |                |               | `onUpdateNow()`                              |

### `knowledge_base` (Base de Conocimiento Editorial)

| Campo         | Tipo        | Descripción                                       | Clave Primaria | Clave Foránea | Notas                                        |
| :------------ | :---------- | :------------------------------------------------ | :------------- | :------------ | :------------------------------------------- |
| `id`          | `int`       | ID único del recurso                              | Sí             |               | Auto-incremento                              |
| `projectId`   | `int`       | ID del proyecto asociado                          |                | `projects.id` |                                              |
| `title`       | `varchar`   | Título del recurso                                |                |               |                                              |
| `content`     | `text`      | Contenido del recurso (Markdown, URL, etc.)       |                |               |                                              |
| `type`        | `enum`      | Tipo de recurso (documento, enlace, imagen)       |                |               |                                              |
| `tags`        | `json`      | Etiquetas para categorización                     |                |               |                                              |
| `createdAt`   | `timestamp` | Fecha de creación                                 |                |               | `defaultNow()`                               |
| `updatedAt`   | `timestamp` | Última actualización                              |                |               | `onUpdateNow()`                              |

### `keywords` (Palabras Clave)

| Campo         | Tipo        | Descripción                                       | Clave Primaria | Clave Foránea | Notas                                        |
| :------------ | :---------- | :------------------------------------------------ | :------------- | :------------ | :------------------------------------------- |
| `id`          | `int`       | ID único de la palabra clave                      | Sí             |               | Auto-incremento                              |
| `projectId`   | `int`       | ID del proyecto asociado                          |                | `projects.id` |                                              |
| `keyword`     | `varchar`   | Palabra clave                                     |                |               |                                              |
| `metrics`     | `json`      | Métricas de rendimiento (ej: volumen de búsqueda) |                |               |                                              |
| `createdAt`   | `timestamp` | Fecha de creación                                 |                |               | `defaultNow()`                               |
| `updatedAt`   | `timestamp` | Última actualización                              |                |               | `onUpdateNow()`                              |

### `editorial_memory` (Memoria Editorial)

| Campo         | Tipo        | Descripción                                       | Clave Primaria | Clave Foránea | Notas                                        |
| :------------ | :---------- | :------------------------------------------------ | :------------- | :------------ | :------------------------------------------- |
| `id`          | `int`       | ID único del registro de memoria                  | Sí             |               | Auto-incremento                              |
| `projectId`   | `int`       | ID del proyecto asociado                          |                | `projects.id` |                                              |
| `entry`       | `text`      | Entrada de memoria (decisión, estilo, preferencia) |                |               |                                              |
| `type`        | `enum`      | Tipo de entrada (decisión, estilo, preferencia)    |                |               |                                              |
| `createdAt`   | `timestamp` | Fecha de creación                                 |                |               | `defaultNow()`                               |
| `updatedAt`   | `timestamp` | Última actualización                              |                |               | `onUpdateNow()`                              |

## 5. Diseño de la Interfaz de Usuario (UI)

Se utilizará el componente `DashboardLayout` existente para la estructura principal del dashboard. Cada funcionalidad se implementará como una página o componente dentro de este layout. Se priorizará la reutilización de componentes de Shadcn/ui y se seguirá una estética limpia y funcional, con énfasis en la usabilidad y la visualización clara de la información.

## 6. Sistema de Alertas

El sistema de alertas se integrará con el sistema de notificaciones de Manus. Se crearán procedimientos tRPC en el backend que, al detectar un evento crítico (fallo de automatización, campaña completada, error del sistema), invocarán la API de notificaciones de Manus para enviar un mensaje al propietario del sistema. Se utilizará la información del `OWNER_OPEN_ID` y `OWNER_NAME` configurada en las variables de entorno.

## 7. Próximos Pasos

1.  Actualizar `drizzle/schema.ts` con las nuevas tablas.
2.  Generar migraciones de Drizzle y aplicarlas a la base de datos.
3.  Implementar los procedimientos tRPC para cada funcionalidad.
4.  Desarrollar los componentes de la interfaz de usuario.
5.  Integrar el sistema de alertas.
6.  Realizar pruebas exhaustivas.

