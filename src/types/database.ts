// Supabase 테이블 타입 정의 (supabase gen types typescript 로 실제 프로젝트 연결 후 재생성 권장)

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      tag_groups: {
        Row: {
          id: string;
          slug: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tag_groups"]["Insert"]>;
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          group_id: string;
          category_id: string | null;
          name: string;
          slug: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          category_id?: string | null;
          name: string;
          slug: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tags"]["Insert"]>;
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          category_id: string;
          title: string;
          description: string | null;
          cover_image_path: string | null;
          taken_at: string | null;
          source_url: string | null;
          is_published: boolean;
          import_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          title: string;
          description?: string | null;
          cover_image_path?: string | null;
          taken_at?: string | null;
          source_url?: string | null;
          is_published?: boolean;
          import_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
        Relationships: [];
      };
      post_images: {
        Row: {
          id: string;
          post_id: string;
          image_path: string;
          width: number | null;
          height: number | null;
          sort_order: number;
          alt_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          image_path: string;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
          alt_text?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["post_images"]["Insert"]>;
        Relationships: [];
      };
      post_tags: {
        Row: {
          post_id: string;
          tag_id: string;
        };
        Insert: {
          post_id: string;
          tag_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["post_tags"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      filter_posts: {
        Args: {
          p_category_slug?: string | null;
          p_tag_ids?: string[];
        };
        Returns: Database["public"]["Tables"]["posts"]["Row"][];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
