CREATE TABLE public.market_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id uuid NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  market text NOT NULL,
  pick text NOT NULL,
  actual_result text,
  was_correct boolean,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (prediction_id, market)
);

GRANT SELECT, INSERT, UPDATE ON public.market_results TO anon;
GRANT SELECT, INSERT, UPDATE ON public.market_results TO authenticated;
GRANT ALL ON public.market_results TO service_role;

ALTER TABLE public.market_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY market_results_public_read ON public.market_results FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY market_results_public_insert ON public.market_results FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY market_results_public_update ON public.market_results FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_market_results_updated_at BEFORE UPDATE ON public.market_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX market_results_prediction_id_idx ON public.market_results (prediction_id);