import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, CheckCircle, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MicButton from "@/components/MicButton";
import TranscriptPanel from "@/components/TranscriptPanel";
import SpeakingFeedback from "@/components/SpeakingFeedback";
import RoleSelector from "@/components/RoleSelector";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import useSpeechAnalysis from "@/hooks/useSpeechAnalysis";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { InterviewQuestion, InterviewFeedback, INTERVIEW_CATEGORIES } from "@/types/fluent-flow";

// Role-based question banks
const ROLE_QUESTIONS: Record<string, InterviewQuestion[]> = {
  software_engineer: [
    { id: "se1", question: "What is Object-Oriented Programming and its key principles?", category: "technical", difficulty: "easy" },
    { id: "se2", question: "Explain the difference between a stack and a queue.", category: "technical", difficulty: "easy" },
    { id: "se3", question: "What is the time complexity of binary search?", category: "technical", difficulty: "medium" },
    { id: "se4", question: "How would you design a URL shortening service?", category: "technical", difficulty: "hard" },
    { id: "se5", question: "What is the difference between REST and GraphQL?", category: "technical", difficulty: "medium" },
    { id: "se6", question: "Explain what a closure is in JavaScript.", category: "technical", difficulty: "medium" },
    { id: "se7", question: "Tell me about yourself.", category: "hr", difficulty: "easy" },
    { id: "se8", question: "Describe a challenging bug you debugged.", category: "behavioral", difficulty: "medium" },
    { id: "se9", question: "How do you handle disagreements in code reviews?", category: "behavioral", difficulty: "medium" },
    { id: "se10", question: "What are SOLID principles?", category: "technical", difficulty: "medium" },
    { id: "se11", question: "What is CI/CD and why is it important?", category: "technical", difficulty: "easy" },
    { id: "se12", question: "How would you optimize a slow database query?", category: "technical", difficulty: "hard" },
  ],
  data_analyst: [
    { id: "da1", question: "What is the difference between SQL JOIN types?", category: "technical", difficulty: "easy" },
    { id: "da2", question: "How would you handle missing data in a dataset?", category: "technical", difficulty: "medium" },
    { id: "da3", question: "Explain A/B testing and when you'd use it.", category: "technical", difficulty: "medium" },
    { id: "da4", question: "What visualization would you use to show trends over time?", category: "technical", difficulty: "easy" },
    { id: "da5", question: "What is the difference between correlation and causation?", category: "technical", difficulty: "easy" },
    { id: "da6", question: "How would you present insights to non-technical stakeholders?", category: "behavioral", difficulty: "medium" },
    { id: "da7", question: "Describe a data analysis project you're proud of.", category: "behavioral", difficulty: "medium" },
    { id: "da8", question: "What is a p-value?", category: "technical", difficulty: "medium" },
    { id: "da9", question: "Tell me about yourself.", category: "hr", difficulty: "easy" },
    { id: "da10", question: "How do you ensure data quality?", category: "technical", difficulty: "medium" },
  ],
  product_manager: [
    { id: "pm1", question: "How do you prioritize features?", category: "technical", difficulty: "medium" },
    { id: "pm2", question: "Tell me about a product you admire and why.", category: "behavioral", difficulty: "easy" },
    { id: "pm3", question: "How would you measure the success of a feature?", category: "technical", difficulty: "medium" },
    { id: "pm4", question: "Describe a time you had to say no to a stakeholder.", category: "behavioral", difficulty: "medium" },
    { id: "pm5", question: "How would you improve our product?", category: "situational", difficulty: "hard" },
    { id: "pm6", question: "What frameworks do you use for decision-making?", category: "technical", difficulty: "medium" },
    { id: "pm7", question: "How do you handle conflicting priorities between teams?", category: "situational", difficulty: "medium" },
    { id: "pm8", question: "What's the difference between a user story and a requirement?", category: "technical", difficulty: "easy" },
    { id: "pm9", question: "Tell me about yourself.", category: "hr", difficulty: "easy" },
    { id: "pm10", question: "How do you gather user feedback?", category: "technical", difficulty: "easy" },
  ],
};

const GENERIC_QUESTIONS: InterviewQuestion[] = [
  { id: "g1", question: "Tell me about yourself.", category: "hr", difficulty: "easy" },
  { id: "g2", question: "What are your strengths and weaknesses?", category: "hr", difficulty: "easy" },
  { id: "g3", question: "Why do you want to work here?", category: "hr", difficulty: "medium" },
  { id: "g4", question: "Describe a challenging situation you faced.", category: "behavioral", difficulty: "medium" },
  { id: "g5", question: "Where do you see yourself in 5 years?", category: "hr", difficulty: "easy" },
];

const InterviewMode = () => {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [category, setCategory] = useState<keyof typeof INTERVIEW_CATEGORIES>("hr");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [isListening, setIsListening] = useState(false);

  const {
    transcript, interimTranscript, isListening: isSpeechListening, isSupported,
    startListening, stopListening, resetTranscript,
  } = useSpeechRecognition({ continuous: true, interimResults: true });

  const { analysis, analyzeText, resetAnalysis } = useSpeechAnalysis();

  useEffect(() => {
    if (!selectedRole) return;
    const roleQuestions = ROLE_QUESTIONS[selectedRole] || GENERIC_QUESTIONS;
    const filtered = category === "hr"
      ? roleQuestions
      : roleQuestions.filter(q => q.category === category);
    setQuestions(filtered.length > 0 ? filtered : roleQuestions);
    setCurrentQuestionIndex(0);
  }, [category, selectedRole]);

  useEffect(() => { if (transcript) analyzeText(transcript); }, [transcript, analyzeText]);
  useEffect(() => { setIsListening(isSpeechListening); }, [isSpeechListening]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleStart = () => {
    setIsStarted(true);
    setShowSettings(false);
    setFeedback(null);
    resetTranscript();
    resetAnalysis();
  };

  const handleMicClick = async () => {
    if (isListening) {
      stopListening();
      if (transcript.trim().length > 10) await generateFeedback();
    } else {
      setFeedback(null);
      resetTranscript();
      resetAnalysis();
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        startListening();
      } catch (error) { console.error("Mic denied:", error); }
    }
  };

  const saveSession = async () => {
    if (!user || !currentQuestion) return;
    try {
      await supabase.from("interview_sessions").insert({
        user_id: user.id,
        mode: "interview",
        category: currentQuestion.category,
        role: selectedRole,
        transcript,
        grammar_score: feedback?.grammarScore || analysis.grammarScore,
        fluency_score: feedback?.fluencyScore || analysis.fluencyScore,
        confidence_score: feedback?.confidenceScore || analysis.confidenceScore,
        pronunciation_score: analysis.pronunciationScore,
        speaking_speed: analysis.speakingSpeed,
        filler_word_count: analysis.fillerWords.reduce((s, f) => s + f.count, 0),
        feedback: feedback ? JSON.stringify(feedback) : null,
      });
    } catch (e) { console.error("Failed to save session:", e); }
  };

  const generateFeedback = async () => {
    if (!currentQuestion || !transcript.trim()) return;
    setIsLoadingFeedback(true);
    try {
      const { data, error } = await supabase.functions.invoke("interview-feedback", {
        body: { question: currentQuestion.question, answer: transcript, category: currentQuestion.category },
      });
      if (error) throw error;
      if (data) {
        setFeedback(data);
        await saveSession();
      }
    } catch (error) {
      console.error("Feedback error:", error);
      const fallback: InterviewFeedback = {
        question: currentQuestion.question, userAnswer: transcript,
        grammarScore: analysis.grammarScore, fluencyScore: analysis.fluencyScore,
        confidenceScore: analysis.confidenceScore, keyPointsCovered: [], missedPoints: [],
        improvedAnswer: "", tips: analysis.suggestions.length > 0 ? analysis.suggestions : ["Running in fallback mode. Feedback is simplified."],
      };
      setFeedback(fallback);
      await saveSession();
    } finally { setIsLoadingFeedback(false); }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setFeedback(null);
      resetTranscript();
      resetAnalysis();
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setFeedback(null);
    resetTranscript();
    resetAnalysis();
    setShowSettings(true);
    setIsStarted(false);
  };

  if (!isSupported) {
    return <div className="text-center p-8"><p className="text-destructive">Speech recognition not supported.</p></div>;
  }

  // Role selection step
  if (!selectedRole) {
    return <RoleSelector onSelect={setSelectedRole} />;
  }

  return (
    <div className="space-y-6">
      {/* Back to role select */}
      {!isStarted && (
        <Button variant="ghost" size="sm" onClick={() => setSelectedRole(null)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Change Role
        </Button>
      )}

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="p-6 rounded-xl bg-card border border-border space-y-4">
            <h3 className="text-lg font-semibold text-foreground capitalize">{selectedRole?.replace("_", " ")} Interview</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Filter Category</label>
                <Select value={category} onValueChange={(v: keyof typeof INTERVIEW_CATEGORIES) => setCategory(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hr">All Questions</SelectItem>
                    {Object.entries(INTERVIEW_CATEGORIES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleStart} className="w-full"><Play className="w-4 h-4 mr-2" />Start Interview</Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{questions.length} questions available</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interview Session */}
      {isStarted && currentQuestion && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <Button variant="ghost" size="sm" onClick={handleRestart}><RotateCcw className="w-4 h-4 mr-1" />Restart</Button>
          </div>

          <div className="p-6 rounded-xl bg-primary/10 border border-primary/30">
            <p className="text-xs text-primary mb-2 uppercase">{INTERVIEW_CATEGORIES[currentQuestion.category]}</p>
            <p className="text-lg font-medium text-foreground">{currentQuestion.question}</p>
          </div>

          <div className="flex justify-center py-6">
            <MicButton isListening={isListening} isProcessing={isLoadingFeedback} onClick={handleMicClick} />
          </div>

          <TranscriptPanel transcript={transcript} interimTranscript={interimTranscript} grammarMistakes={analysis.grammarMistakes} showHighlights={true} onClear={resetTranscript} />

          {transcript && !feedback && <SpeakingFeedback analysis={analysis} showDetails={false} />}

          {/* AI Feedback with Sentence Correction */}
          <AnimatePresence>
            {feedback && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold text-foreground">Answer Feedback</h4>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { label: "Grammar", score: feedback.grammarScore },
                      { label: "Fluency", score: feedback.fluencyScore },
                      { label: "Confidence", score: feedback.confidenceScore },
                    ].map(s => (
                      <div key={s.label} className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-2xl font-bold text-foreground">{s.score}%</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Your Answer */}
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Your Answer</p>
                    <p className="text-sm text-foreground">{feedback.userAnswer}</p>
                  </div>

                  {/* Improved Answer */}
                  {feedback.improvedAnswer && (
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs font-medium text-primary mb-1">Better Interview Version</p>
                      <p className="text-sm text-foreground">{feedback.improvedAnswer}</p>
                    </div>
                  )}

                  {/* Key Points */}
                  {feedback.keyPointsCovered.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Key Points Covered</p>
                      <div className="flex flex-wrap gap-1">
                        {feedback.keyPointsCovered.map((p, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tips */}
                  {feedback.tips.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Why This Is Better</p>
                      <ul className="space-y-1">
                        {feedback.tips.map((tip, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">•</span>{tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {currentQuestionIndex < questions.length - 1 && (
                  <Button onClick={handleNextQuestion} className="w-full">
                    Next Question <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default InterviewMode;
