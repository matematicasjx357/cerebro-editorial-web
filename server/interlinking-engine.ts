/**
 * Motor de Enlazado Automático Transversal
 * interlinking_engine.ts
 *
 * Busca artículos antiguos del mismo cluster e inyecta enlaces contextuales
 * para potenciar la autoridad SEO y mejorar la navegación interna.
 */

import axios, { AxiosInstance } from "axios";
import { JSDOM } from "jsdom";

interface WordPressPost {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  link: string;
  categories: number[];
  tags: number[];
  meta?: Record<string, any>;
}

interface InterlinkingConfig {
  wordpressUrl: string;
  username: string;
  applicationPassword: string;
  maxLinksPerPost?: number;
  minRelevanceScore?: number;
}

export class InterlinkingEngine {
  private wpClient: AxiosInstance;
  private config: InterlinkingConfig;

  constructor(config: InterlinkingConfig) {
    this.config = {
      maxLinksPerPost: 5,
      minRelevanceScore: 0.6,
      ...config,
    };

    // Configurar cliente HTTP con autenticación Basic
    const auth = Buffer.from(
      `${this.config.username}:${this.config.applicationPassword}`
    ).toString("base64");

    this.wpClient = axios.create({
      baseURL: `${this.config.wordpressUrl}/wp-json/wp/v2`,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Procesa un post recién publicado e inyecta enlaces internos
   */
  async processNewPost(postId: number): Promise<{
    success: boolean;
    linksAdded: number;
    error?: string;
  }> {
    try {
      // 1. Obtener el post recién publicado
      const newPost = await this.getPost(postId);
      if (!newPost) {
        return { success: false, linksAdded: 0, error: "Post not found" };
      }

      // 2. Extraer palabras clave del post
      const keywords = this.extractKeywords(newPost);

      // 3. Buscar posts relacionados
      const relatedPosts = await this.findRelatedPosts(
        newPost,
        keywords
      );

      // 4. Inyectar enlaces en el contenido
      const updatedContent = this.injectLinks(
        newPost.content,
        relatedPosts,
        postId
      );

      // 5. Actualizar el post en WordPress
      if (updatedContent !== newPost.content) {
        await this.updatePost(postId, { content: updatedContent });
      }

      return {
        success: true,
        linksAdded: relatedPosts.length,
      };
    } catch (error) {
      return {
        success: false,
        linksAdded: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Obtiene un post de WordPress
   */
  private async getPost(postId: number): Promise<WordPressPost | null> {
    try {
      const response = await this.wpClient.get(`/posts/${postId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching post ${postId}:`, error);
      return null;
    }
  }

  /**
   * Actualiza un post en WordPress
   */
  private async updatePost(
    postId: number,
    updates: Partial<WordPressPost>
  ): Promise<boolean> {
    try {
      await this.wpClient.post(`/posts/${postId}`, updates);
      return true;
    } catch (error) {
      console.error(`Error updating post ${postId}:`, error);
      return false;
    }
  }

  /**
   * Extrae palabras clave del contenido del post
   */
  private extractKeywords(post: WordPressPost): string[] {
    // Combinar título, excerpt y primeras 500 caracteres del contenido
    const text = `${post.title} ${post.excerpt} ${post.content.substring(0, 500)}`;

    // Remover HTML tags
    const cleanText = text.replace(/<[^>]*>/g, "");

    // Palabras clave: palabras con más de 4 caracteres
    const words = cleanText
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 4 && !this.isStopWord(word));

    // Retornar palabras únicas
    return [...new Set(words)].slice(0, 10);
  }

  /**
   * Verifica si una palabra es una "stop word" (palabra común sin valor SEO)
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      "about",
      "after",
      "again",
      "against",
      "all",
      "am",
      "an",
      "and",
      "any",
      "are",
      "as",
      "at",
      "be",
      "because",
      "been",
      "before",
      "being",
      "below",
      "between",
      "both",
      "but",
      "by",
      "can",
      "could",
      "did",
      "do",
      "does",
      "doing",
      "down",
      "during",
      "each",
      "few",
      "for",
      "from",
      "further",
      "had",
      "has",
      "have",
      "having",
      "he",
      "her",
      "here",
      "hers",
      "herself",
      "him",
      "himself",
      "his",
      "how",
      "i",
      "if",
      "in",
      "into",
      "is",
      "it",
      "its",
      "itself",
      "just",
      "me",
      "might",
      "more",
      "most",
      "my",
      "myself",
      "no",
      "nor",
      "not",
      "of",
      "off",
      "on",
      "once",
      "only",
      "or",
      "other",
      "our",
      "ours",
      "ourselves",
      "out",
      "over",
      "own",
      "same",
      "she",
      "should",
      "so",
      "some",
      "such",
      "than",
      "that",
      "the",
      "their",
      "theirs",
      "them",
      "themselves",
      "then",
      "there",
      "these",
      "they",
      "this",
      "those",
      "through",
      "to",
      "too",
      "under",
      "until",
      "up",
      "very",
      "was",
      "we",
      "were",
      "what",
      "when",
      "where",
      "which",
      "while",
      "who",
      "whom",
      "why",
      "will",
      "with",
      "you",
      "your",
      "yours",
      "yourself",
      "yourselves",
    ];
    return stopWords.includes(word);
  }

  /**
   * Busca posts relacionados basados en palabras clave
   */
  private async findRelatedPosts(
    currentPost: WordPressPost,
    keywords: string[]
  ): Promise<WordPressPost[]> {
    const relatedPosts: WordPressPost[] = [];

    for (const keyword of keywords) {
      try {
        // Buscar posts que contengan la palabra clave
        const response = await this.wpClient.get("/posts", {
          params: {
            search: keyword,
            exclude: currentPost.id,
            per_page: 5,
          },
        });

        const posts = response.data || [];
        relatedPosts.push(
          ...posts.filter((p: WordPressPost) => {
            // No incluir posts ya en la lista
            return !relatedPosts.find((rp) => rp.id === p.id);
          })
        );
      } catch (error) {
        console.error(`Error searching for keyword "${keyword}":`, error);
      }
    }

    // Limitar a maxLinksPerPost
    return relatedPosts.slice(0, this.config.maxLinksPerPost);
  }

  /**
   * Inyecta enlaces internos en el contenido
   */
  private injectLinks(
    content: string,
    relatedPosts: WordPressPost[],
    currentPostId: number
  ): string {
    if (relatedPosts.length === 0) return content;

    try {
      const dom = new JSDOM(content);
      const doc = dom.window.document;

      // Obtener párrafos
      const paragraphs = doc.querySelectorAll("p");

      // Inyectar enlaces en párrafos estratégicos
      let linksInjected = 0;
      for (let i = 0; i < paragraphs.length && linksInjected < relatedPosts.length; i++) {
        const para = paragraphs[i];
        const text = para.textContent || "";

        // Buscar una palabra clave del post relacionado en el párrafo
        for (const relatedPost of relatedPosts) {
          if (linksInjected >= this.config.maxLinksPerPost) break;

          const keywords = this.extractKeywords(relatedPost);
          for (const keyword of keywords) {
            // Buscar la palabra en el párrafo (case-insensitive)
            const regex = new RegExp(`\\b${keyword}\\b`, "gi");
            if (regex.test(text)) {
              // Crear enlace
              const link = doc.createElement("a");
              link.href = relatedPost.link;
              link.textContent = keyword;
              link.title = relatedPost.title;

              // Reemplazar la primera ocurrencia
              const innerHTML = para.innerHTML;
              const newInnerHTML = innerHTML.replace(
                regex,
                link.outerHTML
              );
              para.innerHTML = newInnerHTML;

              linksInjected++;
              break;
            }
          }
        }
      }

      return dom.serialize();
    } catch (error) {
      console.error("Error injecting links:", error);
      return content; // Retornar contenido original si hay error
    }
  }

  /**
   * Ejecuta interlinking en todos los posts publicados (útil para inicialización)
   */
  async processAllPosts(): Promise<{
    processed: number;
    linksAdded: number;
    errors: number;
  }> {
    const stats = { processed: 0, linksAdded: 0, errors: 0 };

    try {
      // Obtener todos los posts publicados
      const response = await this.wpClient.get("/posts", {
        params: { per_page: 100, status: "publish" },
      });

      const posts = response.data || [];

      for (const post of posts) {
        const result = await this.processNewPost(post.id);
        stats.processed++;
        if (result.success) {
          stats.linksAdded += result.linksAdded;
        } else {
          stats.errors++;
        }
      }
    } catch (error) {
      console.error("Error processing all posts:", error);
    }

    return stats;
  }
}

/**
 * Factory para crear instancia del motor
 */
export function createInterlinkingEngine(
  config: InterlinkingConfig
): InterlinkingEngine {
  return new InterlinkingEngine(config);
}
