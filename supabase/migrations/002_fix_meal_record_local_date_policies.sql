CREATE OR REPLACE FUNCTION public.budapest_today()
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
    SELECT (NOW() AT TIME ZONE 'Europe/Budapest')::date;
$$;

DROP POLICY IF EXISTS "Authenticated users can insert meal records for today or past" ON meal_records;
DROP POLICY IF EXISTS "Anyone can update meal records for today or past" ON meal_records;
DROP POLICY IF EXISTS "Anyone can delete today or past meal records" ON meal_records;

CREATE POLICY "Authenticated users can insert meal records for today or past"
    ON meal_records FOR INSERT
    WITH CHECK (
      auth.uid() = recorded_by
      AND date <= public.budapest_today()
    );

CREATE POLICY "Anyone can update meal records for today or past"
    ON meal_records FOR UPDATE
    USING (date <= public.budapest_today())
    WITH CHECK (date <= public.budapest_today());

CREATE POLICY "Anyone can delete today or past meal records"
    ON meal_records FOR DELETE
    USING (date <= public.budapest_today());
