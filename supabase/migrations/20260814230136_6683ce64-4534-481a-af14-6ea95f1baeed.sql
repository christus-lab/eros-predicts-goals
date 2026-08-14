CREATE TABLE public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  raw_input TEXT NOT NULL,
  analysis JSONB NOT NULL,
  confidence INTEGER,
  actual_result TEXT,
  was_correct BOOLEAN,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO authenticated;
GRANT ALL ON public.predictions TO service_role;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "predictions_public_read" ON public.predictions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "predictions_public_insert" ON public.predictions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "predictions_public_update" ON public.predictions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.learning_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  lesson TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_notes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_notes TO authenticated;
GRANT ALL ON public.learning_notes TO service_role;
ALTER TABLE public.learning_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learning_public_read" ON public.learning_notes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "learning_public_insert" ON public.learning_notes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "learning_public_update" ON public.learning_notes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON public.predictions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();