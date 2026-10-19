-- Métricas semanais (preenchimento manual, uma linha por semana, segunda-feira)
CREATE TABLE IF NOT EXISTS public.metricas_semanais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana date NOT NULL UNIQUE,
  linkedin_impressoes numeric,
  linkedin_posts numeric,
  linkedin_seguidores numeric,
  youtube_views numeric,
  youtube_inscritos numeric,
  youtube_inscritos_novos numeric,
  youtube_horas numeric,
  manychat_envios numeric,
  manychat_cliques numeric,
  manychat_novos_seguidores numeric,
  eduzz_vendas numeric,
  eduzz_receita numeric,
  crm_leads numeric,
  crm_convertidos numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Acesso só pela função pb-crm-admin (service role). Sem acesso público.
ALTER TABLE public.metricas_semanais ENABLE ROW LEVEL SECURITY;
