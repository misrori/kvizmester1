import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Play, Trash2, Edit, Copy, Users, Brain, Search, RefreshCw } from 'lucide-react';
import type { Quiz, Room } from '@/types/quiz';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [rooms, setRooms] = useState<(Room & { quiz_title?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [quizRes, roomRes] = await Promise.all([
        supabase.from('quizzes').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false }),
        supabase.from('rooms').select('*, quizzes(title)').eq('teacher_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (quizRes.data) {
        setQuizzes(quizRes.data.map((q: any) => ({ ...q, questions: q.questions as any })));
      }
      if (roomRes.data) {
        setRooms(roomRes.data.map((r: any) => ({
          ...r,
          quiz_title: r.quizzes?.title || 'Ismeretlen kvíz',
        })));
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const deleteQuiz = async (id: string) => {
    const { error } = await supabase.from('quizzes').delete().eq('id', id);
    if (error) {
      toast.error('Hiba a törléskor');
    } else {
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      toast.success('Kvíz törölve');
    }
  };

  const copyRoomCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Szobakód másolva: ' + code);
  };

  const restartRoom = async (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const newSession = ((room as any).session_number || 1) + 1;
    await supabase.from('room_participants').update({ is_active: false }).eq('room_id', roomId);
    await supabase.from('rooms').update({
      status: 'waiting',
      current_question_index: 0,
      started_at: null,
      ended_at: null,
      session_number: newSession,
    }).eq('id', roomId);
    setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, status: 'waiting' as const } : r));
    toast.success('Szoba újraindítva!');
  };

  const filteredQuizzes = quizzes.filter((q) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.title.toLowerCase().includes(query) ||
      (q.description || '').toLowerCase().includes(query) ||
      (q.subject || '').toLowerCase().includes(query) ||
      ((q as any).topic || '').toLowerCase().includes(query)
    );
  });

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
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Vezérlőpult</h1>
          <p className="text-muted-foreground">Kezeld a kvízeidet és szobáidat</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/quiz/new">
              <Plus className="mr-2 h-4 w-4" />
              Új kvíz
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/ai-generate">
              <Brain className="mr-2 h-4 w-4" />
              AI Generálás
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/room/new">
              <Play className="mr-2 h-4 w-4" />
              Szoba létrehozása
            </Link>
          </Button>
        </div>

        {/* My Quizzes */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-display text-xl font-bold text-foreground">Kvízeim</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kvíz keresése..."
                className="pl-9"
              />
            </div>
          </div>
          {filteredQuizzes.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">
                  {searchQuery ? 'Nincs találat.' : 'Még nincsenek kvízeid. Hozd létre az elsőt!'}
                </p>
                {!searchQuery && (
                  <Button className="mt-4" asChild>
                    <Link to="/quiz/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Kvíz létrehozása
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredQuizzes.map((quiz) => (
                <Card key={quiz.id} className="group transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{quiz.title}</CardTitle>
                        <CardDescription>{quiz.description || 'Nincs leírás'}</CardDescription>
                      </div>
                      <Badge variant={quiz.is_published ? 'default' : 'secondary'}>
                        {quiz.is_published ? 'Publikus' : 'Privát'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span>{quiz.questions.length} kérdés</span>
                      <span>·</span>
                      <span>{quiz.subject}</span>
                      {(quiz as any).topic && (
                        <>
                          <span>·</span>
                          <Badge variant="outline" className="text-xs">{(quiz as any).topic}</Badge>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/quiz/${quiz.id}/edit`}>
                          <Edit className="mr-1 h-3 w-3" />
                          Szerkesztés
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteQuiz(quiz.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* My Rooms */}
        <section>
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">Szobáim</h2>
          {rooms.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Még nincsenek szobáid.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <Card key={room.id} className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <span className="font-mono text-primary">{room.code}</span>
                          <button onClick={() => copyRoomCode(room.code)} className="text-muted-foreground hover:text-foreground">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </CardTitle>
                        <CardDescription>{room.quiz_title}</CardDescription>
                      </div>
                      <Badge
                        variant={room.status === 'active' ? 'default' : room.status === 'completed' ? 'secondary' : 'outline'}
                      >
                        {room.status === 'waiting' ? 'Várakozik' : room.status === 'active' ? 'Aktív' : 'Befejezett'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3 text-sm text-muted-foreground">
                      {room.class_name && <span>{room.class_name}</span>}
                      {room.grade && <span> · {room.grade}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/room/${room.id}`}>
                          <Users className="mr-1 h-3 w-3" />
                          Kezelés
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/results/${room.id}`}>Eredmények</Link>
                      </Button>
                      {room.status === 'completed' && (
                        <Button size="sm" variant="ghost" onClick={() => restartRoom(room.id)}>
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Újraindítás
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
