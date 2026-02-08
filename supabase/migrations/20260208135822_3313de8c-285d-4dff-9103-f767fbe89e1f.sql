
-- Allow students to view quizzes that are used in active/waiting rooms
CREATE POLICY "Anyone can view quizzes in active rooms" ON public.quizzes 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.rooms WHERE quiz_id = quizzes.id AND status IN ('waiting', 'active'))
);
