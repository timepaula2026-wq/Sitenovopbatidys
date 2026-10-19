// Trecho para adicionar na Edge Function `pb-crm-admin` (projeto fhfphlqrgtabkiqoywea).
// O código dessa função NÃO está neste repositório: copie para dentro dela.
// Adapte os nomes `json`, `supabase` e a checagem de senha ao que já existe na função
// (os outros actions já validam o header X-Admin-Password).
//
// Coloque ANTES do retorno de "action não encontrada" / depois da validação de senha:

if (action === 'metricas_list') {
  const { data, error } = await supabase
    .from('metricas_semanais')
    .select('*')
    .order('semana', { ascending: false });
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ rows: data ?? [] });
}

if (action === 'metricas_save') {
  const body = await req.json();
  const row = {
    semana: body.semana,
    linkedin_impressoes: body.linkedin_impressoes ?? null,
    linkedin_posts: body.linkedin_posts ?? null,
    linkedin_seguidores: body.linkedin_seguidores ?? null,
    youtube_views: body.youtube_views ?? null,
    youtube_inscritos: body.youtube_inscritos ?? null,
    youtube_inscritos_novos: body.youtube_inscritos_novos ?? null,
    youtube_horas: body.youtube_horas ?? null,
    manychat_envios: body.manychat_envios ?? null,
    manychat_cliques: body.manychat_cliques ?? null,
    manychat_novos_seguidores: body.manychat_novos_seguidores ?? null,
    eduzz_vendas: body.eduzz_vendas ?? null,
    eduzz_receita: body.eduzz_receita ?? null,
    crm_leads: body.crm_leads ?? null,
    crm_convertidos: body.crm_convertidos ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('metricas_semanais')
    .upsert(row, { onConflict: 'semana' });
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true });
}
