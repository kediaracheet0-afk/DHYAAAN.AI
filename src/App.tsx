import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Zap, 
  Shield, 
  X, 
  ArrowRight, 
  Sparkles,
  Clock,
  Layout,
  Lock,
  CloudRain,
  Trees,
  Wind,
  Waves,
  Volume2,
  VolumeX,
  MessageSquare,
  Send,
  Play,
  Pause,
  RotateCcw,
  User,
  Bot
} from 'lucide-react';
import { Task } from './types';
import { suggestToolsForTask, analyzeProductivity, chatWithGuruji } from './services/gemini';

const SOUNDSCAPES = [
  { id: 'rain', name: 'Monsoon Rain', icon: CloudRain, url: 'https://assets.mixkit.co/active_storage/sfx/2431/2431-preview.mp3' },
  { id: 'forest', name: 'Vedic Forest', icon: Trees, url: 'https://assets.mixkit.co/active_storage/sfx/123/123-preview.mp3' },
  { id: 'waves', name: 'Ganges Waves', icon: Waves, url: 'https://assets.mixkit.co/active_storage/sfx/1188/1188-preview.mp3' },
  { id: 'white-noise', name: 'Himalayan Wind', icon: Wind, url: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' },
];

const DISTRACTING_APPS = [
  { name: 'YouTube', icon: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png' },
  { name: 'Instagram', icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png' },
  { name: 'TikTok', icon: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png' },
  { name: 'Twitter', icon: 'https://cdn-icons-png.flaticon.com/512/733/733579.png' },
  { name: 'Netflix', icon: 'https://cdn-icons-png.flaticon.com/512/732/732228.png' },
];

const LotusIcon = ({ size = 24, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22s-8-4.5-8-11.5S7.5 3 12 3s8 4.5 8 7.5S12 22 12 22z" />
    <path d="M12 22s-4-4.5-4-11.5S10 3 12 3" />
    <path d="M12 22s4-4.5 4-11.5S14 3 12 3" />
    <path d="M4 10.5c0 3.5 4 7.5 8 11.5 4-4 8-8 8-11.5" />
    <circle cx="12" cy="10" r="1" />
  </svg>
);

interface Message {
  role: 'user' | 'guruji';
  text: string;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [stats, setStats] = useState({ totalKarma: 0, totalFocusTime: 0 });
  
  // Soundscape state
  const [activeSoundscape, setActiveSoundscape] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pomodoro state
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { role: 'guruji', text: 'Namaste, Vatsa. I am Focus Guruji. How can I guide your Dhyaan (focus) today?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Particles for focus mode
  const particles = useMemo(() => Array.from({ length: 30 }), []);

  // Focus Session state
  const sessionStartRef = useRef<number | null>(null);

  // Track Focus Sessions
  useEffect(() => {
    if (isFocusMode && activeTaskId) {
      sessionStartRef.current = Date.now();
    } else if (!isFocusMode && sessionStartRef.current && activeTaskId) {
      const endTime = Date.now();
      const startTime = sessionStartRef.current;
      const duration = Math.floor((endTime - startTime) / 1000);
      
      if (duration > 10) { // Only record sessions longer than 10 seconds
        fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            taskId: activeTaskId,
            startTime,
            endTime,
            duration
          }),
        }).then(() => updateStats())
        .catch(err => console.error("Failed to save session", err));
      }
      sessionStartRef.current = null;
    }
  }, [isFocusMode, activeTaskId]);

  // Persistence Fallback Helpers
  const saveToLocal = (key: string, data: any) => {
    localStorage.setItem(`dhyaan_${key}`, JSON.stringify(data));
  };

  const getFromLocal = (key: string, defaultValue: any) => {
    const saved = localStorage.getItem(`dhyaan_${key}`);
    return saved ? JSON.parse(saved) : defaultValue;
  };

  // Fetch tasks on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, statsRes] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/stats')
        ]);
        
        if (tasksRes.ok && statsRes.ok) {
          const tasksData = await tasksRes.json();
          const statsData = await statsRes.json();
          setTasks(tasksData);
          setStats(statsData);
          saveToLocal('tasks', tasksData);
          saveToLocal('stats', statsData);
        } else {
          throw new Error('Backend not available');
        }
      } catch (err) {
        console.log('Using local storage fallback');
        setTasks(getFromLocal('tasks', []));
        setStats(getFromLocal('stats', { total_sessions: 0, total_duration: 0 }));
      }
    };
    fetchData();
  }, []);

  const updateStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        saveToLocal('stats', data);
      }
    } catch (err) {
      console.log("Stats sync failed, using local");
    }
  };

  useEffect(() => {
    updateInsight();
    updateStats();
  }, [tasks]);

  // Pomodoro logic
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      const nextMode = mode === 'work' ? 'break' : 'work';
      setMode(nextMode);
      setTimeLeft(nextMode === 'work' ? 25 * 60 : 5 * 60);
      setIsActive(false);
      playSuccessSound();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Chat logic
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isTyping) return;

    const userMsg = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    const response = await chatWithGuruji(userMsg, tasks);
    setMessages(prev => [...prev, { role: 'guruji', text: response }]);
    setIsTyping(false);
  };

  // Handle ambient sound
  useEffect(() => {
    if (activeSoundscape) {
      const sound = SOUNDSCAPES.find(s => s.id === activeSoundscape);
      if (sound) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(sound.url);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.3;
        audioRef.current.play().catch(e => console.log("Audio play blocked"));
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [activeSoundscape]);

  useEffect(() => {
    if (!isFocusMode) {
      setActiveSoundscape(null);
    }
  }, [isFocusMode]);

  const updateInsight = async () => {
    if (tasks.length > 0 && !isLoadingInsight) {
      setIsLoadingInsight(true);
      const insight = await analyzeProductivity(tasks);
      setAiInsight(insight);
      setIsLoadingInsight(false);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      text: newTaskText,
      completed: false,
      createdAt: Date.now(),
    };

    setTasks(prev => [newTask, ...prev]);
    saveToLocal('tasks', [newTask, ...tasks]);
    setNewTaskText('');

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });

      const tools = await suggestToolsForTask(newTask.text);
      setTasks(prev => prev.map(t => t.id === newTask.id ? { ...t, suggestedTools: tools } : t));
      
      await fetch(`/api/tasks/${newTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestedTools: tools }),
      });
    } catch (err) {
      console.error("Failed to save task", err);
    }
  };

  const playSuccessSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
    audio.volume = 0.4;
    audio.play().catch(e => console.log("Audio play blocked by browser"));
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newCompleted = !task.completed;
    const updatedTasks = tasks.map(t => t.id === id ? { ...t, completed: newCompleted } : t);
    setTasks(updatedTasks);
    saveToLocal('tasks', updatedTasks);

    if (newCompleted) {
      playSuccessSound();
      createSparkles(id);
      
      // Update stats locally for immediate feedback on Netlify
      const newStats = { ...stats, total_sessions: stats.total_sessions + 1 };
      setStats(newStats);
      saveToLocal('stats', newStats);
    }

    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted }),
      });
    } catch (err) {
      console.log("Task update saved to local");
    }
  };

  const deleteTask = async (id: string) => {
    const updatedTasks = tasks.filter(t => t.id !== id);
    setTasks(updatedTasks);
    saveToLocal('tasks', updatedTasks);
    if (activeTaskId === id) setActiveTaskId(null);

    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.log("Task deletion saved to local");
    }
  };

  const createSparkles = (id: string) => {
    const el = document.getElementById(`task-${id}`);
    if (!el) return;
    
    const rect = el.getBoundingClientRect();
    for (let i = 0; i < 15; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'sparkle';
      sparkle.style.left = `${Math.random() * rect.width}px`;
      sparkle.style.top = `${Math.random() * rect.height}px`;
      el.appendChild(sparkle);
      setTimeout(() => sparkle.remove(), 800);
    }
  };

  const startFocus = (id: string) => {
    setActiveTaskId(id);
    setIsFocusMode(true);
    setIsActive(true); // Auto-start timer when entering focus mode
  };

  const activeTask = useMemo(() => 
    tasks.find(t => t.id === activeTaskId), 
    [tasks, activeTaskId]
  );

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Liquid Background */}
      <div className="liquid-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[100] bg-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-gradient-to-r from-[#FF9933] via-[#ffffff] to-[#138808] shadow-[0_0_15px_rgba(255,153,51,0.8)] animate-flow"
          transition={{ type: "spring", stiffness: 50, damping: 20 }}
        />
      </div>

      {/* Header */}
      <header className="p-8 flex justify-between items-center max-w-7xl mx-auto w-full relative z-10">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 180, scale: 1.1 }}
            className="w-14 h-14 glass-saffron flex items-center justify-center text-[#FF9933] rounded-2xl shadow-[0_0_20px_rgba(255,153,51,0.3)]"
          >
            <LotusIcon size={32} />
          </motion.div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-[#FF9933]">DHYAAN.AI</h1>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-black">ANCIENT WISDOM • MODERN FOCUS</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsChatting(true)}
            className="glass p-3 rounded-xl hover:bg-[#FF9933]/20 transition-all text-white/70 flex items-center gap-2"
          >
            <MessageSquare size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Seek Guidance</span>
          </button>
          <div className="hidden md:flex flex-col items-end gap-1 glass px-6 py-3 rounded-2xl border-[#138808]/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#138808]" />
              <span className="text-sm font-black text-white/90">{stats.totalKarma} Karma</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-[#FF9933]/60" />
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">
                {Math.floor(stats.totalFocusTime / 60)}m Focus
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-8 pb-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-8">
            {/* Spiritual Audio Selection (Moved from Focus Mode) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-8 rounded-[2.5rem] space-y-6 border-[#FF9933]/10"
            >
              <div className="flex items-center gap-3 text-[#FF9933]">
                <Volume2 size={18} />
                <h2 className="text-xs font-bold uppercase tracking-[0.2em]">Spiritual Audio</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SOUNDSCAPES.map(sound => (
                  <button
                    key={sound.id}
                    onClick={() => setActiveSoundscape(activeSoundscape === sound.id ? null : sound.id)}
                    className={`flex items-center gap-2 p-4 rounded-2xl border transition-all ${
                      activeSoundscape === sound.id 
                        ? 'bg-[#FF9933] text-white border-[#FF9933] shadow-lg shadow-[#FF9933]/20' 
                        : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <sound.icon size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{sound.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass p-8 rounded-[2.5rem] space-y-6 border-[#FF9933]/5"
            >
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF9933]/60">Sankalpa (Intention)</h2>
              <form onSubmit={addTask} className="space-y-4">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="What is your mission today?"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:ring-2 focus:ring-[#FF9933]/20 transition-all placeholder:text-white/20 outline-none font-serif text-lg"
                />
                <button 
                  type="submit"
                  className="w-full bg-[#FF9933] text-white rounded-2xl p-5 text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#e68a2e] transition-all active:scale-95 shadow-lg shadow-[#FF9933]/20"
                >
                  <Plus size={20} />
                  Add to Sadhana
                </button>
              </form>
            </motion.div>
          </div>

          {/* Right Column: Stream */}
          <div className="lg:col-span-8 space-y-6">
            {/* AI Insight Banner */}
            <AnimatePresence>
              {aiInsight && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  whileHover={{ scale: 1.02 }}
                  className="glass p-6 rounded-[2rem] border-[#FF9933]/20 flex items-start gap-4 shadow-[0_0_30px_rgba(255,153,51,0.1)]"
                >
                  <div className="p-3 bg-[#FF9933]/10 rounded-xl text-[#FF9933]">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF9933]/60 mb-1">Guruji's Wisdom</h4>
                    <p className="text-sm font-serif italic text-[#f5f2ed]/80 leading-relaxed">
                      "{aiInsight}"
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between px-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">Your Sadhana (Practice)</h2>
              <div className="flex items-center gap-4">
                <div className="glass px-4 py-2 rounded-full border-[#138808]/20">
                  <span className="text-[10px] font-black text-[#138808] uppercase tracking-widest">Purity: {Math.round(progress)}%</span>
                </div>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {tasks.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-32 glass rounded-[3rem] border-2 border-dashed border-white/5"
                >
                  <LotusIcon className="mx-auto text-[#FF9933]/10 mb-6" size={84} />
                  <p className="text-white/30 font-bold tracking-wide uppercase tracking-[0.3em]">Begin your journey</p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      id={`task-${task.id}`}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`group glass p-6 rounded-[2rem] flex items-center gap-6 transition-all hover:bg-white/15 relative overflow-hidden ${task.completed ? 'opacity-40 grayscale' : 'border-l-4 border-l-[#FF9933]/30'}`}
                    >
                      <button 
                        onClick={() => toggleTask(task.id)}
                        className="w-10 h-10 rounded-2xl border-2 border-white/10 flex items-center justify-center hover:border-[#138808] transition-colors"
                      >
                        {task.completed ? <CheckCircle2 size={24} className="text-[#138808]" /> : <div className="w-4 h-4 rounded-full bg-white/10" />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`text-xl font-serif font-bold tracking-tight ${task.completed ? 'line-through text-white/30' : 'text-[#f5f2ed]'}`}>
                          {task.text}
                        </p>
                        {task.suggestedTools && task.suggestedTools.length > 0 && (
                          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
                            {task.suggestedTools.map((tool, i) => (
                              <span key={i} className="text-[9px] font-black uppercase tracking-widest bg-[#FF9933]/5 text-[#FF9933]/60 px-3 py-1.5 rounded-lg border border-[#FF9933]/10">
                                {tool}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        {!task.completed && (
                          <button 
                            onClick={() => startFocus(task.id)}
                            className="bg-[#FF9933] text-white text-[10px] font-black uppercase tracking-widest px-6 py-4 rounded-xl hover:scale-105 transition-all shadow-lg shadow-[#FF9933]/20 hover:shadow-[#FF9933]/40 hover:bg-[#FF9933]/90 active:scale-95"
                          >
                            Enter Dhyaan
                          </button>
                        )}
                        <button 
                          onClick={() => deleteTask(task.id)}
                          className="p-4 glass rounded-xl text-white/30 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Focus Mode Overlay */}
      <AnimatePresence>
        {isFocusMode && activeTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-white overflow-hidden"
          >
            {/* Dynamic Animated Background */}
            <div className="absolute inset-0 bg-[#0f0d0a]">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF9933]/20 via-transparent to-[#138808]/20 animate-pulse" />
              </div>
              
              {/* Particles */}
              {particles.map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-[#FF9933]/40 rounded-full blur-[1px]"
                  initial={{ 
                    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
                    y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
                    opacity: 0 
                  }}
                  animate={{ 
                    y: [null, Math.random() * -800],
                    x: [null, (Math.random() - 0.5) * 200],
                    opacity: [0, 0.8, 0],
                    scale: [0, 2, 0],
                    rotate: [0, 360]
                  }}
                  transition={{ 
                    duration: Math.random() * 15 + 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: Math.random() * 10
                  }}
                />
              ))}

              <div className="blob blob-1 scale-150 opacity-10" />
              <div className="blob blob-2 scale-150 opacity-10" />
              <div className="blob blob-3 scale-150 opacity-10" />
            </div>

            <button 
              onClick={() => setIsFocusMode(false)}
              className="absolute top-12 right-12 p-4 glass rounded-full hover:bg-white/20 transition-all active:scale-90 z-10"
            >
              <X size={28} />
            </button>

            <div className="max-w-5xl w-full space-y-12 text-center relative z-10">
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="space-y-6"
              >
                <div className="inline-flex items-center gap-3 bg-[#FF9933]/20 text-[#FF9933] px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border border-[#FF9933]/20 backdrop-blur-md">
                  <Shield size={16} className="text-[#FF9933] animate-pulse" /> Distraction Shield Active
                </div>
                <h2 className="text-4xl md:text-6xl font-serif font-black tracking-tighter leading-none text-[#f5f2ed]/60">
                  {activeTask.text}
                </h2>
              </motion.div>

              {/* Timer in Focus Mode */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="py-8"
              >
                <div className="glass p-12 rounded-[4rem] inline-block border-[#FF9933]/20 shadow-[0_0_100px_rgba(255,153,51,0.1)]">
                  <div className="flex justify-center gap-4 mb-8">
                    <button 
                      onClick={() => { setMode('work'); setTimeLeft(25 * 60); setIsActive(false); }}
                      className={`text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full border transition-all ${mode === 'work' ? 'bg-[#FF9933] text-white border-[#FF9933]' : 'border-white/10 text-white/40'}`}
                    >
                      Dhyaan (Focus)
                    </button>
                    <button 
                      onClick={() => { setMode('break'); setTimeLeft(5 * 60); setIsActive(false); }}
                      className={`text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full border transition-all ${mode === 'break' ? 'bg-[#138808] text-white border-[#138808]' : 'border-white/10 text-white/40'}`}
                    >
                      Vishram (Rest)
                    </button>
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF9933] mb-4">Current Dhyaan</h3>
                  <div className="text-[10rem] md:text-[14rem] font-serif font-black tracking-tighter leading-none tabular-nums text-[#f5f2ed]">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="flex justify-center gap-6 mt-8">
                    <button 
                      onClick={() => setIsActive(!isActive)}
                      className="w-20 h-20 glass rounded-full flex items-center justify-center hover:bg-[#FF9933]/20 transition-all active:scale-90 text-[#FF9933]"
                    >
                      {isActive ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                    </button>
                    <button 
                      onClick={() => { setIsActive(false); setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60); }}
                      className="w-20 h-20 glass rounded-full flex items-center justify-center hover:bg-white/10 transition-all active:scale-90 text-white/40"
                    >
                      <RotateCcw size={32} />
                    </button>
                  </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-4xl mx-auto">
                <motion.div 
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="glass p-8 rounded-[2.5rem] border-red-500/20"
                >
                  <div className="flex items-center gap-3 text-red-400 mb-6">
                    <Lock size={18} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Distraction Shield</span>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2 font-bold">Blocked:</p>
                    <div className="flex flex-wrap gap-3">
                      {DISTRACTING_APPS.map(app => (
                        <div key={app.name} className="flex items-center gap-2 bg-red-500/10 text-red-400 px-3 py-2 rounded-xl border border-red-500/10">
                          <img src={app.icon} alt={app.name} className="w-4 h-4 grayscale invert opacity-50" />
                          <span className="text-[10px] font-bold uppercase tracking-tighter">{app.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="glass p-8 rounded-[2.5rem] border-[#138808]/20"
                >
                  <div className="flex items-center gap-3 text-[#138808] mb-6">
                    <Sparkles size={18} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sadhana Tools</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeTask.suggestedTools?.map(tool => (
                      <span key={tool} className="text-[9px] font-bold bg-[#138808]/10 text-[#138808] px-3 py-1.5 rounded-lg border border-[#138808]/10">
                        {tool}
                      </span>
                    )) || <span className="text-xs text-white/20">Analyzing stream...</span>}
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="pt-8"
              >
                <button
                  onClick={() => {
                    if (window.confirm("Vatsa, are you sure you have completed your Sadhana?")) {
                      toggleTask(activeTask.id);
                      setIsFocusMode(false);
                    }
                  }}
                  className="bg-[#FF9933] text-white px-16 py-6 rounded-[2rem] font-black text-xl hover:scale-105 transition-all active:scale-95 shadow-[0_0_50px_rgba(255,153,51,0.3)]"
                >
                  Complete Sadhana
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FocusGuruji Chat Sidebar */}
      <AnimatePresence>
        {isChatting && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatting(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md glass-dark z-[70] flex flex-col"
            >
              <div className="p-8 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#FF9933] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF9933]/20">
                    <LotusIcon size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-black tracking-tight text-[#FF9933]">Focus Guruji</h3>
                    <p className="text-[10px] font-bold text-[#FF9933]/60 uppercase tracking-widest">Ancient AI Guide</p>
                  </div>
                </div>
                <button onClick={() => setIsChatting(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                {messages.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] p-5 rounded-3xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-[#FF9933] text-white rounded-tr-none shadow-md' 
                        : 'glass text-[#f5f2ed] rounded-tl-none font-serif text-lg leading-relaxed'
                    }`}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="glass p-4 rounded-2xl rounded-tl-none flex gap-1">
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-8 border-t border-white/10 bg-black/20">
                <div className="relative">
                  <input 
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask Guruji for guidance..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 pr-14 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <button 
                    type="submit"
                    className="absolute right-3 top-3 p-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-all"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="p-12 text-center relative z-10">
        <div className="inline-flex flex-col items-center gap-2 glass px-10 py-6 rounded-[2rem] border-[#FF9933]/10">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF9933]/40">
            DHYAAN.AI SADHANA • V3.0 • DHARMA ENGINE ACTIVE
          </p>
          <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">
            INSPIRED BY ANCIENT INDIAN WISDOM
          </p>
        </div>
      </footer>
    </div>
  );
}




