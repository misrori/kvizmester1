import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Download, Trophy, CheckCircle2, History } from 'lucide-react';
import type { Room, Quiz, QuizQuestion, RoomParticipant, QuizAnswer } from '@/types/quiz';

const Results = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [allParticipants, setAllParticipants] = useState<RoomParticipant[]>([]);
  const [allAnswers, setAllAnswers] = useState<QuizAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const fetchData = async () => {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (!roomData) { navigate('/'); return; }

      const rm = roomData as unknown as Room;
      setRoom(rm);
      setSelectedSession(rm.session_number);

      const [quizRes, partRes, ansRes] = await Promise.all([
        supabase.from('quizzes').select('*').eq('id', roomData.quiz_id).single(),
        supabase.from('room_participants').select('*').eq('room_id', roomId).order('joined_at'),
        supabase.from('quiz_answers').select('*').eq('room_id', roomId).order('answered_at'),
      ]);

      if (quizRes.data) setQuiz({ ...quizRes.data, questions: quizRes.data.questions as unknown as QuizQuestion[] } as Quiz);
      if (partRes.data) setAllParticipants(partRes.data as unknown as RoomParticipant[]);
      if (ansRes.data) setAllAnswers(ansRes.data as unknown as QuizAnswer[]);
      setLoading(false);
    };

    fetchData();
  }, [roomId, navigate]);

  // Get unique session numbers
  const sessions = Array.from(new Set(allAnswers.map((a) => (a as any).session_number || 1))).sort((a, b) => b - a);

  const getStudentResults = (sessionNum: number) => {
    const sessionAnswers = allAnswers.filter((a) => ((a as any).session_number || 1) === sessionNum);
    const participantIds = new Set(sessionAnswers.map((a) => a.participant_id));
    const sessionParticipants = allParticipants.filter((p) => participantIds.has(p.id));

    return sessionParticipants.map((p) => {
      const studentAnswers = sessionAnswers.filter((a) => a.participant_id === p.id);
      const correct = studentAnswers.filter((a) => a.is_correct).length;
      const total = quiz?.questions.length || 0;
      const totalScore = studentAnswers.reduce((sum, a) => sum + ((a as any).score || 0), 0);
      const avgTime = studentAnswers.length > 0
        ? Math.round(studentAnswers.reduce((sum, a) => sum + (a.time_taken_ms || 0), 0) / studentAnswers.length / 1000 * 10) / 10
        : 0;
      return {
        ...p,
        correct,
        total,
        totalScore,
        percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
        avgTime,
        answered: studentAnswers.length,
      };
    }).sort((a, b) => b.totalScore - a.totalScore || a.avgTime - b.avgTime);
  };

  const exportCSV = (sessionNum: number) => {
    const results = getStudentResults(sessionNum);
    const sessionAnswers = allAnswers.filter((a) => ((a as any).session_number || 1) === sessionNum);

    // Detailed per-question export
    const headers = ['Név', 'Kérdés #', 'Kérdés', 'Válasz', 'Helyes?', 'Pontszám', 'Idő (ms)', 'Időpont'];
    const rows = sessionAnswers.map((ans) => {
      const participant = allParticipants.find((p) => p.id === ans.participant_id);
      const question = quiz?.questions[ans.question_index];
      const answerText = (ans.answer as any)?.text || question?.options.find((o: any) => o.id === (ans.answer as any)?.selectedOptionId)?.text || '';
      return [
        participant?.student_name || '',
        ans.question_index + 1,
        question?.text || '',
        answerText,
        ans.is_correct ? 'Igen' : 'Nem',
        (ans as any).score || 0,
        ans.time_taken_ms || '',
        ans.answered_at,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eredmenyek-${room?.code}-session${sessionNum}.csv`;
    a.click();
  };

  const isTeacher = user && room && user.id === room.teacher_id;
  const currentSessionResults = selectedSession ? getStudentResults(selectedSession) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Betöltés...</p>
        </div>
      </div>
    );
  }

  if (!room || !quiz) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(isTeacher ? '/dashboard' : '/')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Vissza
          </Button>
          <h1 className="font-display text-2xl font-bold">Eredmények</h1>
        </div>

        {/* Summary */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="py-6 text-center">
              <div className="font-display text-3xl font-bold text-primary">{quiz.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">Kvíz neve</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center">
              <div className="font-display text-3xl font-bold text-foreground">{currentSessionResults.length}</div>
              <p className="mt-1 text-sm text-muted-foreground">Résztvevő</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center">
              <div className="font-display text-3xl font-bold text-foreground">{quiz.questions.length}</div>
              <p className="mt-1 text-sm text-muted-foreground">Kérdés</p>
            </CardContent>
          </Card>
        </div>

        {/* Session selector */}
        {sessions.length > 1 && (
          <div className="mb-6">
            <Tabs value={String(selectedSession)} onValueChange={(v) => setSelectedSession(Number(v))}>
              <TabsList>
                {sessions.map((s) => (
                  <TabsTrigger key={s} value={String(s)} className="flex items-center gap-1">
                    <History className="h-3 w-3" />
                    {s}. menet
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Top 3 Podium */}
        {currentSessionResults.length >= 3 && (
          <div className="mb-8 flex items-end justify-center gap-4">
            {[currentSessionResults[1], currentSessionResults[0], currentSessionResults[2]].map((student, i) => {
              const heights = ['h-24', 'h-32', 'h-20'];
              const positions = ['2.', '1.', '3.'];
              const colors = ['bg-secondary', 'bg-accent', 'bg-primary'];
              return (
                <div key={student.id} className="flex flex-col items-center">
                  <span className="mb-2 font-display text-sm font-bold">{student.student_name}</span>
                  <span className="mb-1 text-xs text-muted-foreground">{student.totalScore} pont</span>
                  <div className={`flex w-20 items-end justify-center rounded-t-lg ${heights[i]} ${colors[i]} text-primary-foreground`}>
                    <div className="pb-2 text-center">
                      {i === 1 && <Trophy className="mx-auto mb-1 h-5 w-5" />}
                      <span className="font-display text-lg font-bold">{positions[i]}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Results Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Részletes eredmények</CardTitle>
            {isTeacher && selectedSession && (
              <Button variant="outline" size="sm" onClick={() => exportCSV(selectedSession)}>
                <Download className="mr-2 h-4 w-4" />
                CSV letöltés
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Név</TableHead>
                  <TableHead className="text-center">Helyes</TableHead>
                  <TableHead className="text-center">Pontszám</TableHead>
                  <TableHead className="text-center">Százalék</TableHead>
                  <TableHead className="text-center">Átlag idő</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentSessionResults.map((student, i) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-bold">{i + 1}.</TableCell>
                    <TableCell className="font-medium">{student.student_name}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-quiz-green" />
                        {student.correct}/{student.total}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 font-bold text-primary">
                        <Trophy className="h-4 w-4" />
                        {student.totalScore}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={student.percentage >= 70 ? 'default' : student.percentage >= 40 ? 'secondary' : 'destructive'}>
                        {student.percentage}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{student.avgTime}s</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Results;
