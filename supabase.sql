create or replace index on "public"."images" using btree (category);

create or replace index on "public"."quotes" using btree (language);

create or replace function get_image_categories()
returns table (
  name text,
  count bigint
)
language plpgsql
as $$
begin
  return query
    select
      category as name,
      count(category)
    from images
    group by category
    order by count(category) desc;
end;$$;


create or replace function get_image_photographers()
returns table (
  name text,
  count bigint
)
language plpgsql
as $$
begin
  return query
    select
      photographer as name,
      count(photographer)
    from images
    group by photographer
    order by count(photographer) desc;
end;$$;


create or replace function get_quote_languages()
returns table (
  name text,
  count bigint
)
language plpgsql
as $$
begin
  return query
    select
      language as name,
      count(language)
    from quotes
    group by language
    order by count(language) desc;
end;$$;


create or replace function get_random_image(
  _category text default 'landscapes',
  _exclude text default ''
)
returns setof images
language plpgsql
as $$
begin
  return query
    select *
    from images
    where
      category = _category
      and
      cast(pun as text) not in (select * from unnest(string_to_array(_exclude, ',')))
    order by random()
    limit 1;
end;$$;


create or replace function get_random_old_quote(
  _language text default 'English'
)
returns setof old_quotes
language plpgsql
as $$
begin
  return query
    select *
    from old_quotes
    where language = _language
    order by random()
    limit 1;
end;$$;


create or replace function get_random_quote(
  _language text default 'en'
)
returns setof quotes
language plpgsql
as $$
begin
  return query
    select *
    from quotes
    where language = _language
    order by random()
    limit 1;
end;$$;


-- Marketplace analytics table
create table if not exists marketplace_analytics (
  item_id text not null,
  category text not null,
  views bigint default 0,
  downloads bigint default 0,
  updated_at timestamp with time zone default now(),
  constraint marketplace_analytics_pkey primary key (item_id, category)
);

create index if not exists idx_marketplace_analytics_category on marketplace_analytics(category);
create index if not exists idx_marketplace_analytics_views on marketplace_analytics(views desc);
create index if not exists idx_marketplace_analytics_downloads on marketplace_analytics(downloads desc);


-- Function to increment marketplace item views
create or replace function increment_marketplace_views(
  _item_id text,
  _category text
)
returns void
language plpgsql
as $$
begin
  insert into marketplace_analytics (item_id, category, views, updated_at)
  values (_item_id, _category, 1, now())
  on conflict (item_id, category)
  do update set
    views = marketplace_analytics.views + 1,
    updated_at = now();
end;$$;


-- Function to increment marketplace item downloads
create or replace function increment_marketplace_downloads(
  _item_id text,
  _category text
)
returns void
language plpgsql
as $$
begin
  insert into marketplace_analytics (item_id, category, downloads, updated_at)
  values (_item_id, _category, 1, now())
  on conflict (item_id, category)
  do update set
    downloads = marketplace_analytics.downloads + 1,
    updated_at = now();
end;$$;
