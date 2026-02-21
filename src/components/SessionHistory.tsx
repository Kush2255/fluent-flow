import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, ChevronDown, ChevronUp, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";

interface SessionRow {
  id: string;
  mode: string;
  transcript: string | null;
  grammar_score: number | null;
  fluency_score: number | null;
  confidence_score: number | null;
  pronunciation_score: number | null;
  speaking_speed: number | null;
  filler_word_count: number | null;
  duration_seconds: number | null;
  feedback: any;
  created_at: string;
  category: string | null;
  role: string | null;
}

const SessionHistory = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) setSessions(data);
      setLoading(false);
    };
    fetchSessions();
  }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("interview_sessions").delete().eq("id", id);
    if (!error) setSessions(prev => prev.filter(s => s.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <History className="w-12 h-12 text-muted-foreground mx-auto" />
        <h3 className="text-lg font-semibold text-foreground">No sessions yet</h3>
        <p className="text-sm text-muted-foreground">Complete a practice session to see your history here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Session History</h3>
        </div>
        <span className="text-xs text-muted-foreground">{sessions.length} sessions</span>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="overflow-hidden">
              <CardHeader
                className="cursor-pointer py-3 px-4"
                onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary capitalize font-medium">
                      {session.mode}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(session.created_at), "MMM d, yyyy h:mm a")}
                    </div>
                    {session.duration_seconds != null && session.duration_seconds > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(session.duration_seconds / 60)}m {session.duration_seconds % 60}s
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {session.grammar_score != null && session.grammar_score > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        G:{session.grammar_score}
                      </span>
                    )}
                    {session.fluency_score != null && session.fluency_score > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                        F:{session.fluency_score}
                      </span>
                    )}
                    {session.confidence_score != null && session.confidence_score > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                        C:{session.confidence_score}
                      </span>
                    )}
                    {expandedId === session.id ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>

              <AnimatePresence>
                {expandedId === session.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardContent className="pt-0 px-4 pb-4 space-y-3">
                      {session.transcript && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Transcript</span>
                          <p className="text-sm text-foreground mt-1 p-3 rounded-lg bg-secondary/50">
                            {session.transcript}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { label: "Grammar", value: session.grammar_score },
                          { label: "Fluency", value: session.fluency_score },
                          { label: "Confidence", value: session.confidence_score },
                          { label: "Pronunciation", value: session.pronunciation_score },
                        ].map(({ label, value }) => (
                          <div key={label} className="p-2 rounded-lg bg-secondary/50 text-center">
                            <span className="text-xs text-muted-foreground">{label}</span>
                            <p className="text-lg font-bold text-foreground">{value ?? "—"}</p>
                          </div>
                        ))}
                      </div>

                      {session.speaking_speed != null && session.speaking_speed > 0 && (
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Speed: {session.speaking_speed} WPM</span>
                          {session.filler_word_count != null && (
                            <span>Fillers: {session.filler_word_count}</span>
                          )}
                        </div>
                      )}

                      {session.feedback && typeof session.feedback === "object" && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">AI Feedback</span>
                          <div className="text-sm text-foreground mt-1 p-3 rounded-lg bg-secondary/50 space-y-2">
                            {(session.feedback as any).corrected_sentence && (
                              <p>
                                <span className="font-medium text-emerald-400">Corrected: </span>
                                {(session.feedback as any).corrected_sentence}
                              </p>
                            )}
                            {(session.feedback as any).pronunciation_tips?.length > 0 && (
                              <ul className="space-y-1">
                                {((session.feedback as any).pronunciation_tips as string[]).map((tip, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-sm">
                                    <span className="text-amber-400">•</span> {tip}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive gap-1.5"
                          onClick={() => handleDelete(session.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SessionHistory;
