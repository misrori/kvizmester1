import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Play } from 'lucide-react';
import type { Quiz } from '@/types/quiz';
import { generateRoomCode } from '@/types/quiz';

const CreateRoom = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [className, setClassName] = useState('');
  const [grade, setGrade] = useState('');
  const [notes, setNotes] = useState('');
  const [controlMode, setControlMode] = useState<'auto' | 'manual'>('auto');
  const [timeLimit, setTimeLimit] = useState(15);
  const [showResults, setShowResults] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchQuizzes = async () => {
      const { data } = await supabase
        .from('quizzes')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      if (data) {
        setQuizzes(data.map((q: any) => ({ ...q, questions: q.questions as any })));
      }
      setLoading(false);
    };
    fetchQuizzes();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !selectedQuizId) {
      toast.error('Válassz ki egy kvízt!');
      return;
    }

    setCreating(true);

    // Generate a unique 6-digit code (retry on collision)
    let code = generateRoomCode();
    let retries = 0;

    while (retries < 5) {
      const { error } = await supabase.from('rooms').insert({
        teacher_id: user.id,
        quiz_id: selectedQuizId,
        code,
        class_name: className,
        grade,
        notes,
        control_mode: controlMode,
        time_limit_seconds: timeLimit,
        show_results_to_students: showResults,
        status: 'waiting',
        current_question_index: 0,
      });

      if (!error) {
        toast.success(`Szoba létrehozva! Kód: ${code}`);
        // Find the room ID
        const { data: room } = await supabase
          .from('rooms')
          .select('id')
          .eq('code', code)
          .single();
        if (room) {
          navigate(`/room/${room.id}`);
        }
        setCreating(false);
        return;
      }

      if (error.code === '23505') {
        // Unique constraint violation, retry with new code
        code = generateRoomCode();
        retries++;
      } else {
        toast.error('Hiba a szoba létrehozásakor: ' + error.message);
        setCreating(false);
        return;
      }
    }

    toast.error('Nem sikerült egyedi kódot generálni. Próbáld újra.');
    setCreating(false);
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
          <h1 className="font-display text-2xl font-bold">Szoba létrehozása</h1>
        </div>

        <div className="mx-auto max-w-xl space-y-6">
          {/* Select Quiz */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kvíz kiválasztása</CardTitle>
            </CardHeader>
            <CardContent>
              {quizzes.length === 0 ? (
                <p className="text-muted-foreground">
                  Nincs kvízed. <a href="/quiz/new" className="text-primary underline">Hozz létre egyet!</a>
                </p>
              ) : (
                <RadioGroup value={selectedQuizId} onValueChange={setSelectedQuizId}>
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} className="flex items-center space-x-3 rounded-lg border p-3">
                      <RadioGroupItem value={quiz.id} id={quiz.id} />
                      <label htmlFor={quiz.id} className="flex-1 cursor-pointer">
                        <div className="font-medium">{quiz.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {quiz.questions.length} kérdés · {quiz.subject}
                        </div>
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </CardContent>
          </Card>

          {/* Room Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Szoba beállítások</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Osztály neve</Label>
                  <Input
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="pl. 5.A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Évfolyam</Label>
                  <Input
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="pl. 5. osztály"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Megjegyzés</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Opcionális megjegyzés..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quiz Control */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vezérlés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Kérdésvezérlés módja</Label>
                <RadioGroup value={controlMode} onValueChange={(v) => setControlMode(v as 'auto' | 'manual')}>
                  <div className="flex items-center space-x-3 rounded-lg border p-3">
                    <RadioGroupItem value="auto" id="auto" />
                    <label htmlFor="auto" className="cursor-pointer">
                      <div className="font-medium">Automatikus</div>
                      <div className="text-sm text-muted-foreground">Diákok saját tempóban haladnak</div>
                    </label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-lg border p-3">
                    <RadioGroupItem value="manual" id="manual" />
                    <label htmlFor="manual" className="cursor-pointer">
                      <div className="font-medium">Manuális</div>
                      <div className="text-sm text-muted-foreground">Tanár vezérli a kérdésváltást</div>
                    </label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Időlimit kérdésenként (mp)</Label>
                <Input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value) || 15)}
                  min={5}
                  max={120}
                  className="w-32"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={showResults} onCheckedChange={setShowResults} />
                <Label>Eredmények megjelenítése diákoknak</Label>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" onClick={handleCreate} disabled={creating || !selectedQuizId}>
            <Play className="mr-2 h-5 w-5" />
            {creating ? 'Létrehozás...' : 'Szoba létrehozása'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateRoom;
