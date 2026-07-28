# Ejemplo de Integración SEO Avanzada

## Uso del módulo `wordpress_seo_integration.py`

### 1. Inicialización

```python
from wordpress_seo_integration import WordPressSEOIntegration, SchemaType

# Inicializar la integración
seo = WordPressSEOIntegration(
    site_url="https://tudominio.com",
    site_name="Mi Sitio Editorial"
)
```

### 2. Generar Schema.org JSON-LD

```python
# Para un artículo
article_schema = seo.generate_article_schema(
    title="Cómo Crear Mundos Simulados con IA",
    description="Guía completa sobre la creación de entornos virtuales usando inteligencia artificial",
    content="<p>Contenido del artículo...</p>",
    image_url="https://tudominio.com/images/mundos-simulados.jpg",
    author_name="Juan Pérez",
    keywords=["IA", "mundos virtuales", "simulación"],
    article_url="https://tudominio.com/articulos/mundos-simulados"
)

# Para un video
video_schema = seo.generate_video_schema(
    title="Tutorial: Creando Mundos Simulados",
    description="Video tutorial sobre cómo crear entornos virtuales",
    video_url="https://youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnail_url="https://tudominio.com/thumbnails/tutorial.jpg",
    duration="PT10M30S",  # ISO 8601 format
    published_date="2024-01-15T10:30:00Z"
)
```

### 3. Generar Metadatos RankMath

```python
rankmath_meta = seo.generate_rankmath_meta(
    focus_keyword="mundos simulados IA",
    title="Cómo Crear Mundos Simulados con IA | Mi Sitio",
    description="Aprende a crear entornos virtuales realistas usando inteligencia artificial. Guía paso a paso.",
    content="<p>Contenido del post...</p>",
    keywords=["IA", "mundos virtuales", "simulación", "realidad virtual"],
    schema_type=SchemaType.BLOG_POSTING
)
```

### 4. Generar Metadatos Yoast SEO

```python
yoast_meta = seo.generate_yoast_meta(
    focus_keyword="mundos simulados IA",
    title="Cómo Crear Mundos Simulados con IA | Mi Sitio",
    description="Aprende a crear entornos virtuales realistas usando inteligencia artificial. Guía paso a paso.",
    content="<p>Contenido del post...</p>",
    keywords=["IA", "mundos virtuales", "simulación"],
    readability_score="good"
)
```

### 5. Generar Open Graph y Twitter Card

```python
og_meta = seo.generate_open_graph_meta(
    title="Cómo Crear Mundos Simulados con IA",
    description="Guía completa sobre la creación de entornos virtuales",
    image_url="https://tudominio.com/images/mundos-simulados.jpg",
    url="https://tudominio.com/articulos/mundos-simulados",
    type_="article"
)

twitter_meta = seo.generate_twitter_card_meta(
    title="Cómo Crear Mundos Simulados con IA",
    description="Guía completa sobre la creación de entornos virtuales",
    image_url="https://tudominio.com/images/mundos-simulados.jpg",
    creator="@tutwitter",
    card_type="summary_large_image"
)
```

### 6. Inyectar en un Post de WordPress

```python
# Datos del post
post_data = {
    "title": "Cómo Crear Mundos Simulados con IA",
    "content": "<p>Contenido del artículo...</p>",
    "excerpt": "Guía completa",
    "meta": {}
}

# Configuración SEO
seo_config = {
    "focus_keyword": "mundos simulados IA",
    "title": "Cómo Crear Mundos Simulados con IA | Mi Sitio",
    "description": "Aprende a crear entornos virtuales realistas usando IA. Guía paso a paso.",
    "keywords": ["IA", "mundos virtuales", "simulación", "realidad virtual"],
    "schema_type": SchemaType.BLOG_POSTING,
    "author_name": "Juan Pérez",
    "image_url": "https://tudominio.com/images/mundos-simulados.jpg",
    "article_url": "https://tudominio.com/articulos/mundos-simulados",
    "update_title": True,
    "update_excerpt": True
}

# Inyectar SEO
post_data_with_seo = seo.inject_seo_meta_into_post(post_data, seo_config)

# Ahora post_data_with_seo contiene todos los metadatos SEO
# Enviar a WordPress API
# response = requests.post(
#     "https://tudominio.com/wp-json/wp/v2/posts",
#     json=post_data_with_seo,
#     headers={"Authorization": "Basic ..."}
# )
```

### 7. Validar Configuración SEO

```python
validation = seo.validate_seo_meta(seo_config)

print(f"Válido: {validation['valid']}")
print(f"Problemas: {validation['issues']}")
print(f"Advertencias: {validation['warnings']}")
print(f"Sugerencias: {validation['suggestions']}")
```

## Integración con bot_playwright.py

En `bot_playwright.py`, puedes usar la integración SEO al publicar en WordPress:

```python
from wordpress_seo_integration import WordPressSEOIntegration, SchemaType

class WordPressPublisher(BasePublisher):
    def __init__(self, credentials):
        super().__init__(credentials)
        self.seo = WordPressSEOIntegration(
            site_url=credentials.get("site_url"),
            site_name=credentials.get("site_name", "Mi Sitio")
        )
    
    def publish(self, content: Dict[str, Any]) -> Dict[str, Any]:
        # ... código existente ...
        
        # Extraer configuración SEO del payload
        seo_config = content.get("seo", {})
        
        # Inyectar metadatos SEO
        if seo_config:
            post_data = self.seo.inject_seo_meta_into_post(post_data, seo_config)
        
        # ... continuar con la publicación ...
```

## Estructura de Metadatos Generados

El módulo inyecta los siguientes metadatos en el post de WordPress:

### Meta Fields de WordPress
- `schema_org_json_ld`: Schema.org JSON-LD completo
- `rank_math_*`: Metadatos para RankMath
- `_yoast_wpseo_*`: Metadatos para Yoast SEO
- `og:*`: Metadatos Open Graph
- `twitter:*`: Metadatos Twitter Card

### Ejemplo de JSON-LD Generado

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Cómo Crear Mundos Simulados con IA",
  "description": "Guía completa sobre la creación de entornos virtuales",
  "articleBody": "<p>Contenido...</p>",
  "datePublished": "2024-01-15T10:30:00Z",
  "dateModified": "2024-01-15T10:30:00Z",
  "author": {
    "@type": "Person",
    "name": "Juan Pérez"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Mi Sitio Editorial",
    "logo": {
      "@type": "ImageObject",
      "url": "https://tudominio.com/logo.png"
    }
  },
  "image": {
    "@type": "ImageObject",
    "url": "https://tudominio.com/images/mundos-simulados.jpg",
    "width": 1200,
    "height": 630
  },
  "keywords": "IA, mundos virtuales, simulación"
}
```

## Validación SEO

El módulo proporciona validación automática:

```python
validation = seo.validate_seo_meta(seo_config)

# Retorna:
{
    "valid": True/False,
    "issues": ["Lista de problemas críticos"],
    "warnings": ["Lista de advertencias"],
    "suggestions": ["Lista de sugerencias de mejora"]
}
```

## Puntuación SEO

La función `_calculate_seo_score()` evalúa:
- Longitud del título (30-60 caracteres)
- Longitud de la descripción (120-160 caracteres)
- Cantidad de contenido (mínimo 300 palabras)
- Presencia de palabras clave
- Estructura de encabezados

Retorna una puntuación de 0-100.

## Compatibilidad

- ✅ RankMath SEO
- ✅ Yoast SEO
- ✅ WordPress Native Meta
- ✅ Open Graph (Facebook, LinkedIn)
- ✅ Twitter Card
- ✅ Schema.org JSON-LD

---

*Desarrollado por Cerebro Editorial - Sistema Universal de Automatización.*
