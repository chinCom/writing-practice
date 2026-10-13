-- Supabase can create this event-trigger helper when automatic RLS is enabled.
-- Database event triggers still run it. Browser/API roles must not invoke it.
-- Local PostgreSQL and projects without the helper need no change.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END;
$$;
