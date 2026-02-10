import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { QuestionEditor } from '@/components/quiz/QuestionEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Save, ArrowLeft } from 'lucide-react';
import type { QuizQuestion } from '@/types/quiz';
import { createEmptyQuestion } from '@/types/quiz';

const QuizEditor = () => {
  const { id } = useParams();
  const isEditing = id && id !== 'new';
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('matematika');
  const [topic, setTopic] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([createEmptyQuestion()]);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!isEditing);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isEditing || !user) return;

    const fetchQuiz = async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        toast.error('Kvíz nem található');
        navigate('/dashboard');
        return;
      }

      setTitle(data.title);
      setDescription(data.description || '');
      setSubject(data.subject || 'matematika');
      setTopic((data as any).topic || '');
      setGradeLevel(data.grade_level || '');
      setQuestions((data.questions as unknown as QuizQuestion[]) || []);
      setIsPublished(data.is_published);
      setLoading(false);
    };

    fetchQuiz();
  }, [id, isEditing, user, navigate]);

  const handleSave = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast.error('Add meg a kvíz címét!');
      return;
    }
    if (questions.length === 0) {
      toast.error('Adj hozzá legalább egy kérdést!');
      return;
    }

    setSaving(true);

    const quizData = {
      teacher_id: user.id,
      title: title.trim(),
      description: description.trim(),
      subject,
      topic: topic.trim(),
      grade_level: gradeLevel,
      questions: JSON.parse(JSON.stringify(questions)),
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : null,
    };

    let error;
    if (isEditing) {
      ({ error } = await supabase.from('quizzes').update(quizData).eq('id', id!));
    } else {
      ({ error } = await supabase.from('quizzes').insert(quizData));
    }

    setSaving(false);

    if (error) {
      toast.error('Hiba a mentéskor: ' + error.message);
    } else {
      toast.success('Kvíz mentve!');
      navigate('/dashboard');
    }
  };

  const updateQuestion = (index: number, question: QuizQuestion) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? question : q)));
  };

  const deleteQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Betöltés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Vissza
          </Button>
          <h1 className="font-display text-2xl font-bold">
            {isEditing ? 'Kvíz szerkesztése' : 'Új kvíz létrehozása'}
          </h1>
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          {/* Quiz metadata */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Kvíz címe</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="pl. Alapvető összeadás"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Leírás</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Rövid leírás a kvízről..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Tantárgy</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option value="matematika">Matematika</option>
                  <option value="magyar">Magyar nyelv</option>
                  <option value="természettudomány">Természettudomány</option>
                  <option value="történelem">Történelem</option>
                  <option value="földrajz">Földrajz</option>
                  <option value="informatika">Informatika</option>
                  <option value="angol">Angol nyelv</option>
                  <option value="egyéb">Egyéb</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Témakör</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="pl. Törtek, Összeadás..."
                />
              </div>
              <div className="space-y-2">
                <Label>Évfolyam</Label>
                <Input
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  placeholder="pl. 5. osztály"
                />
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                <Label>Publikus (más tanárok is láthatják)</Label>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">Kérdések</h2>
            {questions.map((question, index) => (
              <QuestionEditor
                key={question.id}
                question={question}
                index={index}
                onChange={(q) => updateQuestion(index, q)}
                onDelete={() => deleteQuestion(index)}
              />
            ))}
            <Button variant="outline" className="w-full" onClick={addQuestion}>
              <Plus className="mr-2 h-4 w-4" />
              Kérdés hozzáadása
            </Button>
          </div>

          {/* Save */}
          <div className="flex justify-end gap-3 pb-10">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Mégse
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Mentés...' : 'Kvíz mentése'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizEditor;
