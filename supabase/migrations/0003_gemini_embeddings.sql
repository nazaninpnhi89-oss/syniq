-- ===== تغییر ابعاد embedding از 1536 (OpenAI) به 768 (Gemini text-embedding-004) =====
-- این migration فقط برای پایگاه‌داده‌هایی است که قبلاً 0002_chat.sql را اجرا کرده‌اند.

drop index if exists public.chat_embeddings_vector_idx;

-- تغییر نوع ستون (قبلاً vector(1536)، حالا vector(768))
alter table public.chat_embeddings
  alter column embedding type vector(768)
  using embedding::text::vector(768);

-- بازسازی ایندکس با ابعاد جدید
create index chat_embeddings_vector_idx
  on public.chat_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- به‌روزرسانی تابع RPC جستجوی برداری
create or replace function public.match_documents(
  query_embedding vector(768),
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

-- حذف embeddings قدیمی (اگر وجود داشتند) تا با ابعاد جدید دوباره تولید شوند
delete from public.chat_embeddings;
