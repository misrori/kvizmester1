
-- Add score column to quiz_answers
ALTER TABLE public.quiz_answers ADD COLUMN score integer NOT NULL DEFAULT 0;

-- Add topic column to quizzes for more specific categorization
ALTER TABLE public.quizzes ADD COLUMN topic text DEFAULT '';
