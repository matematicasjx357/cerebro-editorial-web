"""
=============================================================================
INTEGRACIÓN SEO AVANZADA PARA WORDPRESS
wordpress_seo_integration.py
=============================================================================

Módulo para inyectar metadatos Schema.org JSON-LD y campos SEO compatibles
con plugins como RankMath y Yoast SEO directamente desde el paquete editorial.

Características:
  - Generación automática de Schema.org JSON-LD
  - Inyección de metadatos RankMath
  - Inyección de metadatos Yoast SEO
  - Optimización de fragmentos enriquecidos (Rich Snippets)
  - Validación de metadatos SEO

Autor: Cerebro Editorial
Versión: 1.0.0
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum


class SchemaType(Enum):
    """Tipos de Schema.org soportados."""
    ARTICLE = "Article"
    NEWS_ARTICLE = "NewsArticle"
    BLOG_POSTING = "BlogPosting"
    VIDEO = "VideoObject"
    IMAGE = "ImageObject"
    ORGANIZATION = "Organization"
    PERSON = "Person"
    PRODUCT = "Product"
    EVENT = "Event"


class WordPressSEOIntegration:
    """
    Integración avanzada de SEO para WordPress.
    
    Proporciona métodos para:
    - Generar Schema.org JSON-LD
    - Inyectar metadatos RankMath
    - Inyectar metadatos Yoast SEO
    - Validar y optimizar metadatos
    """

    def __init__(self, site_url: str, site_name: str):
        """
        Inicializa la integración SEO.
        
        Args:
            site_url: URL del sitio (ej: https://ejemplo.com)
            site_name: Nombre del sitio
        """
        self.site_url = site_url.rstrip("/")
        self.site_name = site_name

    def generate_article_schema(
        self,
        title: str,
        description: str,
        content: str,
        image_url: Optional[str] = None,
        author_name: Optional[str] = None,
        published_date: Optional[str] = None,
        modified_date: Optional[str] = None,
        keywords: Optional[List[str]] = None,
        article_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Genera Schema.org JSON-LD para un artículo.
        
        Args:
            title: Título del artículo
            description: Descripción/extracto
            content: Contenido HTML del artículo
            image_url: URL de la imagen destacada
            author_name: Nombre del autor
            published_date: Fecha de publicación (ISO 8601)
            modified_date: Fecha de modificación (ISO 8601)
            keywords: Lista de palabras clave
            article_url: URL del artículo
            
        Returns:
            Dict con el Schema.org JSON-LD
        """
        if not published_date:
            published_date = datetime.now().isoformat()
        if not modified_date:
            modified_date = published_date

        schema = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": title,
            "description": description,
            "articleBody": content,
            "datePublished": published_date,
            "dateModified": modified_date,
            "author": {
                "@type": "Person",
                "name": author_name or "Cerebro Editorial",
            },
            "publisher": {
                "@type": "Organization",
                "name": self.site_name,
                "logo": {
                    "@type": "ImageObject",
                    "url": f"{self.site_url}/logo.png",
                },
            },
        }

        if image_url:
            schema["image"] = {
                "@type": "ImageObject",
                "url": image_url,
                "width": 1200,
                "height": 630,
            }

        if article_url:
            schema["url"] = article_url

        if keywords:
            schema["keywords"] = ", ".join(keywords)

        return schema

    def generate_video_schema(
        self,
        title: str,
        description: str,
        video_url: str,
        thumbnail_url: Optional[str] = None,
        duration: Optional[str] = None,
        published_date: Optional[str] = None,
        upload_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Genera Schema.org JSON-LD para un video.
        
        Args:
            title: Título del video
            description: Descripción del video
            video_url: URL del video (YouTube, etc.)
            thumbnail_url: URL de la miniatura
            duration: Duración en formato ISO 8601 (ej: PT10M30S)
            published_date: Fecha de publicación
            upload_date: Fecha de carga
            
        Returns:
            Dict con el Schema.org JSON-LD para video
        """
        if not published_date:
            published_date = datetime.now().isoformat()
        if not upload_date:
            upload_date = published_date

        schema = {
            "@context": "https://schema.org",
            "@type": "VideoObject",
            "name": title,
            "description": description,
            "contentUrl": video_url,
            "uploadDate": upload_date,
            "datePublished": published_date,
        }

        if thumbnail_url:
            schema["thumbnailUrl"] = thumbnail_url

        if duration:
            schema["duration"] = duration

        return schema

    def generate_rankmath_meta(
        self,
        focus_keyword: str,
        title: str,
        description: str,
        content: str,
        keywords: Optional[List[str]] = None,
        schema_type: SchemaType = SchemaType.BLOG_POSTING,
    ) -> Dict[str, Any]:
        """
        Genera metadatos compatibles con RankMath.
        
        Args:
            focus_keyword: Palabra clave principal
            title: Título SEO
            description: Meta descripción
            content: Contenido del post
            keywords: Palabras clave adicionales
            schema_type: Tipo de Schema.org
            
        Returns:
            Dict con metadatos RankMath
        """
        return {
            "rank_math_focus_keyword": focus_keyword,
            "rank_math_title": title,
            "rank_math_description": description,
            "rank_math_content_ai": content,
            "rank_math_schema": schema_type.value,
            "rank_math_keywords": keywords or [],
            "rank_math_seo_score": self._calculate_seo_score(title, description, content),
            "rank_math_robots": ["index", "follow"],
        }

    def generate_yoast_meta(
        self,
        focus_keyword: str,
        title: str,
        description: str,
        content: str,
        keywords: Optional[List[str]] = None,
        readability_score: str = "good",
    ) -> Dict[str, Any]:
        """
        Genera metadatos compatibles con Yoast SEO.
        
        Args:
            focus_keyword: Palabra clave principal
            title: Título SEO
            description: Meta descripción
            content: Contenido del post
            keywords: Palabras clave adicionales
            readability_score: Puntuación de legibilidad (good, ok, bad)
            
        Returns:
            Dict con metadatos Yoast SEO
        """
        return {
            "_yoast_wpseo_focuskw": focus_keyword,
            "_yoast_wpseo_title": title,
            "_yoast_wpseo_metadesc": description,
            "_yoast_wpseo_content_score": self._calculate_seo_score(title, description, content),
            "_yoast_wpseo_readability_score": readability_score,
            "_yoast_wpseo_linkdex": "0",
            "_yoast_wpseo_primary_category": "1",
            "_yoast_wpseo_canonical": "",
            "_yoast_wpseo_redirect": "",
            "_yoast_wpseo_opengraph-title": title,
            "_yoast_wpseo_opengraph-description": description,
        }

    def generate_open_graph_meta(
        self,
        title: str,
        description: str,
        image_url: Optional[str] = None,
        url: Optional[str] = None,
        type_: str = "article",
    ) -> Dict[str, str]:
        """
        Genera metadatos Open Graph para redes sociales.
        
        Args:
            title: Título
            description: Descripción
            image_url: URL de la imagen
            url: URL del contenido
            type_: Tipo de contenido (article, video, etc.)
            
        Returns:
            Dict con metadatos Open Graph
        """
        og_meta = {
            "og:title": title,
            "og:description": description,
            "og:type": type_,
            "og:site_name": self.site_name,
        }

        if image_url:
            og_meta["og:image"] = image_url
            og_meta["og:image:width"] = "1200"
            og_meta["og:image:height"] = "630"

        if url:
            og_meta["og:url"] = url

        return og_meta

    def generate_twitter_card_meta(
        self,
        title: str,
        description: str,
        image_url: Optional[str] = None,
        creator: Optional[str] = None,
        card_type: str = "summary_large_image",
    ) -> Dict[str, str]:
        """
        Genera metadatos Twitter Card.
        
        Args:
            title: Título
            description: Descripción
            image_url: URL de la imagen
            creator: Usuario de Twitter del creador
            card_type: Tipo de tarjeta (summary, summary_large_image, player)
            
        Returns:
            Dict con metadatos Twitter Card
        """
        twitter_meta = {
            "twitter:card": card_type,
            "twitter:title": title,
            "twitter:description": description,
        }

        if image_url:
            twitter_meta["twitter:image"] = image_url

        if creator:
            twitter_meta["twitter:creator"] = creator

        return twitter_meta

    def inject_seo_meta_into_post(
        self,
        post_data: Dict[str, Any],
        seo_config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Inyecta metadatos SEO en un post de WordPress.
        
        Args:
            post_data: Datos del post de WordPress
            seo_config: Configuración SEO con campos como:
                - focus_keyword: Palabra clave principal
                - title: Título SEO
                - description: Meta descripción
                - keywords: Lista de palabras clave
                - schema_type: Tipo de Schema.org
                - author_name: Nombre del autor
                - image_url: URL de imagen destacada
                
        Returns:
            post_data actualizado con metadatos SEO
        """
        focus_keyword = seo_config.get("focus_keyword", "")
        title = seo_config.get("title", post_data.get("title", ""))
        description = seo_config.get("description", post_data.get("excerpt", ""))
        keywords = seo_config.get("keywords", [])
        schema_type = seo_config.get("schema_type", SchemaType.BLOG_POSTING)
        author_name = seo_config.get("author_name", "Cerebro Editorial")
        image_url = seo_config.get("image_url")
        article_url = seo_config.get("article_url")
        content = post_data.get("content", "")

        # Generar Schema.org JSON-LD
        article_schema = self.generate_article_schema(
            title=title,
            description=description,
            content=content,
            image_url=image_url,
            author_name=author_name,
            keywords=keywords,
            article_url=article_url,
        )

        # Generar metadatos RankMath
        rankmath_meta = self.generate_rankmath_meta(
            focus_keyword=focus_keyword,
            title=title,
            description=description,
            content=content,
            keywords=keywords,
            schema_type=schema_type,
        )

        # Generar metadatos Yoast SEO
        yoast_meta = self.generate_yoast_meta(
            focus_keyword=focus_keyword,
            title=title,
            description=description,
            content=content,
            keywords=keywords,
        )

        # Generar Open Graph
        og_meta = self.generate_open_graph_meta(
            title=title,
            description=description,
            image_url=image_url,
            url=article_url,
        )

        # Generar Twitter Card
        twitter_meta = self.generate_twitter_card_meta(
            title=title,
            description=description,
            image_url=image_url,
        )

        # Inyectar en meta fields de WordPress
        if "meta" not in post_data:
            post_data["meta"] = {}

        # Inyectar Schema.org JSON-LD
        post_data["meta"]["schema_org_json_ld"] = json.dumps(article_schema)

        # Inyectar RankMath
        post_data["meta"].update(rankmath_meta)

        # Inyectar Yoast
        post_data["meta"].update(yoast_meta)

        # Inyectar Open Graph y Twitter Card en content si es necesario
        # (Algunos plugins los leen de meta fields)
        post_data["meta"].update(og_meta)
        post_data["meta"].update(twitter_meta)

        # Actualizar título y descripción
        if seo_config.get("update_title"):
            post_data["title"] = title
        if seo_config.get("update_excerpt"):
            post_data["excerpt"] = description

        return post_data

    def _calculate_seo_score(self, title: str, description: str, content: str) -> int:
        """
        Calcula una puntuación SEO básica (0-100).
        
        Args:
            title: Título
            description: Descripción
            content: Contenido
            
        Returns:
            Puntuación SEO (0-100)
        """
        score = 0

        # Verificar título
        if title and 30 <= len(title) <= 60:
            score += 20
        elif title:
            score += 10

        # Verificar descripción
        if description and 120 <= len(description) <= 160:
            score += 20
        elif description:
            score += 10

        # Verificar contenido
        if content:
            word_count = len(content.split())
            if word_count >= 300:
                score += 20
            elif word_count >= 150:
                score += 10

        # Verificar palabras clave
        if title and description and content:
            score += 20

        # Verificar estructura
        if "<h2>" in content or "<h3>" in content:
            score += 10

        return min(score, 100)

    def validate_seo_meta(self, seo_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Valida la configuración SEO.
        
        Args:
            seo_config: Configuración SEO a validar
            
        Returns:
            Dict con validación y sugerencias
        """
        issues = []
        warnings = []
        suggestions = []

        # Validar título
        title = seo_config.get("title", "")
        if not title:
            issues.append("Título SEO no proporcionado")
        elif len(title) < 30:
            warnings.append(f"Título muy corto ({len(title)} caracteres). Mínimo recomendado: 30")
        elif len(title) > 60:
            warnings.append(f"Título muy largo ({len(title)} caracteres). Máximo recomendado: 60")

        # Validar descripción
        description = seo_config.get("description", "")
        if not description:
            issues.append("Meta descripción no proporcionada")
        elif len(description) < 120:
            warnings.append(f"Descripción muy corta ({len(description)} caracteres). Mínimo recomendado: 120")
        elif len(description) > 160:
            warnings.append(f"Descripción muy larga ({len(description)} caracteres). Máximo recomendado: 160")

        # Validar palabra clave
        focus_keyword = seo_config.get("focus_keyword", "")
        if not focus_keyword:
            issues.append("Palabra clave principal no proporcionada")
        elif focus_keyword not in title.lower():
            warnings.append("Palabra clave no aparece en el título")
        elif focus_keyword not in description.lower():
            warnings.append("Palabra clave no aparece en la descripción")

        # Sugerencias
        if not seo_config.get("keywords"):
            suggestions.append("Considera agregar palabras clave relacionadas")
        if not seo_config.get("image_url"):
            suggestions.append("Considera agregar una imagen destacada para mejor SEO")

        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "suggestions": suggestions,
        }
