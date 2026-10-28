-- PostgREST caches its schema catalogue. The 48 migrations created ~90 tables but
-- the API layer still resolves none of them, so notify the cache to reload.
notify pgrst, 'reload schema';
