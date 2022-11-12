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
  _category text default 'outdoors',
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
