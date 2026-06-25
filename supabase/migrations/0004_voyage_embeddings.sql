-- ===== تغییر ابعاد embedding به 1024 (Voyage AI voyage-3) =====
-- برای پایگاه‌داده‌هایی که قبلاً migration قبلی را اجرا کرده‌اند.

drop index if exists public.chat_embeddings_vector_idx;

alter table public.chat_embeddings
  alter column embedding type vector(1024)
  using embedding::text::vector(1024);

create index chat_embeddings_vector_idx
  on public.chat_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.match_documents(
  query_embedding vector(1024),
  match_threshold float,
  match_count int,
  p_locale text default 'fa'
)
returns table (
  id uuid,
  title text,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    cd.id,
    cd.title,
    ce.content,
    1 - (ce.embedding <=> query_embedding) as similarity
  from public.chat_embeddings ce
  join public.chat_documents cd on cd.id = ce.document_id
  where 1 - (ce.embedding <=> query_embedding) > match_threshold
    and cd.locale = p_locale
  order by similarity desc
  limit match_count;
end;
$$;

-- حذف embeddings قدیمی برای تولید مجدد با ابعاد جدید
delete from public.chat_embeddings;
