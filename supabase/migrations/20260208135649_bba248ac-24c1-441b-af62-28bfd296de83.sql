
-- Fix overly permissive UPDATE policy on room_participants
DROP POLICY IF EXISTS "Anyone can update participant status" ON public.room_participants;

-- Only teachers can update participants in their own rooms
CREATE POLICY "Teachers can update participants" ON public.room_participants 
FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND teacher_id = auth.uid()));
