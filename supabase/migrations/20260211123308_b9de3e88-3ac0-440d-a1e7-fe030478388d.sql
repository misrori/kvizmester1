
-- Add session_number to rooms to track restart cycles
ALTER TABLE public.rooms ADD COLUMN session_number integer NOT NULL DEFAULT 1;

-- Add session_number to quiz_answers to link answers to specific sessions
ALTER TABLE public.quiz_answers ADD COLUMN session_number integer NOT NULL DEFAULT 1;

-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public) VALUES ('question-images', 'question-images', true);

-- Allow anyone to view question images (public bucket)
CREATE POLICY "Question images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

-- Allow authenticated users to upload question images
CREATE POLICY "Teachers can upload question images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'question-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their own images
CREATE POLICY "Teachers can delete question images"
ON storage.objects FOR DELETE
USING (bucket_id = 'question-images' AND auth.role() = 'authenticated');
