-- Fixed data for the visual suite, loaded into its disposable Postgres. One title per genre, so the
-- daily picks are the same on any day.
insert into streaming_services (tmdb_id, name) values
    (8, 'Netflix'), (1899, 'Max'), (119, 'Prime Video'), (337, 'Disney+'), (307, 'Globoplay');

insert into genres (tmdb_id, name, kinne_genre) values
    (28, 'Ação', 'action'),
    (35, 'Comédia', 'comedy'),
    (18, 'Drama', 'drama'),
    (10749, 'Romance', 'romance'),
    (53, 'Suspense', 'suspense');

insert into catalog_titles (
    tmdb_id, title_type, slug, display_title, original_title, tagline, synopsis,
    poster_image_path, backdrop_image_path, backdrop_width, release_year, runtime_minutes,
    tmdb_average_rating, tmdb_vote_count, last_synced_at, certification_br, certification_source,
    is_recommendable
)
select
    g.tmdb_id, 'movie', 'filme-' || g.kinne_genre || '-2020', 'Filme de ' || g.name, 'Film',
    'Uma frase curta sobre o filme de ' || g.name || '.',
    'Uma sinopse fixa, longa o bastante para ocupar mais de uma linha na tela do título. '
        || 'Serve só para travar o layout nas capturas de tela da suíte visual.',
    '/poster.jpg', '/backdrop.jpg', 1920, 2020, 120, 8.0, 5000, now(), '14', 'br', true
from genres g;

insert into catalog_title_genres (catalog_title_id, genre_id)
select t.id, g.id from catalog_titles t join genres g on g.tmdb_id = t.tmdb_id;

insert into streaming_availability (streaming_service_id, catalog_title_id, country_code)
select s.id, t.id, 'BR' from streaming_services s cross join catalog_titles t
where s.tmdb_id in (8, 119);

-- Max only on this title: after declining Netflix and Prime Video, it is what is left to draw.
insert into streaming_availability (streaming_service_id, catalog_title_id, country_code)
select s.id, t.id, 'BR' from streaming_services s cross join catalog_titles t
where s.tmdb_id = 1899 and t.slug = 'filme-action-2020';

insert into people (tmdb_person_id, name) values (1, 'Pessoa Diretora'), (2, 'Pessoa Atriz');

insert into title_credits (catalog_title_id, person_id, role, credit_order, character_name)
select t.id, p.id, r.role, 0, r.character_name
from catalog_titles t
cross join (values (1, 'director', null), (2, 'cast', 'Personagem')) as r(person, role, character_name)
join people p on p.tmdb_person_id = r.person;
