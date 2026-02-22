import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  onSnapshot, 
  query, 
  updateDoc,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  User, 
  Lock, 
  Plus, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Hash, 
  LogOut, 
  ChevronRight,
  Send, 
  ArrowLeft,
  Info,
  ShieldCheck
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = __firebase_config;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'impromptu-v1';

// --- Utilities ---
const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generates a random "Identity Token" instead of Person 1, 2, etc.
const generateRandomAlias = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// --- Components ---

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('landing'); 
  const [currentRoom, setCurrentRoom] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleLogout = () => {
    setProfile(null);
    setCurrentRoom(null);
    setView('landing');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f12] text-slate-200 font-sans selection:bg-purple-500/30">
      <main className="max-w-md mx-auto min-h-screen flex flex-col p-4">
        {view === 'landing' && <LandingView setView={setView} />}
        {view === 'login' && <AuthView type="login" setView={setView} setProfile={setProfile} setError={setError} user={user} />}
        {view === 'signup' && <AuthView type="signup" setView={setView} setProfile={setProfile} setError={setError} user={user} />}
        {view === 'dashboard' && profile && (
          <DashboardView 
            profile={profile} 
            setView={setView} 
            setCurrentRoom={setCurrentRoom} 
            setError={setError}
            onLogout={handleLogout}
            user={user}
          />
        )}
        {view === 'room' && currentRoom && profile && (
          <RoomView 
            room={currentRoom} 
            profile={profile} 
            user={user}
            onLeave={() => { setCurrentRoom(null); setView('dashboard'); }} 
          />
        )}

        {error && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-900/90 text-red-100 px-4 py-3 rounded-xl border border-red-700 shadow-2xl flex items-center gap-3 backdrop-blur-md z-50 animate-bounce">
            <Info size={18} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}
      </main>
    </div>
  );
}

function LandingView({ setView }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="space-y-2">
        <h1 className="text-5xl font-black bg-gradient-to-br from-purple-400 to-pink-500 bg-clip-text text-transparent tracking-tighter">
          Impromptu
        </h1>
        <p className="text-slate-400 font-medium">Honest conversations. Zero identity risk.</p>
      </div>

      <div className="w-full space-y-3">
        <button 
          onClick={() => setView('login')}
          className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
        >
          Get Started <ChevronRight size={20} />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 w-full text-xs text-slate-500">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">100% Anonymous</div>
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">Private Rooms</div>
      </div>
    </div>
  );
}

function AuthView({ type, setView, setProfile, setError, user }) {
  const [userIdInput, setUserIdInput] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userIdInput || !password) return setError("Please fill all fields");
    if (!user) return setError("Authentication initializing...");
    setIsSubmitting(true);

    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userIdInput);
      const userSnap = await getDoc(userRef);

      if (type === 'signup') {
        if (userSnap.exists()) {
          setError("UserID already taken");
        } else {
          const newUser = { userId: userIdInput, password, createdAt: Date.now() };
          await setDoc(userRef, newUser);
          setProfile(newUser);
          setView('dashboard');
        }
      } else {
        if (userSnap.exists() && userSnap.data().password === password) {
          setProfile(userSnap.data());
          setView('dashboard');
        } else {
          setError("Invalid credentials");
        }
      }
    } catch (err) {
      console.error("Database error details:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center animate-in slide-in-from-bottom-8 duration-500">
      <button onClick={() => setView('landing')} className="mb-8 text-slate-500 hover:text-white flex items-center gap-2">
        <ArrowLeft size={20} /> Back
      </button>

      <h2 className="text-3xl font-bold mb-2">{type === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
      <p className="text-slate-400 mb-8">{type === 'login' ? 'Sign in to join or create rooms.' : 'Pick a unique ID to get started.'}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-500 ml-1">UserID</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value.toLowerCase().replace(/\s/g, ''))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              placeholder="e.g. shadow_runner"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-500 ml-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button 
          disabled={isSubmitting}
          className="w-full bg-purple-600 hover:bg-purple-500 py-4 rounded-2xl font-bold mt-4 transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Processing...' : type === 'login' ? 'Login' : 'Create Account'}
        </button>
      </form>

      <p className="mt-8 text-center text-slate-500">
        {type === 'login' ? "Don't have an account? " : "Already have an account? "}
        <button onClick={() => setView(type === 'login' ? 'signup' : 'login')} className="text-purple-400 font-bold">
          {type === 'login' ? 'Sign Up' : 'Login'}
        </button>
      </p>
    </div>
  );
}

function DashboardView({ profile, setView, setCurrentRoom, setError, onLogout, user }) {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreateRoom = async () => {
    if (!user) return;
    setIsProcessing(true);
    const code = generateRoomCode();
    try {
      const roomData = {
        roomCode: code,
        creator: profile.userId,
        createdAt: Date.now(),
        expiresAt: Date.now() + (12 * 60 * 60 * 1000), 
        memberCount: 0
      };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code), roomData);
      setCurrentRoom(roomData);
      setView('room');
    } catch (err) {
      setError("Failed to create room.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomCodeInput || !user) return;
    const code = roomCodeInput.toUpperCase();
    setIsProcessing(true);
    try {
      const roomSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code));
      if (roomSnap.exists()) {
        setCurrentRoom(roomSnap.data());
        setView('room');
      } else {
        setError("Room not found or expired.");
      }
    } catch (err) {
      setError("Join failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start mb-12">
        <div>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Logged in as</h2>
          <p className="text-2xl font-black text-white">{profile.userId}</p>
        </div>
        <button onClick={onLogout} className="p-2 bg-white/5 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors">
          <LogOut size={20} />
        </button>
      </div>

      <div className="space-y-10">
        <section>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Plus className="text-purple-500" size={20} /> Host a Session
          </h3>
          <button 
            disabled={isProcessing}
            onClick={handleCreateRoom}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-3xl flex items-center justify-between group hover:shadow-[0_0_30px_-10px_rgba(147,51,234,0.5)] transition-all"
          >
            <div className="text-left">
              <span className="block text-xl font-bold">Create New Room</span>
              <span className="text-white/60 text-sm">Get a private code for your friends</span>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
          </button>
        </section>

        <section>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Users className="text-pink-500" size={20} /> Join Session
          </h3>
          <form onSubmit={handleJoinRoom} className="relative">
            <input 
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value)}
              placeholder="ENTER ROOM CODE"
              className="w-full bg-white/5 border-2 border-dashed border-white/10 focus:border-pink-500/50 rounded-3xl p-6 text-center text-2xl font-black tracking-[0.2em] outline-none transition-all placeholder:text-slate-700"
            />
            <button 
              type="submit"
              disabled={isProcessing || !roomCodeInput}
              className="absolute right-3 top-3 bottom-3 aspect-square bg-pink-600 rounded-2xl flex items-center justify-center hover:bg-pink-500 disabled:opacity-0 transition-all"
            >
              <ChevronRight size={24} />
            </button>
          </form>
        </section>
      </div>

      <div className="mt-auto pt-12 pb-6 text-center text-slate-600 text-xs">
        <p>Rooms expire automatically after 12 hours of inactivity.</p>
      </div>
    </div>
  );
}

function RoomView({ room, profile, user, onLeave }) {
  const [alias, setAlias] = useState(null);
  const [members, setMembers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    if (!user) return;
    const setupMember = async () => {
      const memberRef = doc(db, 'artifacts', appId, 'public', 'data', 'room_members', `${room.roomCode}_${profile.userId}`);
      const memberSnap = await getDoc(memberRef);

      if (memberSnap.exists()) {
        setAlias(memberSnap.data().alias);
      } else {
        // Updated alias logic: Generate a random 5-char string instead of sequential numbers
        const newAlias = generateRandomAlias();
        
        await setDoc(memberRef, {
          userId: profile.userId,
          roomCode: room.roomCode,
          alias: newAlias,
          joinedAt: Date.now()
        });
        setAlias(newAlias);
      }
    };

    setupMember();
  }, [room.roomCode, profile.userId, user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'questions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filtered = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(q => q.roomCode === room.roomCode)
        .sort((a, b) => b.createdAt - a.createdAt);
      setQuestions(filtered);
    }, (err) => console.error("Question stream error", err));
    return () => unsubscribe();
  }, [room.roomCode, user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'room_members'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const inRoom = snapshot.docs.filter(d => d.data().roomCode === room.roomCode);
      setMembers(inRoom.map(d => d.data()));
    }, (err) => console.error("Member stream error", err));
    return () => unsubscribe();
  }, [room.roomCode, user]);

  if (!alias) return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-bold animate-pulse tracking-wide">SHUFFLING IDENTITIES...</p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col animate-in fade-in duration-700">
      <div className="sticky top-0 z-30 bg-[#0f0f12]/80 backdrop-blur-md pb-4 pt-4 border-b border-white/5">
        <div className="flex justify-between items-center mb-4">
          <button onClick={onLeave} className="text-slate-500 hover:text-white flex items-center gap-1 text-sm font-bold">
            <ArrowLeft size={16} /> Exit Room
          </button>
          <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full text-purple-400 text-xs font-bold">
            <Users size={14} /> {members.length} Members
          </div>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-white">{room.roomCode}</h2>
            <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Anonymous Session</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
              <ShieldCheck size={10} /> Your Secret ID
            </span>
            <span className="text-sm font-black bg-purple-600 text-white px-3 py-1 rounded-lg shadow-lg shadow-purple-900/20">
              {alias}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 py-6 space-y-6">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 text-slate-600">
            <MessageSquare size={48} className="opacity-20" />
            <p className="text-lg font-medium">No questions yet.<br/>Type something spicy below.</p>
          </div>
        ) : (
          questions.map(q => (
            <QuestionCard key={q.id} question={q} currentAlias={alias} user={user} />
          ))
        )}
      </div>

      <div className="sticky bottom-0 pb-6 pt-4 mt-4 z-50 bg-[#0f0f12]/80 backdrop-blur-md">
        {isAsking ? (
          <QuestionForm 
            roomCode={room.roomCode} 
            onClose={() => setIsAsking(false)} 
            alias={alias}
            user={user}
          />
        ) : (
          <button 
            onClick={() => setIsAsking(true)}
            className="w-full bg-white text-black font-black py-4 rounded-2xl shadow-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <Plus size={20} /> Ask a Question
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionCard({ question, currentAlias, user }) {
  const [answers, setAnswers] = useState([]);
  const [myAnswer, setMyAnswer] = useState(null);
  const [isResponding, setIsResponding] = useState(false);
  const [tempInput, setTempInput] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'answers'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filtered = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(a => a.questionId === question.id);
      setAnswers(filtered);
      
      const mine = filtered.find(a => a.alias === currentAlias);
      if (mine) setMyAnswer(mine);
    }, (err) => console.error("Answer stream error", err));
    return () => unsubscribe();
  }, [question.id, currentAlias, user]);

  const handleVote = async (option) => {
    if (myAnswer || !user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'answers'), {
        questionId: question.id,
        alias: currentAlias,
        text: option,
        createdAt: Date.now()
      });
    } catch (err) { console.error(err); }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!tempInput || myAnswer || !user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'answers'), {
        questionId: question.id,
        alias: currentAlias,
        text: tempInput,
        createdAt: Date.now()
      });
      setIsResponding(false);
      setTempInput('');
    } catch (err) { console.error(err); }
  };

  return (
    <div className="bg-[#1a1a20] border border-white/5 rounded-3xl p-6 space-y-4 shadow-sm group hover:border-white/10 transition-colors">
      <div className="flex justify-between items-start">
        <span className="px-2 py-1 bg-white/5 text-[10px] font-black text-slate-500 rounded uppercase tracking-tighter">
          {question.type === 'poll' ? 'Poll' : question.type === 'one_word' ? 'Short Response' : 'Confessional'}
        </span>
        <span className="text-[10px] text-slate-600 font-medium">
          {new Date(question.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <h3 className="text-xl font-bold leading-tight text-slate-100">{question.text}</h3>

      <div className="space-y-3">
        {question.type === 'poll' && (
          <div className="space-y-2">
            {question.options.map(opt => {
              const votes = answers.filter(a => a.text === opt).length;
              const percent = answers.length > 0 ? Math.round((votes / answers.length) * 100) : 0;
              const hasVoted = !!myAnswer;

              return (
                <button 
                  key={opt}
                  disabled={hasVoted}
                  onClick={() => handleVote(opt)}
                  className={`relative w-full text-left p-4 rounded-2xl overflow-hidden transition-all border ${
                    myAnswer?.text === opt ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-white/5'
                  }`}
                >
                  <div 
                    className="absolute inset-y-0 left-0 bg-purple-500/10 transition-all duration-1000" 
                    style={{ width: hasVoted ? `${percent}%` : '0%' }}
                  />
                  <div className="relative flex justify-between items-center z-10">
                    <span className="font-bold text-sm">{opt}</span>
                    {hasVoted && <span className="text-xs font-black text-slate-400">{percent}%</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {(question.type === 'one_word' || question.type === 'descriptive') && (
          <div className="space-y-4">
            {!myAnswer && !isResponding && (
              <button 
                onClick={() => setIsResponding(true)}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-slate-500 text-sm font-bold text-left flex items-center gap-2 hover:bg-white/10 transition-colors"
              >
                <Send size={16} /> Anonymous response...
              </button>
            )}

            {isResponding && (
              <form onSubmit={handleTextSubmit} className="space-y-3">
                <textarea 
                  autoFocus
                  value={tempInput}
                  onChange={(e) => setTempInput(e.target.value)}
                  maxLength={question.type === 'one_word' ? 25 : 1000}
                  className="w-full bg-white/10 border border-purple-500/30 rounded-2xl p-4 text-sm outline-none focus:ring-1 focus:ring-purple-500 min-h-[80px]"
                  placeholder={question.type === 'one_word' ? "Max 25 characters..." : "Be honest..."}
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-purple-600 py-3 rounded-xl text-sm font-bold">Post Anonymously</button>
                  <button type="button" onClick={() => setIsResponding(false)} className="px-4 bg-white/5 rounded-xl text-sm font-bold">Cancel</button>
                </div>
              </form>
            )}

            {answers.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">
                   {answers.length} Total Responses
                </div>
                {answers.map(ans => (
                  <div key={ans.id} className="p-3 bg-white/5 rounded-xl border border-white/5 text-sm">
                    <span className="block text-[10px] font-black text-purple-400 uppercase mb-1">{ans.alias}</span>
                    <p className="text-slate-200">{ans.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionForm({ roomCode, onClose, alias, user }) {
  const [type, setType] = useState('poll'); 
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '']);

  const addOption = () => setOptions([...options, '']);
  const updateOption = (idx, val) => {
    const n = [...options];
    n[idx] = val;
    setOptions(n);
  };

  const handleCreate = async () => {
    if (!text || !user) return;
    try {
      const qData = {
        roomCode,
        creatorAlias: alias,
        text,
        type,
        createdAt: Date.now(),
        options: type === 'poll' ? options.filter(o => o.trim()) : null
      };
      // Send to database
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'questions'), qData);
      
      // Reset form and close
      setText('');
      setOptions(['', '']);
      onClose(); 
    } catch (err) { 
      console.error(err); 
      onClose(); // Force close even if network is slow
    }
  };

  return (
    // FIX 1: Added 'relative z-50' here so it sits firmly above all background polls
    <div className="relative z-50 bg-[#21212a] rounded-3xl p-6 border border-white/10 shadow-2xl space-y-6 animate-in slide-in-from-bottom-12 duration-300">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-black">New Anonymous Post</h4>
        <button onClick={onClose} className="text-slate-500 font-bold">Cancel</button>
      </div>

      <div className="flex p-1 bg-black/20 rounded-xl">
        {['poll', 'one_word', 'descriptive'].map(t => (
          <button 
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${type === t ? 'bg-white text-black' : 'text-slate-500'}`}
          >
            {t === 'one_word' ? 'Short' : t === 'descriptive' ? 'Long' : t}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask anything..."
          className="w-full bg-transparent border-b border-white/10 py-2 outline-none text-xl font-bold focus:border-purple-500 transition-colors min-h-[80px]"
        />

        {type === 'poll' && (
          <div className="space-y-3">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Hash className="text-slate-600" size={14} />
                <input 
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-sm outline-none focus:border-purple-500"
                />
              </div>
            ))}
            {options.length < 5 && (
              <button onClick={addOption} className="text-xs font-bold text-purple-400 flex items-center gap-1">
                <Plus size={14} /> Add Option
              </button>
            )}
          </div>
        )}
      </div>

      <button 
        onClick={handleCreate}
        disabled={!text}
        className="w-full bg-purple-600 py-4 rounded-2xl font-black shadow-lg hover:bg-purple-500 transition-all disabled:opacity-50"
      >
        Post Question
      </button>
    </div>
  );
}

