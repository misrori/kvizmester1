import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, Square, SkipForward, Copy, Users, ArrowLeft, CheckCircle2, XCircle, Trophy, BarChart3, RefreshCw, Monitor } from 'lucide-react';
import type { Room, Quiz, QuizQuestion, RoomParticipant, QuizAnswer } from '@/types/quiz';

const RoomControl = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const fetchRoomData = useCallback(async () => {
    if (!id || !user) return;

    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (!roomData) {
      toast.error('Szoba nem található');
      navigate('/dashboard');
      return;
    }

    const rm = roomData as unknown as Room;
    setRoom(rm);

    const [quizRes, partRes, ansRes] = await Promise.all([
      supabase.from('quizzes').select('*').eq('id', roomData.quiz_id).single(),
      supabase.from('room_participants').select('*').eq('room_id', id).order('joined_at'),
      supabase.from('quiz_answers').select('*').eq('room_id', id).eq('session_number', rm.session_number),
    ]);

    if (quizRes.data) {
      setQuiz({ ...quizRes.data, questions: quizRes.data.questions as unknown as QuizQuestion[] } as Quiz);
    }
    if (partRes.data) setParticipants(partRes.data as unknown as RoomParticipant[]);
    if (ansRes.data) setAnswers(ansRes.data as unknown as QuizAnswer[]);
    setLoading(false);
  }, [id, user, navigate]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchRoomData();
  }, [fetchRoomData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`room-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${id}` }, () => {
        supabase.from('room_participants').select('*').eq('room_id', id).order('joined_at').then(({ data }) => {
          if (data) setParticipants(data as unknown as RoomParticipant[]);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_answers', filter: `room_id=eq.${id}` }, () => {
        // Re-fetch only current session answers
        if (room) {
          supabase.from('quiz_answers').select('*').eq('room_id', id).eq('session_number', room.session_number).then(({ data }) => {
            if (data) setAnswers(data as unknown as QuizAnswer[]);
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${id}` }, (payload) => {
        const newRoom = payload.new as unknown as Room;
        setRoom(newRoom);
        // Re-fetch answers for new session if session changed
        supabase.from('quiz_answers').select('*').eq('room_id', id).eq('session_number', newRoom.session_number).then(({ data }) => {
          if (data) setAnswers(data as unknown as QuizAnswer[]);
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, room?.session_number]);

  const startQuiz = async () => {
    if (!room) return;
    await supabase
      .from('rooms')
      .update({ status: 'active', started_at: new Date().toISOString(), current_question_index: 0 })
      .eq('id', room.id);
    setShowLeaderboard(false);
    toast.success('Kvíz elindítva!');
  };

  const nextQuestion = async () => {
    if (!room || !quiz) return;
    const nextIndex = room.current_question_index + 1;
    if (nextIndex >= quiz.questions.length) {
      await endQuiz();
      return;
    }
    await supabase
      .from('rooms')
      .update({ current_question_index: nextIndex })
      .eq('id', room.id);
    setShowLeaderboard(false);
  };

  const endQuiz = async () => {
    if (!room) return;
    await supabase
      .from('rooms')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', room.id);
    toast.success('Kvíz befejezve!');
  };

  const restartRoom = async () => {
    if (!room) return;
    const newSession = (room.session_number || 1) + 1;
    // Deactivate old participants instead of deleting
    await supabase.from('room_participants').update({ is_active: false }).eq('room_id', room.id);
    // Reset room state with incremented session number
    await supabase.from('rooms').update({
      status: 'waiting',
      current_question_index: 0,
      started_at: null,
      ended_at: null,
      session_number: newSession,
    }).eq('id', room.id);
    setAnswers([]);
    setParticipants([]);
    setShowLeaderboard(false);
    toast.success('Szoba újraindítva! A diákok újra csatlakozhatnak.');
  };

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    toast.success('Szobakód másolva: ' + room.code);
  };

  // Calculate leaderboard from current session only
  const getLeaderboard = () => {
    const activeParticipants = participants.filter((p) => p.is_active);
    return activeParticipants.map((p) => {
      const studentAnswers = answers.filter((a) => a.participant_id === p.id);
      const totalScore = studentAnswers.reduce((sum, a) => sum + ((a as any).score || 0), 0);
      const correctCount = studentAnswers.filter((a) => a.is_correct).length;
      return { ...p, totalScore, correctCount, answered: studentAnswers.length };
    }).sort((a, b) => b.totalScore - a.totalScore);
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

  if (!room || !quiz) return null;

  const currentQuestion: QuizQuestion | undefined = quiz.questions[room.current_question_index];
  const answersForCurrentQ = answers.filter((a) => a.question_index === room.current_question_index);
  const totalParticipants = participants.filter((p) => p.is_active).length;
  const leaderboard = getLeaderboard();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Vissza
          </Button>
        </div>

        {/* Room Info Bar */}
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="font-display text-3xl font-black tracking-widest text-primary">{room.code}</div>
            <button onClick={copyCode} className="text-muted-foreground hover:text-foreground">
              <Copy className="h-5 w-5" />
            </button>
          </div>
          <Badge variant={room.status === 'active' ? 'default' : room.status === 'completed' ? 'secondary' : 'outline'} className="text-sm">
            {room.status === 'waiting' ? 'Várakozik' : room.status === 'active' ? 'Aktív' : 'Befejezett'}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {totalParticipants} diák
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {/* Presenter View link */}
            <Button variant="outline" size="sm" asChild>
              <Link to={`/presenter/${room.id}`} target="_blank">
                <Monitor className="mr-1 h-4 w-4" />
                Kivetítés
              </Link>
            </Button>
            {room.status === 'waiting' && (
              <Button onClick={startQuiz} disabled={totalParticipants === 0}>
                <Play className="mr-2 h-4 w-4" />
                Kvíz indítása
              </Button>
            )}
            {room.status === 'active' && room.control_mode === 'manual' && (
              <>
                <Button variant="outline" onClick={() => setShowLeaderboard(!showLeaderboard)}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  {showLeaderboard ? 'Kérdés' : 'Ranglista'}
                </Button>
                <Button onClick={nextQuestion}>
                  <SkipForward className="mr-2 h-4 w-4" />
                  {room.current_question_index + 1 >= quiz.questions.length ? 'Befejezés' : 'Következő kérdés'}
                </Button>
              </>
            )}
            {room.status === 'active' && (
              <Button variant="destructive" onClick={endQuiz}>
                <Square className="mr-2 h-4 w-4" />
                Kvíz leállítása
              </Button>
            )}
            {room.status === 'completed' && (
              <>
                <Button variant="outline" onClick={restartRoom}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Újraindítás
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/results/${room.id}`}>Eredmények</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Current Question / Leaderboard */}
          <div className="lg:col-span-2">
            {room.status === 'waiting' && (
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="font-display text-6xl font-black tracking-widest text-primary">{room.code}</div>
                  <p className="mt-4 text-lg text-muted-foreground">
                    Várakozás a diákokra... Oszd meg a szobakódot!
                  </p>
                </CardContent>
              </Card>
            )}

            {room.status === 'active' && showLeaderboard && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="h-5 w-5 text-accent" />
                    Ranglista
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {leaderboard.map((student, i) => (
                      <div key={student.id} className={`flex items-center justify-between rounded-lg border p-3 ${i === 0 ? 'border-accent bg-accent/10' : i === 1 ? 'border-secondary bg-secondary/10' : i === 2 ? 'border-primary bg-primary/10' : ''}`}>
                        <div className="flex items-center gap-3">
                          <span className="font-display text-lg font-bold text-muted-foreground w-8">{i + 1}.</span>
                          <span className="font-medium">{student.student_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 text-quiz-green" />
                            {student.correctCount}
                          </div>
                          <div className="flex items-center gap-1 font-display font-bold text-primary">
                            <Trophy className="h-4 w-4" />
                            {student.totalScore}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {room.status === 'active' && !showLeaderboard && currentQuestion && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {room.current_question_index + 1}/{quiz.questions.length}. kérdés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-xl font-medium">{currentQuestion.text}</p>
                  {currentQuestion.imageUrl && (
                    <img src={currentQuestion.imageUrl} alt="Kérdés kép" className="mb-4 max-h-48 rounded-lg object-contain" />
                  )}
                  {currentQuestion.type === 'multiple-choice' && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {currentQuestion.options.map((opt, i) => {
                        const colors = ['bg-quiz-red', 'bg-quiz-blue', 'bg-quiz-yellow', 'bg-quiz-green'];
                        const answeredCount = answersForCurrentQ.filter(
                          (a) => (a.answer as any)?.selectedOptionId === opt.id
                        ).length;
                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center justify-between rounded-lg p-4 text-primary-foreground ${colors[i % 4]}`}
                          >
                            <span className="font-medium">{opt.text || `Válasz ${i + 1}`}</span>
                            <div className="flex items-center gap-2">
                              {opt.isCorrect && <CheckCircle2 className="h-5 w-5" />}
                              <Badge variant="secondary">{answeredCount}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-4 text-sm text-muted-foreground">
                    Válaszolt: {answersForCurrentQ.length}/{totalParticipants} diák
                  </div>
                </CardContent>
              </Card>
            )}

            {room.status === 'completed' && (
              <Card>
                <CardContent className="py-16 text-center">
                  <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-quiz-green" />
                  <h2 className="font-display text-2xl font-bold">Kvíz befejezve!</h2>
                  <p className="mt-2 text-muted-foreground">Tekintsd meg az eredményeket.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Participants with scores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Résztvevők ({totalParticipants})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participants.filter(p => p.is_active).length === 0 ? (
                <p className="text-sm text-muted-foreground">Még senki nem csatlakozott.</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border p-2.5">
                      <span className="font-medium">{p.student_name}</span>
                      {room.status !== 'waiting' && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-quiz-green" />
                            <span>{p.correctCount}</span>
                          </div>
                          <div className="flex items-center gap-1 font-bold text-primary">
                            <Trophy className="h-3.5 w-3.5" />
                            {p.totalScore}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RoomControl;
