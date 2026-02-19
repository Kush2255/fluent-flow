import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, CheckCircle, ChevronRight, ArrowLeft, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MicButton from "@/components/MicButton";
import TranscriptPanel from "@/components/TranscriptPanel";
import SpeakingFeedback from "@/components/SpeakingFeedback";
import RoleSelector from "@/components/RoleSelector";
import AudioWaveform from "@/components/AudioWaveform";
import MicrophoneSelector from "@/components/MicrophoneSelector";
import SessionComplete from "@/components/SessionComplete";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import useSpeechAnalysis from "@/hooks/useSpeechAnalysis";
import { useAudioDevices } from "@/hooks/useAudioDevices";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { InterviewQuestion, InterviewFeedback, INTERVIEW_CATEGORIES } from "@/types/fluent-flow";

// Expanded role-based question banks with difficulty levels
const ROLE_QUESTIONS: Record<string, InterviewQuestion[]> = {
  software_engineer: [
    // Easy
    { id: "se1", question: "What is Object-Oriented Programming and its key principles?", category: "technical", difficulty: "easy" },
    { id: "se2", question: "Explain the difference between a stack and a queue.", category: "technical", difficulty: "easy" },
    { id: "se11", question: "What is CI/CD and why is it important?", category: "technical", difficulty: "easy" },
    { id: "se7", question: "Tell me about yourself.", category: "hr", difficulty: "easy" },
    { id: "se13", question: "What is version control and why do we use Git?", category: "technical", difficulty: "easy" },
    { id: "se14", question: "What is the difference between an array and a linked list?", category: "technical", difficulty: "easy" },
    { id: "se15", question: "What are your greatest strengths as a developer?", category: "hr", difficulty: "easy" },
    // Medium
    { id: "se3", question: "What is the time complexity of binary search?", category: "technical", difficulty: "medium" },
    { id: "se5", question: "What is the difference between REST and GraphQL?", category: "technical", difficulty: "medium" },
    { id: "se6", question: "Explain what a closure is in JavaScript.", category: "technical", difficulty: "medium" },
    { id: "se8", question: "Describe a challenging bug you debugged.", category: "behavioral", difficulty: "medium" },
    { id: "se9", question: "How do you handle disagreements in code reviews?", category: "behavioral", difficulty: "medium" },
    { id: "se10", question: "What are SOLID principles?", category: "technical", difficulty: "medium" },
    { id: "se16", question: "Explain the event loop in JavaScript.", category: "technical", difficulty: "medium" },
    { id: "se17", question: "What is database normalization?", category: "technical", difficulty: "medium" },
    { id: "se18", question: "Tell me about a time you mentored a junior developer.", category: "behavioral", difficulty: "medium" },
    { id: "se19", question: "How do you approach testing in your projects?", category: "technical", difficulty: "medium" },
    // Hard
    { id: "se4", question: "How would you design a URL shortening service?", category: "technical", difficulty: "hard" },
    { id: "se12", question: "How would you optimize a slow database query?", category: "technical", difficulty: "hard" },
    { id: "se20", question: "Design a real-time chat system that scales to millions of users.", category: "technical", difficulty: "hard" },
    { id: "se21", question: "How would you handle a production outage affecting all users?", category: "situational", difficulty: "hard" },
    { id: "se22", question: "Explain CAP theorem and its practical implications.", category: "technical", difficulty: "hard" },
    { id: "se23", question: "How would you migrate a monolith to microservices?", category: "technical", difficulty: "hard" },
  ],
  data_analyst: [
    // Easy
    { id: "da1", question: "What is the difference between SQL JOIN types?", category: "technical", difficulty: "easy" },
    { id: "da4", question: "What visualization would you use to show trends over time?", category: "technical", difficulty: "easy" },
    { id: "da5", question: "What is the difference between correlation and causation?", category: "technical", difficulty: "easy" },
    { id: "da9", question: "Tell me about yourself.", category: "hr", difficulty: "easy" },
    { id: "da11", question: "What is the difference between mean, median, and mode?", category: "technical", difficulty: "easy" },
    { id: "da12", question: "What tools do you use for data analysis?", category: "hr", difficulty: "easy" },
    // Medium
    { id: "da2", question: "How would you handle missing data in a dataset?", category: "technical", difficulty: "medium" },
    { id: "da3", question: "Explain A/B testing and when you'd use it.", category: "technical", difficulty: "medium" },
    { id: "da6", question: "How would you present insights to non-technical stakeholders?", category: "behavioral", difficulty: "medium" },
    { id: "da7", question: "Describe a data analysis project you're proud of.", category: "behavioral", difficulty: "medium" },
    { id: "da8", question: "What is a p-value?", category: "technical", difficulty: "medium" },
    { id: "da10", question: "How do you ensure data quality?", category: "technical", difficulty: "medium" },
    { id: "da13", question: "Explain the difference between supervised and unsupervised learning.", category: "technical", difficulty: "medium" },
    { id: "da14", question: "How do you handle outliers in your data?", category: "technical", difficulty: "medium" },
    // Hard
    { id: "da15", question: "Design a recommendation engine for an e-commerce platform.", category: "technical", difficulty: "hard" },
    { id: "da16", question: "How would you detect fraud in financial transaction data?", category: "situational", difficulty: "hard" },
    { id: "da17", question: "Explain how you'd build a customer churn prediction model.", category: "technical", difficulty: "hard" },
    { id: "da18", question: "How would you optimize a data pipeline processing billions of rows?", category: "technical", difficulty: "hard" },
  ],
  product_manager: [
    // Easy
    { id: "pm2", question: "Tell me about a product you admire and why.", category: "behavioral", difficulty: "easy" },
    { id: "pm8", question: "What's the difference between a user story and a requirement?", category: "technical", difficulty: "easy" },
    { id: "pm9", question: "Tell me about yourself.", category: "hr", difficulty: "easy" },
    { id: "pm10", question: "How do you gather user feedback?", category: "technical", difficulty: "easy" },
    { id: "pm11", question: "What is an MVP and why is it important?", category: "technical", difficulty: "easy" },
    // Medium
    { id: "pm1", question: "How do you prioritize features?", category: "technical", difficulty: "medium" },
    { id: "pm3", question: "How would you measure the success of a feature?", category: "technical", difficulty: "medium" },
    { id: "pm4", question: "Describe a time you had to say no to a stakeholder.", category: "behavioral", difficulty: "medium" },
    { id: "pm6", question: "What frameworks do you use for decision-making?", category: "technical", difficulty: "medium" },
    { id: "pm7", question: "How do you handle conflicting priorities between teams?", category: "situational", difficulty: "medium" },
    { id: "pm12", question: "How do you write a product requirements document?", category: "technical", difficulty: "medium" },
    { id: "pm13", question: "Tell me about a product launch that didn't go as planned.", category: "behavioral", difficulty: "medium" },
    // Hard
    { id: "pm5", question: "How would you improve our product?", category: "situational", difficulty: "hard" },
    { id: "pm14", question: "Design a strategy to enter a new market segment.", category: "situational", difficulty: "hard" },
    { id: "pm15", question: "How would you build a product from 0 to 1 with no existing users?", category: "situational", difficulty: "hard" },
    { id: "pm16", question: "How do you balance technical debt vs. new features?", category: "situational", difficulty: "hard" },
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
  const [showComplete, setShowComplete] = useState(false);
  const [completionScore, setCompletionScore] = useState(0);

  const [appSettings] = useLocalStorage("fluent-flow-settings", {
    voiceFeedback: false,
    speechSpeed: 1,
    voiceIndex: 0,
    difficulty: "medium",
  });

  const { devices, selectedDeviceId, setSelectedDeviceId, refreshDevices, micStatus, setMicActive, requestPermission } = useAudioDevices();

  const { speak, isSpeaking } = useTextToSpeech({
    rate: appSettings.speechSpeed,
    voiceIndex: appSettings.voiceIndex,
    enabled: appSettings.voiceFeedback,
  });

  const {
    transcript, interimTranscript, isListening: isSpeechListening, isSupported,
    startListening, stopListening, resetTranscript,
  } = useSpeechRecognition({ continuous: true, interimResults: true });

  const { analysis, analyzeText, resetAnalysis } = useSpeechAnalysis();

  // Filter questions by category AND difficulty
  useEffect(() => {
    if (!selectedRole) return;
    const roleQuestions = ROLE_QUESTIONS[selectedRole] || GENERIC_QUESTIONS;
    let filtered = roleQuestions;

    // Filter by difficulty
    if (appSettings.difficulty && appSettings.difficulty !== "all") {
      const diffFiltered = roleQuestions.filter(q => q.difficulty === appSettings.difficulty);
      if (diffFiltered.length > 0) filtered = diffFiltered;
    }

    // Filter by category
    if (category !== "hr") {
      const catFiltered = filtered.filter(q => q.category === category);
      if (catFiltered.length > 0) filtered = catFiltered;
    }

    setQuestions(filtered.length > 0 ? filtered : roleQuestions);
    setCurrentQuestionIndex(0);
  }, [category, selectedRole, appSettings.difficulty]);

  useEffect(() => { if (transcript) analyzeText(transcript); }, [transcript, analyzeText]);
  useEffect(() => {
    setIsListening(isSpeechListening);
    setMicActive(isSpeechListening);
  }, [isSpeechListening, setMicActive]);

  const currentQuestion = questions[currentQuestionIndex];

  // Read question aloud when it changes (if TTS enabled)
  useEffect(() => {
    if (isStarted && currentQuestion && appSettings.voiceFeedback) {
      speak(currentQuestion.question);
    }
  }, [currentQuestionIndex, isStarted, currentQuestion?.id]);

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
        const constraints: MediaStreamConstraints = {
          audio: {
            deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        };
        await navigator.mediaDevices.getUserMedia(constraints);
        startListening();
      } catch (error) {
        console.error("Mic denied:", error);
        // Fallback to default
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          startListening();
        } catch (e2) {
          console.error("All mic access denied:", e2);
        }
      }
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
        // Read improved answer aloud
        if (appSettings.voiceFeedback && data.improvedAnswer) {
          setTimeout(() => speak(data.improvedAnswer), 500);
        }
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
    } else {
      // Last question — show completion
      const avg = feedback
        ? Math.round((feedback.grammarScore + feedback.fluencyScore + feedback.confidenceScore) / 3)
        : Math.round((analysis.grammarScore + analysis.fluencyScore + analysis.confidenceScore) / 3);
      setCompletionScore(avg);
      setShowComplete(true);
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

  if (!selectedRole) {
    return <RoleSelector onSelect={setSelectedRole} />;
  }

  return (
    <div className="space-y-6">
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
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Quick Mic Switch</label>
                <MicrophoneSelector
                  devices={devices}
                  selectedDeviceId={selectedDeviceId}
                  onSelect={setSelectedDeviceId}
                  onRefresh={refreshDevices}
                  micStatus={micStatus}
                  compact
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{questions.length} questions ({appSettings.difficulty})</p>
              <Button onClick={handleStart} className="gap-2"><Play className="w-4 h-4" />Start Interview</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interview Session */}
      {isStarted && currentQuestion && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs capitalize">{currentQuestion.difficulty}</span>
              <Button variant="ghost" size="sm" onClick={handleRestart}><RotateCcw className="w-4 h-4 mr-1" />Restart</Button>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-primary/10 border border-primary/30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-primary uppercase">{INTERVIEW_CATEGORIES[currentQuestion.category]}</p>
              {appSettings.voiceFeedback && (
                <Button variant="ghost" size="sm" className="h-6 px-2 gap-1" onClick={() => speak(currentQuestion.question)}>
                  <Volume2 className="w-3 h-3" /> Listen
                </Button>
              )}
            </div>
            <p className="text-lg font-medium text-foreground">{currentQuestion.question}</p>
          </div>

          {/* Waveform + Mic */}
          <div className="space-y-3">
            {isListening && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-primary font-medium">Microphone Active</span>
              </motion.div>
            )}
            {isListening && <AudioWaveform isActive={isListening} deviceId={selectedDeviceId} />}
            <div className="flex justify-center py-4">
              <MicButton isListening={isListening} isProcessing={isLoadingFeedback} onClick={handleMicClick} />
            </div>
          </div>

          <TranscriptPanel transcript={transcript} interimTranscript={interimTranscript} grammarMistakes={analysis.grammarMistakes} showHighlights={true} onClear={resetTranscript} />

          {transcript && !feedback && <SpeakingFeedback analysis={analysis} showDetails={false} />}

          {/* AI Feedback */}
          <AnimatePresence>
            {feedback && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold text-foreground">Answer Feedback</h4>
                    {appSettings.voiceFeedback && feedback.improvedAnswer && (
                      <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1" onClick={() => speak(feedback.improvedAnswer)}>
                        <Volume2 className="w-3 h-3" /> Read Aloud
                      </Button>
                    )}
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

                  <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Your Answer</p>
                    <p className="text-sm text-foreground">{feedback.userAnswer}</p>
                  </div>

                  {feedback.improvedAnswer && (
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs font-medium text-primary mb-1">Better Interview Version</p>
                      <p className="text-sm text-foreground">{feedback.improvedAnswer}</p>
                    </div>
                  )}

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

                <Button onClick={handleNextQuestion} className="w-full">
                  {currentQuestionIndex < questions.length - 1 ? (
                    <>Next Question <ChevronRight className="w-4 h-4 ml-2" /></>
                  ) : (
                    "Finish Interview 🎉"
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <SessionComplete
        show={showComplete}
        score={completionScore}
        onClose={() => {
          setShowComplete(false);
          handleRestart();
        }}
      />
    </div>
  );
};

export default InterviewMode;
