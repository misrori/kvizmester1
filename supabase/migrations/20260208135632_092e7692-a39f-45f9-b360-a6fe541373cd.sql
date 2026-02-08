
-- Create profiles table for teachers
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create quizzes table (questions stored as JSONB)
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  subject TEXT DEFAULT 'matematika',
  grade_level TEXT DEFAULT '',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own quizzes" ON public.quizzes FOR SELECT TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can insert own quizzes" ON public.quizzes FOR INSERT TO authenticated WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can update own quizzes" ON public.quizzes FOR UPDATE TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete own quizzes" ON public.quizzes FOR DELETE TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Anyone can view published quizzes" ON public.quizzes FOR SELECT USING (is_published = true);

-- Create rooms table (6-digit code, status, settings)
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting',
  class_name TEXT DEFAULT '',
  grade TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  control_mode TEXT NOT NULL DEFAULT 'auto',
  time_limit_seconds INTEGER DEFAULT 15,
  show_results_to_students BOOLEAN NOT NULL DEFAULT true,
  current_question_index INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own rooms" ON public.rooms FOR SELECT TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can insert own rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can update own rooms" ON public.rooms FOR UPDATE TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete own rooms" ON public.rooms FOR DELETE TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Anyone can view active rooms" ON public.rooms FOR SELECT USING (status IN ('waiting', 'active'));

-- Create room_participants table (anonymous students)
CREATE TABLE public.room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_session_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(room_id, student_session_id)
);

ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join rooms" ON public.room_participants FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND status IN ('waiting', 'active'))
);
CREATE POLICY "Anyone can view participants" ON public.room_participants FOR SELECT USING (true);
CREATE POLICY "Anyone can update participant status" ON public.room_participants FOR UPDATE USING (true);
CREATE POLICY "Teachers can delete participants" ON public.room_participants FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND teacher_id = auth.uid())
);

-- Create quiz_answers table (per question per student)
CREATE TABLE public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.room_participants(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  answer JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_correct BOOLEAN,
  time_taken_ms INTEGER,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(participant_id, question_index)
);

ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit answers" ON public.quiz_answers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND status = 'active')
);
CREATE POLICY "Anyone can view answers" ON public.quiz_answers FOR SELECT USING (true);
CREATE POLICY "Teachers can delete answers" ON public.quiz_answers FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND teacher_id = auth.uid())
);

-- Enable realtime for live quiz experience
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_answers;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generate unique 6-digit room code
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.rooms WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SET search_path = public;
