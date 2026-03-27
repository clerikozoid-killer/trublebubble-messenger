import { useEffect, useState, useRef, useMemo, type CSSProperties } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useMessageStore } from '../stores/messageStore';
import { socket } from '../services/socket';
import { api } from '../services/api';
import CallSlapWaking from '../components/CallSlapWaking';
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Phone,
  Video,
  Send,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  File,
  Mic,
  Square,
  Reply,
  Edit,
  Copy,
  Trash2,
  X,
  Users,
  ChevronRight,
  ChevronLeft,
  BellOff,
  Download,
  Paintbrush,
  ShieldOff,
  Palette,
  MapPin,
  FolderOpen,
  Bookmark,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { isToday, isYesterday, format } from 'date-fns';
import type { Message, User } from '../types';
import ChatInfoModal from '../components/ChatInfoModal';
import EmojiPicker from '../components/EmojiPicker';
import PollCard from '../components/PollCard';
import PollCreateModal from '../components/PollCreateModal';
import GeoPickerModal, { type GeoChoice } from '../components/GeoPickerModal';
import DrawMessageModal from '../components/DrawMessageModal';
import { mediaUrl } from '../utils/mediaUrl';
import { loadPendingCall, clearPendingCall, consumeAutoAcceptCall, type PendingCallPayload } from '../utils/pendingCall';
import { getOutgoingReceipt } from '../utils/messageReceipt';
import { setChatMute, isChatMuted, muteLabel } from '../utils/chatMute';
import { useChatThemeStore, CHAT_THEME_PRESETS, type ChatThemeId } from '../stores/chatThemeStore';
import { parseActiveMention } from '../utils/mentionParse';
import { addSavedMessage } from '../utils/savedMessages';
import { getPinnedMessage, togglePinnedMessage, clearPinnedMessage } from '../utils/pinnedMessages';
import { useI18n } from '../i18n/useI18n';
import { getDiscussionLink, setDiscussionLink, getParentDiscussionLink } from '../utils/discussionLinks';
import { getReaction, setReaction } from '../utils/messageReactions';
import { translateText } from '../utils/translateText';
import { useLanguageStore } from '../stores/languageStore';
import type { LangCode } from '../i18n/languages';

function memberLabel(count: number, one: string, other: string) {
  return `${count} ${count === 1 ? one : other}`;
}

type PendingAttachment = { id: string; file: File; previewUrl: string };

type ChatSearchFilter = 'all' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE';

type PollStub = { kind: 'poll'; pollId: string };

function parsePollStub(content?: string): PollStub | null {
  if (!content) return null;
  if (!content.trim().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(content) as { kind?: unknown; pollId?: unknown };
    if (parsed?.kind === 'poll' && typeof parsed?.pollId === 'string') {
      return { kind: 'poll', pollId: parsed.pollId };
    }
    return null;
  } catch {
    return null;
  }
}

type LocationStub = { kind: 'location'; label: string; lat: number; lng: number };

type SpeechLocale =
  | 'ru-RU'
  | 'en-US'
  | 'zh-CN'
  | 'ja-JP'
  | 'sr-RS'
  | 'de-DE'
  | 'fr-FR'
  | 'es-ES'
  | 'it-IT'
  | 'pt-PT'
  | 'ar-SA'
  | 'hi-IN'
  | 'uk-UA'
  | 'tr-TR'
  | 'el-GR'
  | 'sa'
  | 'eo';

const UI_LANG_TO_SPEECH_LOCALE: Record<LangCode, SpeechLocale> = {
  ru: 'ru-RU',
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
  sr: 'sr-RS',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-PT',
  ar: 'ar-SA',
  hi: 'hi-IN',
  uk: 'uk-UA',
  tr: 'tr-TR',
  ang: 'en-US',
  grc: 'el-GR',
  sa: 'sa',
  eo: 'eo',
  dothraki: 'en-US',
  tlh: 'en-US',
};

const SPEECH_LOCALE_OPTIONS: Array<{ value: SpeechLocale; lang: LangCode }> = [
  { value: 'ru-RU', lang: 'ru' },
  { value: 'en-US', lang: 'en' },
  { value: 'zh-CN', lang: 'zh' },
  { value: 'ja-JP', lang: 'ja' },
  { value: 'sr-RS', lang: 'sr' },
  { value: 'de-DE', lang: 'de' },
  { value: 'fr-FR', lang: 'fr' },
  { value: 'es-ES', lang: 'es' },
  { value: 'it-IT', lang: 'it' },
  { value: 'pt-PT', lang: 'pt' },
  { value: 'ar-SA', lang: 'ar' },
  { value: 'hi-IN', lang: 'hi' },
  { value: 'uk-UA', lang: 'uk' },
  { value: 'tr-TR', lang: 'tr' },
  { value: 'el-GR', lang: 'grc' },
  { value: 'eo', lang: 'eo' },
];

const TRANSLATE_TARGET_OPTIONS: Array<{ value: LangCode }> = [
  { value: 'ru' },
  { value: 'en' },
  { value: 'zh' },
  { value: 'ja' },
  { value: 'sr' },
  { value: 'de' },
  { value: 'fr' },
  { value: 'es' },
  { value: 'it' },
  { value: 'pt' },
  { value: 'ar' },
  { value: 'hi' },
  { value: 'uk' },
  { value: 'tr' },
];

function parseLocationStub(content?: string): LocationStub | null {
  if (!content) return null;
  const t = content.trim();
  if (!t.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(t) as { kind?: unknown; label?: unknown; lat?: unknown; lng?: unknown };
    if (parsed?.kind === 'location' && typeof parsed?.label === 'string') {
      const lat = typeof parsed?.lat === 'number' ? parsed.lat : Number(parsed.lat);
      const lng = typeof parsed?.lng === 'number' ? parsed.lng : Number(parsed.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { kind: 'location', label: parsed.label, lat, lng };
    }
    return null;
  } catch {
    return null;
  }
}

export default function ChatView() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();
  const { t } = useI18n();
  const language = useLanguageStore((s) => s.language);
  const { currentChat, fetchChat, markChatAsRead, removeChat, updateChat, createChat } = useChatStore();
  const { messages, fetchMessages, editMessage, deleteMessage, clearChatMessages, sendMessage } = useMessageStore();

  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState<Message | null>(null);
  const [messageMenuPlacement, setMessageMenuPlacement] = useState<'above' | 'below'>('below');
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [, setReactionVersion] = useState(0);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [chatSearchFilter, setChatSearchFilter] = useState<ChatSearchFilter>('all');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [menuPanel, setMenuPanel] = useState<'main' | 'mute'>('main');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [muteTick, setMuteTick] = useState(0);
  const [pinVersion, setPinVersion] = useState(0);
  const pinnedMessage = useMemo(() => {
    if (!user?.id || !chatId) return null;
    return getPinnedMessage(user.id, chatId);
  }, [user?.id, chatId, pinVersion]);

  const parentDiscussion = useMemo(() => {
    if (!user?.id || !chatId) return null;
    return getParentDiscussionLink(user.id, chatId);
  }, [user?.id, chatId]);

  // --- 1:1 Calls (WebRTC signaling через socket.io) ---
  const [callUi, setCallUi] = useState<null | {
    mode: 'audio' | 'video';
    phase: 'waking' | 'incoming' | 'calling' | 'in_call' | 'rejected' | 'ended';
    callId: string;
    fromUserId: string;
  }>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const callRoleRef = useRef<'idle' | 'caller' | 'callee'>('idle');
  const callIdRef = useRef<string | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingCallTypeRef = useRef<'audio' | 'video' | null>(null);
  const pendingFromUserIdRef = useRef<string | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const autoAcceptUiModeRef = useRef<'audio' | 'video' | null>(null);
  const wakeKeepAliveTimerRef = useRef<number | null>(null);
  const [callDebugLogs, setCallDebugLogs] = useState<string[]>([]);
  const [callDebugExpanded, setCallDebugExpanded] = useState(false);
  const [transcriptEnabled, setTranscriptEnabled] = useState(false);
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const [translateHoldActive, setTranslateHoldActive] = useState(false);
  const [cloudTranslationEnabled, setCloudTranslationEnabled] = useState(true);
  const [duckingEnabled, setDuckingEnabled] = useState(true);
  const [asrLangOverride, setAsrLangOverride] = useState<'auto' | SpeechLocale>('auto');
  const [ttsLangOverride, setTtsLangOverride] = useState<'auto' | SpeechLocale>('auto');
  const [translateTargetLang, setTranslateTargetLang] = useState<'auto' | LangCode>('auto');
  const [skipTranslateTermsInput, setSkipTranslateTermsInput] = useState('');
  const [micLevel, setMicLevel] = useState<number | null>(null);
  const [netRttMs, setNetRttMs] = useState<number | null>(null);
  const [peerSpeaking, setPeerSpeaking] = useState(false);
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [subtitle, setSubtitle] = useState<{ speaker: 'me' | 'peer'; original: string; translated?: string; lang?: string } | null>(null);
  const [lastSpokenTranslated, setLastSpokenTranslated] = useState<string | null>(null);
  const [showCallSummary, setShowCallSummary] = useState(false);
  const [callSummaryText, setCallSummaryText] = useState<string | null>(null);
  const [callTranscript, setCallTranscript] = useState<
    Array<{
      id: string;
      at: number;
      from: 'me' | 'peer';
      text: string;
      lang?: string;
      translated?: string;
      final?: boolean;
    }>
  >([]);
  const recognitionRef = useRef<any>(null);
  const callTranscriptRef = useRef<typeof callTranscript>([]);
  const ttsQueueRef = useRef<string[]>([]);
  const ttsCancelTokenRef = useRef<number>(0);
  const localMicAnalyserRef = useRef<AnalyserNode | null>(null);
  const ttsSpeakingRef = useRef(false);
  const peerSpeakingTimeoutRef = useRef<number | null>(null);

  type AnimPreset = 'glow' | 'bounce' | 'roll';
  type AnimIntensity = 'low' | 'med' | 'high';
  type MessageAnimInstance = {
    instanceId: string;
    preset: AnimPreset;
    intensity: AnimIntensity;
    seed: number;
    startedAt: number;
    durationMs: number;
    fromUserId?: string;
  };

  const [activeAnimsByMessageId, setActiveAnimsByMessageId] = useState<Record<string, MessageAnimInstance[]>>({});

  const cleanupExpiredAnims = () => {
    const now = Date.now();
    setActiveAnimsByMessageId((prev) => {
      let changed = false;
      const next: Record<string, MessageAnimInstance[]> = {};
      for (const [mid, list] of Object.entries(prev)) {
        const keep = list.filter((a) => now - a.startedAt < a.durationMs);
        if (keep.length !== list.length) changed = true;
        if (keep.length) next[mid] = keep;
      }
      return changed ? next : prev;
    });
  };

  useEffect(() => {
    const id = window.setInterval(() => cleanupExpiredAnims(), 900);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animRand = (seed: number) => {
    // Deterministic-ish PRNG for per-instance offsets
    let x = seed | 0;
    return () => {
      x ^= x << 13;
      x ^= x >> 17;
      x ^= x << 5;
      return ((x >>> 0) % 1000) / 1000;
    };
  };

  const startSyncedAnimation = (messageId: string, preset: AnimPreset) => {
    if (!chatId || !user?.id) return;
    const instanceId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const seed = Math.floor(Math.random() * 1_000_000);
    const intensity: AnimIntensity = 'med';
    const durationMs = 8000;
    socket.emit('message_animation', {
      chatId,
      messageId,
      action: 'start',
      instanceId,
      preset,
      intensity,
      seed,
      durationMs,
    });
  };

  const stopSyncedAnimations = (messageId: string) => {
    if (!chatId || !user?.id) return;
    const instanceId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    socket.emit('message_animation', {
      chatId,
      messageId,
      action: 'stop_all',
      instanceId,
    });
  };

  useEffect(() => {
    callTranscriptRef.current = callTranscript;
  }, [callTranscript]);
  const [hasAudioTrack, setHasAudioTrack] = useState(false);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);

  const pushCallLog = (msg: string, data?: unknown) => {
    const ts = new Date().toLocaleTimeString();
    let line = `[${ts}] ${msg}`;
    if (data !== undefined) {
      try {
        line += ` ${JSON.stringify(data)}`;
      } catch {
        line += ' [unserializable]';
      }
    }
    setCallDebugLogs((prev) => [...prev.slice(-79), line]);
  };

  const stopWakeKeepAlive = () => {
    if (wakeKeepAliveTimerRef.current != null) {
      window.clearInterval(wakeKeepAliveTimerRef.current);
      wakeKeepAliveTimerRef.current = null;
    }
  };

  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const handleIncomingOffer = async (p: PendingCallPayload) => {
    pushCallLog('handleIncomingOffer()', p);
    if (!user?.id) return;
    if (!chatId) return;
    if (p.chatId !== chatId) return;
    if (p.fromUserId && p.fromUserId === user.id) return;
    if (callRoleRef.current !== 'idle') return;
    if (p.callType !== 'audio' && p.callType !== 'video') return;

    callRoleRef.current = 'callee';
    callIdRef.current = p.callId;
    pendingOfferRef.current = p.offer;
    pendingCallTypeRef.current = p.callType;
    pendingFromUserIdRef.current = p.fromUserId ?? null;
    pendingIceCandidatesRef.current = [];

    setCallUi({
      mode: p.callType,
      phase: 'incoming',
      callId: p.callId,
      fromUserId: p.fromUserId ?? '',
    });
  };

  const toggleLocalAudio = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = stream.getAudioTracks();
    if (tracks.length === 0) return;
    const next = !localAudioEnabled;
    tracks.forEach((t) => {
      t.enabled = next;
    });
    setLocalAudioEnabled(next);
  };

  const toggleLocalVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = stream.getVideoTracks();
    if (tracks.length === 0) return;
    const next = !localVideoEnabled;
    tracks.forEach((t) => {
      t.enabled = next;
    });
    setLocalVideoEnabled(next);
  };

  // Smart audio autoplay: do not start audio until PeerConnection is actually connected.
  useEffect(() => {
    if (!callUi) return;
    if (callUi.mode !== 'audio') return;
    if (callUi.phase !== 'in_call') return;
    const a = remoteAudioRef.current;
    if (!a) return;
    void a.play().catch(() => undefined);
  }, [callUi?.mode, callUi?.phase]);

  const translateEngineEnabled = (translateEnabled || translateHoldActive) && cloudTranslationEnabled;

  // Duck remote audio while translation is active (optional).
  useEffect(() => {
    const a = remoteAudioRef.current;
    if (!a) return;
    if (!translateEngineEnabled || !duckingEnabled) {
      a.volume = 1;
      return;
    }
    a.volume = ttsSpeaking ? 0.05 : peerSpeaking ? 0.2 : 0.2;
  }, [translateEngineEnabled, duckingEnabled, ttsSpeaking, peerSpeaking]);

  // Auto-start speech recognition when translation is requested.
  useEffect(() => {
    if (!callUi) return;
    const shouldRecord = translateEnabled || translateHoldActive;
    setTranscriptEnabled(shouldRecord);
  }, [callUi, translateEnabled, translateHoldActive]);

  useEffect(() => {
    ttsSpeakingRef.current = ttsSpeaking;
  }, [ttsSpeaking]);

  // Mic level indicator (RMS over mic track).
  useEffect(() => {
    if (!callUi || callUi.phase !== 'in_call') {
      setMicLevel(null);
      return;
    }
    if (!hasAudioTrack) {
      setMicLevel(null);
      return;
    }
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = stream.getAudioTracks();
    if (tracks.length === 0) return;

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let raf = 0;

    try {
      audioCtx = new AudioContext();
      source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);

      const buf = new Uint8Array(analyser.fftSize);
      let lastUpdateTs = 0;
      const loop = (ts: number) => {
        if (!analyser) return;
        analyser.getByteTimeDomainData(buf);
        // RMS in 0..1-ish.
        let sumSq = 0;
        for (let i = 0; i < buf.length; i++) {
          const x = (buf[i] - 128) / 128;
          sumSq += x * x;
        }
        const rms = Math.sqrt(sumSq / buf.length);
        const pct = Math.max(0, Math.min(1, rms * 4));
        if (ts - lastUpdateTs > 160) {
          setMicLevel(pct);
          lastUpdateTs = ts;
        }
        raf = window.requestAnimationFrame(loop);
      };

      raf = window.requestAnimationFrame(loop);
      localMicAnalyserRef.current = analyser;
    } catch {
      setMicLevel(null);
    }

    return () => {
      try {
        if (raf) window.cancelAnimationFrame(raf);
      } catch {
        // ignore
      }
      try {
        source?.disconnect?.();
      } catch {
        // ignore
      }
      try {
        analyser?.disconnect?.();
      } catch {
        // ignore
      }
      try {
        void audioCtx?.close?.();
      } catch {
        // ignore
      }
      localMicAnalyserRef.current = null;
      setMicLevel(null);
    };
  }, [callUi?.phase, callUi?.callId, hasAudioTrack]);

  // Network RTT indicator via RTCPeerConnection stats (best-effort).
  useEffect(() => {
    if (!callUi || callUi.phase !== 'in_call') {
      setNetRttMs(null);
      return;
    }
    const interval = window.setInterval(async () => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        const stats = await pc.getStats();
        let rttSeconds: number | null = null;
        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            const anyRep = report as unknown as { currentRoundTripTime?: unknown };
            const maybe = anyRep.currentRoundTripTime;
            if (typeof maybe === 'number' && Number.isFinite(maybe)) {
              rttSeconds = maybe;
            }
          }
        });
        if (typeof rttSeconds === 'number') {
          setNetRttMs(Math.max(1, Math.round(rttSeconds * 1000)));
        }
      } catch {
        // ignore
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, [callUi?.phase, callUi?.callId]);

  useEffect(() => {
    if (translateEngineEnabled) return;
    try {
      window.speechSynthesis?.cancel?.();
    } catch {
      // ignore
    }
    ttsQueueRef.current = [];
    setTtsSpeaking(false);
  }, [translateEngineEnabled]);

  const clearAndCancelTts = () => {
    ttsQueueRef.current = [];
    ttsCancelTokenRef.current += 1;
    try {
      window.speechSynthesis?.cancel?.();
    } catch {
      // ignore
    }
    ttsSpeakingRef.current = false;
    setTtsSpeaking(false);
  };

  const speakFromQueue = (lang: SpeechLocale, cancelToken: number) => {
    if (!translateEngineEnabled) return;
    if (ttsQueueRef.current.length === 0) return;
    const text = ttsQueueRef.current[0];

    // If user toggled quickly: cancel by token.
    if (cancelToken !== ttsCancelTokenRef.current) return;

    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 1.05;
    u.pitch = 1.0;
    u.onstart = () => {
      if (cancelToken !== ttsCancelTokenRef.current) return;
      ttsSpeakingRef.current = true;
      setTtsSpeaking(true);
    };
    u.onend = () => {
      if (cancelToken !== ttsCancelTokenRef.current) return;
      ttsQueueRef.current.shift();
      ttsSpeakingRef.current = false;
      setTtsSpeaking(false);
      // Speak next.
      if (ttsQueueRef.current.length > 0) {
        try {
          speakFromQueue(lang, cancelToken);
        } catch {
          // ignore
        }
      }
    };
    u.onerror = () => {
      if (cancelToken !== ttsCancelTokenRef.current) return;
      ttsQueueRef.current.shift();
      ttsSpeakingRef.current = false;
      setTtsSpeaking(false);
    };

    window.speechSynthesis?.speak?.(u);
  };

  const enqueueTts = (text: string) => {
    if (!translateEngineEnabled) return;
    if (!text.trim()) return;
    const wasEmpty = ttsQueueRef.current.length === 0;
    ttsQueueRef.current.push(text);
    if (!wasEmpty) return;
    // Mark speaking immediately to avoid multiple start calls before onstart fires.
    ttsSpeakingRef.current = true;
    setTtsSpeaking(true);
    const token = ttsCancelTokenRef.current;
    try {
      speakFromQueue(ttsLang, token);
    } catch {
      // ignore
    }
  };

  const recognitionLang = useMemo(() => {
    if (asrLangOverride !== 'auto') return asrLangOverride;
    return UI_LANG_TO_SPEECH_LOCALE[language] ?? 'en-US';
  }, [language, asrLangOverride]);

  const ttsLang = useMemo(() => {
    if (ttsLangOverride !== 'auto') return ttsLangOverride;
    return recognitionLang;
  }, [ttsLangOverride, recognitionLang]);

  const translateTarget = useMemo(() => {
    if (translateTargetLang !== 'auto') return translateTargetLang;
    return language;
  }, [translateTargetLang, language]);

  const skipTranslateTerms = useMemo(() => {
    const raw = skipTranslateTermsInput
      .split(/[,;\n]/g)
      .map((s) => s.trim())
      .filter(Boolean);
    return raw.map((s) => s.toLowerCase());
  }, [skipTranslateTermsInput]);

  // Start/stop Web Speech recognition for local speaker transcription.
  useEffect(() => {
    if (!callUi) return;
    if (callUi.phase !== 'in_call') return;
    if (!transcriptEnabled) {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
      return;
    }

    const SpeechRecognitionImpl =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      setToast(t('call.toast.speechNotSupported'));
      setTranscriptEnabled(false);
      return;
    }

    const rec = new SpeechRecognitionImpl();
    rec.lang = recognitionLang;
    rec.continuous = true;
    // Quality-first: avoid interim results to reduce noise/rapid changes.
    rec.interimResults = false;

    rec.onresult = (e: any) => {
      try {
        let finalText = '';
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const t = String(r?.[0]?.transcript ?? '').trim();
          if (!t) continue;
          if (r.isFinal) finalText += (finalText ? ' ' : '') + t;
          else interim += (interim ? ' ' : '') + t;
        }

        const send = (text: string, isFinal: boolean) => {
          if (!chatId || !callUi?.callId) return;
          socket.emit('call_transcript', {
            chatId,
            callId: callUi.callId,
            text,
            lang: recognitionLang,
            final: isFinal,
          });
          setCallTranscript((prev) => [
            ...prev.slice(-199),
            {
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              at: Date.now(),
              from: 'me',
              text,
              lang: recognitionLang,
              final: isFinal,
            },
          ]);
          setSubtitle({ speaker: 'me', original: text, translated: undefined, lang: recognitionLang });
        };

        if (finalText) send(finalText, true);
        else if (interim && interim.length > 12) {
          // keep interim from spamming too much: send only when sizable
          send(interim, false);
        }
      } catch {
        // ignore
      }
    };

    rec.onerror = () => {
      // do not spam toasts; browser sometimes reports transient errors
    };

    rec.onend = () => {
      // Auto-restart while enabled (some browsers stop periodically).
      if (transcriptEnabled && callUi?.phase === 'in_call') {
        try {
          rec.start();
        } catch {
          // ignore
        }
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      // ignore
    }

    return () => {
      try {
        rec.stop();
      } catch {
        // ignore
      }
      if (recognitionRef.current === rec) recognitionRef.current = null;
    };
  }, [callUi, transcriptEnabled, recognitionLang, chatId]);

  const cleanupCall = ({ emitEnd }: { emitEnd: boolean }) => {
    pushCallLog('cleanupCall()', { emitEnd, chatId, callId: callIdRef.current });
    if (emitEnd) {
      const transcript = callTranscriptRef.current ?? [];
      const peerLines = transcript.filter((l) => l.from === 'peer').slice(-22);
      if (peerLines.length > 0) {
        const title = t('call.summary.title');
        const bulletLines = peerLines.map((l) => {
          if (l.translated && l.translated !== l.text) {
            return `• ${l.text}\n  → ${l.translated}`;
          }
          return `• ${l.text}`;
        });
        setCallSummaryText([title, '', ...bulletLines].join('\n'));
        setShowCallSummary(true);
      }
    }
    try {
      if (emitEnd && socket.connected && chatId && callIdRef.current) {
        pushCallLog('socket.emit(call_end)', { chatId, callId: callIdRef.current });
        socket.emit('call_end', { chatId, callId: callIdRef.current });
      }
    } catch {
      // ignore
    }

    stopWakeKeepAlive();

    try {
      pcRef.current?.close();
    } catch {
      /* ignore */
    }
    pcRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    localStreamRef.current = null;

    remoteStreamRef.current = null;

    if (localVideoRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (localVideoRef.current as any).srcObject = null;
    }
    if (remoteVideoRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (remoteVideoRef.current as any).srcObject = null;
    }
    if (remoteAudioRef.current) {
      try {
        remoteAudioRef.current.srcObject = null;
      } catch {
        // ignore
      }
    }

    callRoleRef.current = 'idle';
    callIdRef.current = null;
    pendingOfferRef.current = null;
    pendingCallTypeRef.current = null;
    pendingFromUserIdRef.current = null;
    pendingIceCandidatesRef.current = [];
    autoAcceptUiModeRef.current = null;

    setCallUi(null);
    setTranscriptEnabled(false);
    setTranslateEnabled(false);
    setTranslateHoldActive(false);
    setCloudTranslationEnabled(true);
    setDuckingEnabled(true);
    setPeerSpeaking(false);
    setTtsSpeaking(false);
    setSubtitle(null);
    setLastSpokenTranslated(null);
    setAsrLangOverride('auto');
    setTtsLangOverride('auto');
    setTranslateTargetLang('auto');
    setCallTranscript([]);
    callTranscriptRef.current = [];
    ttsQueueRef.current = [];
    ttsCancelTokenRef.current += 1;
    try {
      window.speechSynthesis?.cancel?.();
    } catch {
      // ignore
    }
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
  };

  const createPeerConnection = () => {
    pushCallLog('createPeerConnection()');
    const pc = new RTCPeerConnection({
      // Только STUN => максимально бесплатно, но возможны звонки "безуспешно" у части сетей.
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] },
      ],
    });

    pc.onicecandidate = (e) => {
      const callId = callIdRef.current;
      if (!chatId) return;
      if (!callId) return;
      if (!e.candidate) return;
      const candAny = e.candidate as unknown as { toJSON?: () => unknown };
      const candidate = typeof candAny.toJSON === 'function' ? candAny.toJSON() : e.candidate;
      pushCallLog('socket.emit(call_ice)', { chatId, callId });
      socket.emit('call_ice', { chatId, callId, candidate });
    };

    pc.ontrack = (e) => {
      pushCallLog('pc.ontrack', { kind: e.track.kind, id: e.track.id });
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      remoteStreamRef.current.addTrack(e.track);
      if (remoteVideoRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (remoteVideoRef.current as any).srcObject = remoteStreamRef.current;
        void remoteVideoRef.current.play().catch(() => undefined);
      }
      if (remoteAudioRef.current) {
        try {
          remoteAudioRef.current.srcObject = remoteStreamRef.current;
        } catch {
          // ignore
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (!pcRef.current) return;
      const st = pcRef.current.connectionState;
      pushCallLog('pc.connectionState', { state: st });
      if (st === 'connected') {
        setCallUi((cur) => (cur ? { ...cur, phase: 'in_call' } : cur));
        return;
      }
      if (st === 'failed' || st === 'closed' || st === 'disconnected') {
        // Fallback: если media-track не пришел, но соединение уже распалось — закрываем звонок.
        setToast(t('call.toast.connectionLost'));
        cleanupCall({ emitEnd: false });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (!pcRef.current) return;
      pushCallLog('pc.iceConnectionState', { state: pcRef.current.iceConnectionState });
    };

    pcRef.current = pc;
    return pc;
  };

  const setLocalStreamToVideo = (stream: MediaStream, mode: 'audio' | 'video') => {
    localStreamRef.current = stream;
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();
    setHasAudioTrack(audioTracks.length > 0);
    setHasVideoTrack(videoTracks.length > 0);
    // Default: enabled. Toggling is handled by UI controls.
    setLocalAudioEnabled(audioTracks.length > 0);
    setLocalVideoEnabled(videoTracks.length > 0);
    audioTracks.forEach((t) => {
      t.enabled = audioTracks.length > 0;
    });
    videoTracks.forEach((t) => {
      t.enabled = videoTracks.length > 0;
    });
    if (localVideoRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (localVideoRef.current as any).srcObject = stream;
      void localVideoRef.current.play().catch(() => undefined);
    }
    if (mode === 'audio' && remoteVideoRef.current) {
      // audio-call мы всё равно показываем видео как контейнер, но пользователь его не увидит (opacity).
    }
  };

  const ensureSocketConnected = async () => {
    pushCallLog('ensureSocketConnected()', { socketConnected: socket.connected });
    if (socket.connected) return true;
    if (!accessToken) return false;
    socket.connect(accessToken);
    const start = Date.now();
    while (Date.now() - start < 10000) {
      if (socket.connected) return true;
      await wait(250);
    }
    pushCallLog('ensureSocketConnected result', { socketConnected: socket.connected });
    return socket.connected;
  };

  const startCallerCall = async (mode: 'audio' | 'video') => {
    setCallDebugLogs([]);
    pushCallLog('startCallerCall()', { mode, chatId, userId: user?.id });
    setShowCallSummary(false);
    setCallSummaryText(null);
    if (!chatId || !user?.id) return;
    if (callRoleRef.current !== 'idle') return;

    const callId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    callRoleRef.current = 'caller';
    callIdRef.current = callId;

    setCallUi({ mode, phase: 'waking', callId, fromUserId: user.id });

    // 1) поднимаем локальный медиа (пользователь даст доступ)
    const constraints =
      mode === 'video'
        ? {
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, channelCount: 1 },
            video: { facingMode: 'user' as const },
          }
        : { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, channelCount: 1, suppressLocalAudioPlayback: true }, video: false };
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      pushCallLog('getUserMedia ok (caller)', { mode });
    } catch {
      pushCallLog('getUserMedia fail (caller)', { mode });
      setToast(t('call.toast.permissionDenied'));
      cleanupCall({ emitEnd: false });
      return;
    }
    setLocalStreamToVideo(stream, mode);

    // 2) разбудить backend (Render free)
    let ok = false;
    for (let i = 0; i < 6; i++) {
      try {
        await api.wakeBackend();
        ok = true;
        break;
      } catch {
        await wait(500);
      }
    }

    if (!ok) {
      pushCallLog('wakeBackend fail');
      setToast(t('call.toast.backendNotResponding'));
      cleanupCall({ emitEnd: false });
      return;
    }

    // держим сервер активным во время звонка (минимально: раз в ~25с)
    if (wakeKeepAliveTimerRef.current == null) {
      wakeKeepAliveTimerRef.current = window.setInterval(() => {
        void api.wakeBackend().catch(() => undefined);
      }, 25000);
    }

    const connected = await ensureSocketConnected();
    if (!connected) {
      pushCallLog('socket not connected (caller)');
      setToast(t('call.toast.socketNotConnected'));
      cleanupCall({ emitEnd: false });
      return;
    }

    // 3) сигнализация offer
    const pc = createPeerConnection();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    setCallUi((cur) => (cur ? { ...cur, phase: 'calling' } : cur));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    pushCallLog('socket.emit(call_offer)', { chatId, callId, mode });
    socket.emit('call_offer', {
      chatId,
      callId,
      offer: pc.localDescription,
      callType: mode,
    });
  };

  const acceptIncomingCall = async () => {
    pushCallLog('acceptIncomingCall()');
    setShowCallSummary(false);
    setCallSummaryText(null);
    if (!chatId || !user?.id) return;
    if (callRoleRef.current !== 'callee') return;
    if (!pendingOfferRef.current || !pendingCallTypeRef.current) return;
    if (callIdRef.current == null) return;

    const mode = pendingCallTypeRef.current;
    const requestedUiMode = autoAcceptUiModeRef.current;
    const uiMode = requestedUiMode ?? mode;
    const offerInit = pendingOfferRef.current;
    const callId = callIdRef.current;

    const connected = await ensureSocketConnected();
    if (!connected) {
      pushCallLog('socket not connected (callee)');
      setToast(t('call.toast.socketNotConnected'));
      cleanupCall({ emitEnd: false });
      return;
    }

    setCallUi((cur) => (cur ? { ...cur, phase: 'calling', mode: uiMode } : cur));

    const constraints =
      mode === 'video'
        ? {
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, channelCount: 1 },
            video: { facingMode: 'user' as const },
          }
        : { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, channelCount: 1, suppressLocalAudioPlayback: true }, video: false };

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      pushCallLog('getUserMedia ok (callee)', { mode });
    } catch {
      pushCallLog('getUserMedia fail (callee)', { mode });
      setToast(t('call.toast.permissionDenied'));
      cleanupCall({ emitEnd: false });
      return;
    }

    setLocalStreamToVideo(stream, mode);

    // If we accepted "audio-only" UI for a video offer, disable local camera track,
    // but keep the WebRTC negotiation mode intact.
    if (uiMode === 'audio' && mode === 'video') {
      const tracks = stream.getVideoTracks();
      tracks.forEach((t) => {
        t.enabled = false;
      });
      setLocalVideoEnabled(false);
    }

    const pc = createPeerConnection();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offerInit));
      for (const c of pendingIceCandidatesRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch {
          // ignore
        }
      }
      pendingIceCandidatesRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      pushCallLog('socket.emit(call_answer)', { chatId, callId });
      socket.emit('call_answer', { chatId, callId, answer: pc.localDescription });
    } catch {
      pushCallLog('acceptIncomingCall failed');
      setToast(t('call.toast.failedToStart'));
      cleanupCall({ emitEnd: false });
    }

    autoAcceptUiModeRef.current = null;
  };

  const rejectIncomingCall = () => {
    pushCallLog('rejectIncomingCall()');
    if (!chatId || callIdRef.current == null) {
      cleanupCall({ emitEnd: false });
      return;
    }
    try {
      if (socket.connected) {
        pushCallLog('socket.emit(call_rejected)', { chatId, callId: callIdRef.current });
        socket.emit('call_rejected', { chatId, callId: callIdRef.current, reason: 'rejected' });
      }
    } catch {
      // ignore
    }
    cleanupCall({ emitEnd: false });
  };

  const endCall = () => {
    pushCallLog('endCall()');
    cleanupCall({ emitEnd: true });
  };

  const BUBBLE_BOT_USERNAME = 'bubble_bot';
  const chatThemeId = useChatThemeStore((s) => (chatId ? s.getChatTheme(chatId) : 'default'));
  const setChatTheme = useChatThemeStore((s) => s.setChatTheme);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const pendingAttachmentsRef = useRef<PendingAttachment[]>([]);
  pendingAttachmentsRef.current = pendingAttachments;

  const [showPollModal, setShowPollModal] = useState(false);
  const [showGeoModal, setShowGeoModal] = useState(false);
  const [showDrawModal, setShowDrawModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const attachCameraRef = useRef<HTMLInputElement>(null);
  const attachFileRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const reactionButtonRef = useRef<HTMLButtonElement>(null);
  const [inputSel, setInputSel] = useState(0);
  const [mentionPickIdx, setMentionPickIdx] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);

  const stopMicStream = () => {
    recordStreamRef.current?.getTracks().forEach((t) => t.stop());
    recordStreamRef.current = null;
  };

  const chatMessages = chatId ? messages[chatId] || [] : [];

  const filteredMessages = useMemo(() => {
    const q = messageSearchQuery.trim().toLowerCase();
    return chatMessages.filter((m) => {
      if (m.isDeleted) return false;
      if (chatSearchFilter !== 'all') {
        if (chatSearchFilter === 'VOICE') {
          if (m.contentType !== 'VOICE' && m.contentType !== 'AUDIO') return false;
        } else if (m.contentType !== chatSearchFilter) {
          return false;
        }
      }
      if (!q) return true;
      const text = (m.content || '').toLowerCase();
      const name = (m.sender?.displayName || '').toLowerCase();
      return text.includes(q) || name.includes(q);
    });
  }, [chatMessages, messageSearchQuery, chatSearchFilter]);

  useEffect(() => {
    if (!showAttachMenu) return;
    const onDoc = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showAttachMenu]);

  useEffect(() => {
    if (toast) {
      const t = window.setTimeout(() => setToast(null), 3200);
      return () => window.clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    return () => {
      pendingAttachmentsRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (!chatId) return;

    let cancelled = false;

    (async () => {
      fetchChat(chatId);
      fetchMessages(chatId);
      markChatAsRead(chatId);

      // Важно: join_chat должен отправляться только когда сокет подключён.
      // Иначе событие теряется (в `socket.emit` есть блокировка по `!socket.connected`),
      // а сигналинг звонков дальше не доходит в комнату `chat:<chatId>`.
      const connected = await ensureSocketConnected();
      if (cancelled) return;
      if (connected) {
        socket.joinChat(chatId);
      }
    })();

    return () => {
      cancelled = true;
      if (chatId) {
        socket.leaveChat(chatId);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      stopMicStream();
    };
  }, [chatId, fetchChat, fetchMessages, markChatAsRead, accessToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages]);

  const requestedTranslationsRef = useRef<Set<string>>(new Set());
  const lastTranslatedLangRef = useRef(language);

  useEffect(() => {
    if (!chatId) return;

    if (lastTranslatedLangRef.current !== language) {
      lastTranslatedLangRef.current = language;
      requestedTranslationsRef.current = new Set();
    }

    if (!language || language === 'ru') return;

    const toTranslate = chatMessages.slice(-30);
    for (const m of toTranslate) {
      if (!m.content || m.contentType !== 'TEXT') continue;
      if (requestedTranslationsRef.current.has(m.id)) continue;
      requestedTranslationsRef.current.add(m.id);

      void translateText(m.content, language).then((out) => {
        if (!out || out === m.content) return;
        useMessageStore.getState().updateMessage(chatId, m.id, { content: out });
      });
    }
  }, [chatId, chatMessages, language]);

  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      if (message.chatId === chatId) {
        useMessageStore.getState().addMessage(chatId!, message);

        if (message.senderId !== user?.id) {
          socket.ackDelivered(chatId!, message.id);
          queueMicrotask(() => {
            if (document.visibilityState === 'visible') {
              socket.markRead(chatId!, message.id);
            }
          });
        }
      }
    };

    const handleMessageEdited = (message: Message) => {
      if (message.chatId === chatId) {
        useMessageStore.getState().updateMessage(chatId!, message.id, message);
      }
    };

    const handleMessageDeleted = ({
      messageId,
      chatId: cId,
    }: {
      messageId: string;
      chatId: string;
    }) => {
      if (cId === chatId) {
        useMessageStore.getState().updateMessage(chatId!, messageId, {
          isDeleted: true,
          content: t('chat.message.deleted'),
        });
      }
    };

    const handleTyping = ({
      userId,
      isTyping: typing,
    }: {
      chatId: string;
      userId: string;
      isTyping: boolean;
    }) => {
      if (userId !== user?.id) {
        setTypingUsers((prev) =>
          typing ? [...prev.filter((id) => id !== userId), userId] : prev.filter((id) => id !== userId)
        );
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('typing', handleTyping);

    const handleMessageAnimation = (p: {
      chatId: string;
      messageId: string;
      action: 'start' | 'stop' | 'stop_all';
      instanceId: string;
      preset?: AnimPreset;
      intensity?: AnimIntensity;
      seed?: number;
      durationMs?: number;
      fromUserId?: string;
      serverTs?: number;
    }) => {
      if (p.chatId !== chatId) return;
      if (!p.messageId || !p.instanceId) return;

      if (p.action === 'stop_all') {
        setActiveAnimsByMessageId((prev) => {
          if (!prev[p.messageId]?.length) return prev;
          const next = { ...prev };
          delete next[p.messageId];
          return next;
        });
        return;
      }

      if (p.action === 'stop') {
        setActiveAnimsByMessageId((prev) => {
          const list = prev[p.messageId] || [];
          const filtered = list.filter((a) => a.instanceId !== p.instanceId);
          if (filtered.length === list.length) return prev;
          const next = { ...prev };
          if (filtered.length) next[p.messageId] = filtered;
          else delete next[p.messageId];
          return next;
        });
        return;
      }

      // start
      const startedAt = Number.isFinite(p.serverTs) ? (p.serverTs as number) : Date.now();
      const preset = (p.preset ?? 'glow') as AnimPreset;
      const intensity = (p.intensity ?? 'med') as AnimIntensity;
      const seed = typeof p.seed === 'number' ? p.seed : Math.floor(Math.random() * 1_000_000);
      const durationMs = typeof p.durationMs === 'number' ? Math.max(1500, Math.min(30000, p.durationMs)) : 8000;

      setActiveAnimsByMessageId((prev) => {
        const cur = prev[p.messageId] || [];
        // prevent duplicate instanceId
        if (cur.some((a) => a.instanceId === p.instanceId)) return prev;
        const nextList: MessageAnimInstance[] = [
          ...cur,
          { instanceId: p.instanceId, preset, intensity, seed, durationMs, startedAt, fromUserId: p.fromUserId },
        ];
        return { ...prev, [p.messageId]: nextList };
      });
    };

    socket.on('message_animation', handleMessageAnimation);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('typing', handleTyping);
      socket.off('message_animation', handleMessageAnimation);
    };
  }, [chatId, user, t]);

  // --- Call signaling listeners ---
  useEffect(() => {
    if (!chatId || !user?.id) return;

    const onOffer = async (p: PendingCallPayload) => {
      pushCallLog('socket.on(call_offer)', p);
      await handleIncomingOffer(p);
    };

    const onAnswer = async (p: {
      chatId: string;
      callId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      pushCallLog('socket.on(call_answer)', p);
      if (p.chatId !== chatId) return;
      if (callRoleRef.current !== 'caller') return;
      if (callIdRef.current == null || p.callId !== callIdRef.current) return;
      if (!pcRef.current) return;

      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(p.answer));
        for (const c of pendingIceCandidatesRef.current) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
          } catch {
            // ignore
          }
        }
        pendingIceCandidatesRef.current = [];
        setCallUi((cur) => (cur ? { ...cur, phase: 'calling' } : cur));
      } catch {
        // ignore (ICE candidates may still arrive)
      }
    };

    const onIce = async (p: {
      chatId: string;
      callId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      pushCallLog('socket.on(call_ice)', { chatId: p.chatId, callId: p.callId, hasCandidate: Boolean(p.candidate) });
      if (p.chatId !== chatId) return;
      if (callIdRef.current == null || p.callId !== callIdRef.current) return;
      try {
        if (!p.candidate) return;
        if (!pcRef.current) {
          pendingIceCandidatesRef.current.push(p.candidate);
          return;
        }
        // Если remoteDescription ещё не выставлен — складываем, чтобы не потерять ICE.
        if (!pcRef.current.remoteDescription) {
          pendingIceCandidatesRef.current.push(p.candidate);
          return;
        }
        await pcRef.current.addIceCandidate(new RTCIceCandidate(p.candidate));
      } catch {
        // ignore
      }
    };

    const onRejected = (p: { chatId: string; callId: string; reason?: string }) => {
      pushCallLog('socket.on(call_rejected)', p);
      if (p.chatId !== chatId) return;
      if (callRoleRef.current !== 'caller') return;
      if (callIdRef.current == null || p.callId !== callIdRef.current) return;
      setToast(p.reason ? `${t('call.toast.rejected')}: ${p.reason}` : t('call.toast.rejected'));
      cleanupCall({ emitEnd: false });
    };

    const onEnd = (p: { chatId: string; callId: string }) => {
      pushCallLog('socket.on(call_end)', p);
      if (p.chatId !== chatId) return;
      if (callIdRef.current == null || p.callId !== callIdRef.current) return;
      cleanupCall({ emitEnd: false });
    };

    const onTranscript = async (p: {
      chatId: string;
      callId: string;
      text: string;
      lang?: string;
      final?: boolean;
      fromUserId?: string;
    }) => {
      if (p.chatId !== chatId) return;
      if (callIdRef.current == null || p.callId !== callIdRef.current) return;
      if (!p.text) return;

      const isFinal = Boolean(p.final);
      const entryId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      setCallTranscript((prev) => [
        ...prev.slice(-199),
        {
          id: entryId,
          at: Date.now(),
          from: 'peer',
          text: p.text,
          lang: p.lang,
          final: isFinal,
        },
      ]);

      // Two-line subtitles: always show original; translated will fill later.
      setSubtitle({
        speaker: 'peer',
        original: p.text,
        translated: undefined,
        lang: p.lang,
      });

      if (!translateEngineEnabled) return;

      // Adaptive ducking: while interim text comes in, keep original reduced a bit.
      if (!isFinal) {
        setPeerSpeaking(true);
        if (peerSpeakingTimeoutRef.current) window.clearTimeout(peerSpeakingTimeoutRef.current);
        peerSpeakingTimeoutRef.current = window.setTimeout(() => setPeerSpeaking(false), 900);
        return;
      }

      // Smart pause: speak only for final segments.
      peerSpeakingTimeoutRef.current && window.clearTimeout(peerSpeakingTimeoutRef.current);
      peerSpeakingTimeoutRef.current = null;
      setPeerSpeaking(false);

      // Dictionary exclusions: if text contains "skip" terms, do not translate.
      if (skipTranslateTerms.length > 0) {
        const lower = p.text.toLowerCase();
        const shouldSkip = skipTranslateTerms.some((term) => term && lower.includes(term));
        if (shouldSkip) {
          setSubtitle({ speaker: 'peer', original: p.text, translated: undefined, lang: p.lang });
          setLastSpokenTranslated(p.text);
          enqueueTts(p.text);
          return;
        }
      }

      try {
        const translated = await translateText(p.text, translateTarget);
        const toSpeak = translated && translated.trim() ? translated : p.text;

        if (translated && translated !== p.text) {
          setCallTranscript((prev) =>
            prev.map((x) => (x.id === entryId ? { ...x, translated } : x))
          );
        }

        setSubtitle({
          speaker: 'peer',
          original: p.text,
          translated: translated && translated !== p.text ? translated : undefined,
          lang: p.lang,
        });
        setLastSpokenTranslated(toSpeak);
        enqueueTts(toSpeak);
      } catch {
        setSubtitle({ speaker: 'peer', original: p.text, translated: undefined, lang: p.lang });
        setLastSpokenTranslated(p.text);
        enqueueTts(p.text);
      }
    };

    socket.on('call_offer', onOffer);
    socket.on('call_answer', onAnswer);
    socket.on('call_ice', onIce);
    socket.on('call_rejected', onRejected);
    socket.on('call_end', onEnd);
    socket.on('call_transcript', onTranscript);

    return () => {
      socket.off('call_offer', onOffer);
      socket.off('call_answer', onAnswer);
      socket.off('call_ice', onIce);
      socket.off('call_rejected', onRejected);
      socket.off('call_end', onEnd);
      socket.off('call_transcript', onTranscript);
    };
  }, [chatId, user, translateEngineEnabled, translateTarget, ttsLang, skipTranslateTerms, cloudTranslationEnabled]);

  // If a call offer arrived while user wasn't in this chat view,
  // it is stored globally and should be applied when opening the chat.
  useEffect(() => {
    if (!chatId) return;
    const pending = loadPendingCall(chatId);
    if (!pending) return;
    const requestedMode = consumeAutoAcceptCall(chatId, pending.callId);
    clearPendingCall(chatId);
    autoAcceptUiModeRef.current = requestedMode;
    void handleIncomingOffer(pending);
    if (requestedMode) {
      // Ensure pending refs are set before accepting.
      queueMicrotask(() => {
        void acceptIncomingCall();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const uploadVoiceBlob = async (blob: Blob) => {
    if (!chatId) return;
    if (blob.size < 32) {
      setToast(t('chat.toast.recordingTooShort'));
      return;
    }
    setUploadBusy(true);
    try {
      const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'm4a' : 'webm';
      const { mediaUrl, mediaSize } = await api.uploadChatMedia(chatId, blob, `voice.${ext}`);
      socket.sendMessage({
        chatId,
        // Voice messages should display only the player (no extra text label).
        content: '',
        contentType: 'VOICE',
        mediaUrl,
        mediaSize,
      });
    } catch {
      setToast(t('chat.toast.voiceSendFailed'));
    } finally {
      setUploadBusy(false);
    }
  };

  const handleVoiceToggle = async () => {
    if (!chatId || uploadBusy) return;
    if (isRecording) {
      const rec = mediaRecorderRef.current;
      if (rec && rec.state === 'recording') {
        try {
          rec.requestData();
        } catch {
          /* ignore */
        }
      }
      rec?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setToast(t('chat.toast.micUnavailable'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      recordChunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      const outType = rec.mimeType || 'audio/webm';
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stopMicStream();
        setIsRecording(false);
        mediaRecorderRef.current = null;
        // Last `dataavailable` may run after `stop` in some browsers; yield once before building the blob.
        await new Promise((r) => setTimeout(r, 0));
        const blob = new Blob(recordChunksRef.current, {
          type: outType.split(';')[0],
        });
        recordChunksRef.current = [];
        await uploadVoiceBlob(blob);
      };
      // Omit timeslice so the UA emits one blob on stop (fewer empty recordings than chunked mode).
      rec.start();
      mediaRecorderRef.current = rec;
      setIsRecording(true);
    } catch {
      setToast(t('chat.toast.micPermission'));
    }
  };

  const handleSendOrVoice = () => {
    if (messageInput.trim() || editingMessage || pendingAttachments.length > 0) {
      void handleSendMessage();
    } else {
      void handleVoiceToggle();
    }
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p) URL.revokeObjectURL(p.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const handleSendMessage = async () => {
    if (editingMessage) {
      if (!messageInput.trim()) return;
      await editMessage(chatId!, editingMessage.id, messageInput);
      setEditingMessage(null);
      setMessageInput('');
      socket.stopTyping(chatId!);
      return;
    }

    const hasText = Boolean(messageInput.trim());
    const hasPending = pendingAttachments.length > 0;
    if (!hasText && !hasPending) return;
    if (!chatId) return;

    const rid = replyingTo?.id;
    setReplyingTo(null);

    setUploadBusy(true);
    try {
      const sockConnected = socket.connected;

      if (hasText) {
        const content = messageInput.trim();
        if (sockConnected) {
          socket.sendMessage({
            chatId,
            content,
            contentType: 'TEXT',
            replyToId: rid,
          });
        } else {
          // Fallback: persist via HTTP so the sender sees the message immediately.
          await sendMessage(chatId, content, 'TEXT', rid);
        }
        setMessageInput('');
      }

      const batch = [...pendingAttachments];
      setPendingAttachments([]);
      batch.forEach((p) => URL.revokeObjectURL(p.previewUrl));

      for (let i = 0; i < batch.length; i++) {
        const p = batch[i];
        const { mediaUrl, mediaSize, contentType } = await api.uploadChatMedia(chatId, p.file);

        const replyToId = !hasText && i === 0 ? rid : undefined;
        if (sockConnected) {
          socket.sendMessage({
            chatId,
            content: p.file.name,
            contentType,
            mediaUrl,
            mediaSize,
            replyToId,
          });
        } else {
          // Fallback for media: send via REST and update local store.
          const created = await api.post<Message>(`/messages/chat/${chatId}`, {
            content: p.file.name,
            contentType,
            mediaUrl,
            mediaSize,
            replyToId,
          });
          useMessageStore.getState().addMessage(chatId, created);
        }
      }

      socket.stopTyping(chatId);
    } catch {
      setToast(t('chat.toast.sendFailed'));
    } finally {
      setUploadBusy(false);
    }
  };

  const sendLocationMessage = async (choice: GeoChoice) => {
    if (!chatId) return;
    const rid = replyingTo?.id;
    setReplyingTo(null);
    setShowGeoModal(false);
    setUploadBusy(true);
    try {
      const content = JSON.stringify({
        kind: 'location',
        label: choice.label,
        lat: choice.lat,
        lng: choice.lng,
      });
      const sockConnected = socket.connected;
      if (sockConnected) {
        socket.sendMessage({
          chatId,
          content,
          contentType: 'TEXT',
          replyToId: rid,
        });
      } else {
        await sendMessage(chatId, content, 'TEXT', rid);
      }
    } finally {
      setUploadBusy(false);
    }
  };

  const sendDrawingAsImage = async (blob: Blob) => {
    if (!chatId) return;
    const rid = replyingTo?.id;
    setReplyingTo(null);
    setShowDrawModal(false);
    setUploadBusy(true);
    try {
      const uploaded = await api.uploadChatMedia(chatId, blob, 'drawing.png');
      const sockConnected = socket.connected;
      if (sockConnected) {
        socket.sendMessage({
          chatId,
          content: '',
          contentType: uploaded.contentType,
          mediaUrl: uploaded.mediaUrl,
          mediaSize: uploaded.mediaSize,
          replyToId: rid,
        });
      } else {
        const created = await api.post<Message>(`/messages/chat/${chatId}`, {
          content: '',
          contentType: uploaded.contentType,
          mediaUrl: uploaded.mediaUrl,
          mediaSize: uploaded.mediaSize,
          replyToId: rid,
        });
        useMessageStore.getState().addMessage(chatId, created);
      }
    } finally {
      setUploadBusy(false);
    }
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket.startTyping(chatId!);
    }
  };

  const handleTypingStop = () => {
    if (isTyping) {
      setIsTyping(false);
      socket.stopTyping(chatId!);
    }
  };

  const handleEditMessage = (message: Message) => {
    setPendingAttachments((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
    setEditingMessage(message);
    setMessageInput(message.content || '');
    inputRef.current?.focus();
    setShowMessageMenu(null);
  };

  const handleDeleteMessage = async (message: Message, deleteForEveryone: boolean) => {
    await deleteMessage(chatId!, message.id, deleteForEveryone);
    setShowMessageMenu(null);
  };

  const getChatDisplayInfo = () => {
    if (!currentChat) return { title: t('chat.loading'), isOnline: false as boolean | undefined };

    if (currentChat.type === 'PRIVATE') {
      const otherMember = currentChat.members.find((m) => m.userId !== user?.id)?.user;
      return {
        title: otherMember?.displayName || 'Unknown',
        username: otherMember?.username,
        avatar: otherMember?.avatarUrl,
        isOnline: otherMember?.isOnline,
        memberCount: undefined as number | undefined,
      };
    }

    return {
      title: currentChat.title || 'Unknown',
      username: currentChat.username,
      avatar: currentChat.avatarUrl,
      isOnline: undefined as boolean | undefined,
      memberCount: currentChat.members.length,
    };
  };

  const info = getChatDisplayInfo();

  const [peerHeaderAvatarFailed, setPeerHeaderAvatarFailed] = useState(false);
  useEffect(() => {
    setPeerHeaderAvatarFailed(false);
  }, [chatId, info.avatar]);

  const mentionMembers = useMemo((): User[] => {
    if (!currentChat?.members?.length) return [];
    return currentChat.members.map((m) => m.user);
  }, [currentChat]);

  const activeMention = useMemo(
    () => parseActiveMention(messageInput, inputSel),
    [messageInput, inputSel]
  );

  const mentionFiltered = useMemo((): User[] => {
    if (!activeMention || !mentionMembers.length) return [];
    const q = activeMention.query.toLowerCase();
    return mentionMembers.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q))
    );
  }, [activeMention, mentionMembers]);

  useEffect(() => {
    setMentionPickIdx(0);
  }, [activeMention?.start, activeMention?.query]);

  const privatePeerUserId = currentChat?.members.find((m) => m.userId !== user?.id)?.userId;

  const openHeader = () => {
    if (!currentChat || !user) return;
    if (currentChat.type === 'PRIVATE') {
      if (privatePeerUserId) {
        navigate(`/profile/${privatePeerUserId}`);
      } else {
      setToast(t('chat.toast.noContact'));
      }
      return;
    }
    setShowChatInfo(true);
  };

  const formatMessageDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return t('chat.yesterdayAt').replace('{time}', format(d, 'HH:mm'));
    return format(d, 'dd MMM HH:mm');
  };

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    msgs.forEach((msg) => {
      const msgDate = format(new Date(msg.createdAt), 'yyyy-MM-dd');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(filteredMessages);

  const handleAttachFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const list = input.files;
    if (!list?.length || !chatId) {
      input.value = '';
      return;
    }
    const files = Array.from(list);
    input.value = '';

    const next: PendingAttachment[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingAttachments((prev) => [...prev, ...next]);
  };

  /** `display:none` на file input ломает programmatic `.click()` в части браузеров */
  const openFilePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    setShowAttachMenu(false);
    window.setTimeout(() => ref.current?.click(), 0);
  };

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) {
      setMessageInput((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? messageInput.length;
    const end = el.selectionEnd ?? messageInput.length;
    // Важно: selectionStart/selectionEnd и индексы textarea работают в UTF-16 кодовых единицах.
    // Поэтому нельзя считать длину эмодзи как `[...emoji].length` (ломается на variation selector/флагах).
    setMessageInput((prev) => prev.slice(0, start) + emoji + prev.slice(end));
    handleTypingStart();
    queueMicrotask(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
      setInputSel(pos);
    });
  };

  const pickMention = (u: User) => {
    const cursor = inputRef.current?.selectionStart ?? inputSel;
    const m = parseActiveMention(messageInput, cursor);
    if (!m) return;
    const insert = u.username ? `@${u.username} ` : `@${u.displayName.replace(/\s+/g, '_')} `;
    const before = messageInput.slice(0, m.start);
    const after = messageInput.slice(cursor);
    const next = before + insert + after;
    setMessageInput(next);
    const pos = before.length + insert.length;
    queueMicrotask(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
        setInputSel(pos);
      }
    });
  };

  const handleSaveToSaved = (message: Message) => {
    if (message.isDeleted) return;
    const chatTitle = currentChat?.type === 'PRIVATE' ? undefined : currentChat?.title || undefined;
    addSavedMessage({
      id: message.id,
      chatId: message.chatId,
      chatTitle,
      senderName: message.sender.displayName,
      content: message.content,
      mediaUrl: message.mediaUrl,
      contentType: message.contentType,
      createdAt: message.createdAt,
    });
    setShowMessageMenu(null);
    setToast(t('chat.toast.saved'));
  };

  const handleTogglePinMessage = (message: Message) => {
    if (!user) return;
    if (message.isDeleted) return;
    const pinnedNow = togglePinnedMessage(user.id, message);
    setPinVersion((n) => n + 1);
    setShowMessageMenu(null);
    setToast(pinnedNow ? t('toast.messagePinned') : t('toast.messageUnpinned'));
  };

  const handleDiscussMessage = async (message: Message) => {
    if (!user) return;
    if (!currentChat) return;
    if (message.isDeleted) return;
    if (!chatId) return;

    try {
      const botUserInChat = currentChat.members.find(
        (m) => (m.user.username || '').toLowerCase() === BUBBLE_BOT_USERNAME.toLowerCase()
      );

      let botId = botUserInChat?.userId;
      if (!botId) {
        const users = await api.searchUsers(BUBBLE_BOT_USERNAME);
        botId = users.find((u) => (u.username || '').toLowerCase() === BUBBLE_BOT_USERNAME.toLowerCase())?.id;
      }

      if (!botId) {
        setToast(t('chat.toast.botNotFound'));
        return;
      }

      // Для private-диалогов оставляем логику «личного» обсуждения с ботом
      if (currentChat.type === 'PRIVATE') {
        const botChat = await createChat('PRIVATE', [botId]);
        setDiscussionLink(user.id, chatId, message.id, botChat.id);
        setShowMessageMenu(null);
        navigate(`/chat/${botChat.id}`);
        return;
      }

      if (currentChat.type === 'CHANNEL') {
        setToast(t('chat.toast.discussionsUnavailable'));
        return;
      }

      const discussionType: 'GROUP' | 'SUPERGROUP' =
        currentChat.type === 'SUPERGROUP' ? 'SUPERGROUP' : 'GROUP';

      // Участники обсуждения: все участники из текущего чата + bubble_bot,
      // но без текущего пользователя (он станет OWNER автоматически в createChat()).
      const participants = new Set<string>([
        ...currentChat.members.map((m) => m.userId),
        botId,
      ]);
      participants.delete(user.id);

      // Чтобы не показывать "Обсуждение темы" как отдельное "водяное" сообщение/заголовок,
      // делаем заголовок нейтральным (Telegram-подобно) — только имя автора.
      const title = message.sender.displayName;
      const discussionChat = await createChat(discussionType, [...participants], title);
      setDiscussionLink(user.id, chatId, message.id, discussionChat.id);
      setShowMessageMenu(null);
      navigate(`/chat/${discussionChat.id}`);
    } catch (e) {
      console.error('Discuss message error:', e);
      setToast(t('chat.toast.discussionOpenFailed'));
    }
  };

  const openMessageMenu = (e: { clientY?: number } & { preventDefault: () => void } & { stopPropagation: () => void }, m: Message) => {
    e.preventDefault();
    e.stopPropagation();
    const y = typeof e.clientY === 'number' ? e.clientY : window.innerHeight / 2;
    // If the menu would likely overlap the composer (bottom area), flip it above the message.
    const isNarrow = typeof window !== 'undefined' && window.innerWidth < 640;
    const above = isNarrow ? true : y > window.innerHeight - 240;
    setMessageMenuPlacement(above ? 'above' : 'below');
    setReactionPickerMessageId(null);
    setShowMessageMenu(m);
  };

  const handleCopyMessage = async (m: Message) => {
    const text = m.content?.trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setToast(t('chat.toast.copied'));
      setShowMessageMenu(null);
      return;
    } catch {
      // Fallback for older browsers / non-https contexts.
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', 'true');
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '0';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setToast(t('chat.toast.copied'));
        setShowMessageMenu(null);
      } catch {
        setToast(t('chat.toast.copyFailed'));
      }
    }
  };

  const getMessageSnippet = (m: Message): string => {
    if (m.isDeleted) return t('chat.message.deleted');
    if (m.content?.trim()) return m.content.trim();
    const poll = parsePollStub(m.content);
    if (poll) return t('chat.snippet.poll');
    const loc = parseLocationStub(m.content);
    if (loc) return t('chat.snippet.location');
    if (m.contentType === 'IMAGE' && m.mediaUrl) return t('chat.snippet.drawing');
    if ((m.contentType === 'AUDIO' || m.contentType === 'VOICE') && m.mediaUrl) return t('chat.snippet.audio');
    if (m.contentType === 'VIDEO' && m.mediaUrl) return t('chat.search.filter.video');
    if (m.contentType === 'FILE' && m.mediaUrl) return t('chat.snippet.file');
    return `[${t('chat.snippet.message')}]`;
  };

  const toggleSelectedMessage = (id: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelectedMessages = () => setSelectedMessageIds(new Set());

  const handleCopySelectedMessages = async () => {
    if (!selectedMessageIds.size) return;
    const selected = chatMessages.filter((m) => selectedMessageIds.has(m.id));
    const text = selected.map(getMessageSnippet).join('\n');
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setToast(t('chat.toast.copiedN').replace('{n}', String(selected.length)));
      clearSelectedMessages();
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', 'true');
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '0';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setToast(t('chat.toast.copiedN').replace('{n}', String(selected.length)));
        clearSelectedMessages();
      } catch {
        setToast(t('chat.toast.copySelectedFailed'));
      }
    }
  };

  const handleRepostSelectedMessages = () => {
    if (!selectedMessageIds.size) return;
    const selected = chatMessages.filter((m) => selectedMessageIds.has(m.id));
    const text = selected.map(getMessageSnippet).join('\n');
    if (!text.trim()) return;
    setMessageInput(text);
    setEditingMessage(null);
    setReplyingTo(null);
    clearSelectedMessages();
    inputRef.current?.focus();
  };

  const handleDeleteChat = async () => {
    if (!chatId || !currentChat) return;
    if (!window.confirm(t('chat.confirm.deleteChat'))) return;
    try {
      await api.delete(`/chats/${chatId}`);
      removeChat(chatId);
      setShowMenu(false);
      setMenuPanel('main');
      navigate('/');
    } catch {
      setToast(t('chat.toast.deleteFailed'));
    }
  };

  const handleClearHistory = async () => {
    if (!chatId) return;
    if (!window.confirm(t('chat.confirm.clearHistory'))) return;
    try {
      await api.clearChatHistory(chatId);
      clearChatMessages(chatId);
      await fetchMessages(chatId);
      setShowMenu(false);
      setMenuPanel('main');
      setToast(t('chat.toast.historyCleared'));
    } catch {
      setToast(t('chat.toast.clearFailed'));
    }
  };

  const exportChatHistory = () => {
    const blob = new Blob([JSON.stringify(chatMessages, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trublebubble-chat-${chatId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setShowMenu(false);
    setMenuPanel('main');
    setToast(t('chat.toast.exported'));
  };

  const applyMute = (mode: 'off' | '1h' | '8h' | '1w' | 'forever') => {
    if (!chatId) return;
    setChatMute(chatId, mode);
    setMuteTick((n) => n + 1);
    setShowMenu(false);
    setMenuPanel('main');
    setToast(mode === 'off' ? t('chat.toast.notificationsUnmuted') : t('chat.toast.notificationsMuted'));
  };

  const preset = chatId ? CHAT_THEME_PRESETS[chatThemeId] : CHAT_THEME_PRESETS.default;
  const muted = chatId ? isChatMuted(chatId) : false;

  const subtitleText = () => {
    if (info.isOnline === true) return t('chat.online');
    if (info.isOnline === false) return t('chat.lastSeenRecently');
    if (info.memberCount != null)
      return memberLabel(info.memberCount, t('chat.members.one'), t('chat.members.other'));
    if (info.username) return `@${info.username}`;
    return '';
  };

  return (
    <div
      className="h-full flex flex-col bg-background-dark min-h-0 min-w-0"
      style={
        chatId && chatThemeId !== 'default'
          ? ({
              ['--color-chat-outgoing' as string]: preset.outgoing,
              ['--color-chat-incoming' as string]: preset.incoming,
            } as CSSProperties)
          : undefined
      }
    >
      <input
        ref={attachInputRef}
        type="file"
        className="sr-only"
        accept="image/*,video/*"
        multiple
        onChange={handleAttachFiles}
        tabIndex={-1}
        aria-hidden
      />
      <input
        ref={attachCameraRef}
        type="file"
        className="sr-only"
        accept="image/*"
        capture="environment"
        onChange={handleAttachFiles}
        tabIndex={-1}
        aria-hidden
      />
      <input
        ref={attachFileRef}
        type="file"
        className="sr-only"
        accept="*/*"
        multiple
        onChange={handleAttachFiles}
        tabIndex={-1}
        aria-hidden
      />

          {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 bg-background-light rounded-xl shadow-xl text-sm text-text-primary border border-background-medium max-w-[90vw] text-center"
          role="status"
        >
          {toast}
        </div>
      )}

      {selectedMessageIds.size > 0 && !callUi && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[120] px-4 py-3 bg-background-light border border-background-medium rounded-xl shadow-xl w-full max-w-[95vw]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-text-primary font-semibold">
              {t('chat.selection.selectedCount').replace('{count}', String(selectedMessageIds.size))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopySelectedMessages()}
                className="px-3 py-2 rounded-lg bg-primary text-white text-sm hover:opacity-95 transition-colors"
              >
                {t('chat.selection.copy')}
              </button>
              <button
                type="button"
                onClick={() => handleRepostSelectedMessages()}
                className="px-3 py-2 rounded-lg bg-background-light border border-background-medium text-text-primary text-sm hover:bg-background-medium transition-colors"
              >
                {t('chat.selection.repost')}
              </button>
              <button
                type="button"
                onClick={clearSelectedMessages}
                className="p-2 rounded-lg hover:bg-background-light border border-background-medium text-text-secondary transition-colors"
                aria-label={t('chat.selection.clear')}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {callUi && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md sm:max-w-5xl bg-background-light border border-background-medium rounded-xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-background-medium/70">
              <div className="text-sm font-semibold text-text-primary">
                {callUi.phase === 'incoming'
                  ? t('call.ui.incomingCall')
                  : callUi.mode === 'video'
                    ? t('call.ui.videoCall')
                    : t('call.ui.voiceCall')}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    translateEnabled
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background-light border-background-medium hover:bg-background-medium text-text-primary'
                  }`}
                  onClick={() => setTranslateEnabled((v) => !v)}
                  title={t('call.ui.translation')}
                >
                  {t('call.ui.translation')}
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    translateHoldActive
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background-light border-background-medium hover:bg-background-medium text-text-primary'
                  }`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setTranslateHoldActive(true);
                  }}
                  onPointerUp={() => setTranslateHoldActive(false)}
                  onPointerCancel={() => setTranslateHoldActive(false)}
                  onPointerLeave={() => setTranslateHoldActive(false)}
                  title={t('call.ui.holdToTranslate')}
                >
                  {t('call.ui.hold')}
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-background-light rounded-full transition-colors"
                  aria-label={t('call.ui.closeCall')}
                  onClick={() => {
                    if (callUi.phase === 'incoming') rejectIncomingCall();
                    else endCall();
                  }}
                >
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>
            </div>

            <div className="relative px-4 py-4 flex-1 overflow-hidden">
              <div className="grid grid-cols-1 gap-4 h-full">
                <div>
                  {callUi.mode === 'audio' ? (
                    <div className="grid grid-cols-1 gap-3">
                      <audio ref={remoteAudioRef} playsInline className="sr-only" />
                      <div className="relative overflow-hidden w-full h-[16rem] sm:h-[22rem] rounded-lg bg-background-dark/70 border border-background-medium/60 flex items-center justify-center">
                      {subtitle && (
                        <div className="absolute bottom-3 left-3 right-3 z-10 bg-black/55 text-white rounded-xl px-3 py-2 pointer-events-none">
                          <div className="text-[10px] text-white/80">
                            {subtitle.speaker === 'me' ? t('call.ui.speakerYou') : t('call.ui.speakerPeer')}
                          </div>
                          <div className="text-[11px] text-white/90 whitespace-pre-wrap break-words">{subtitle.original}</div>
                          {subtitle.translated && (
                            <div className="text-sm font-semibold whitespace-pre-wrap break-words">{subtitle.translated}</div>
                          )}
                        </div>
                      )}
                        <div className="flex flex-col items-center gap-3 text-text-secondary">
                          {/* Robot-cups placeholder (animated) */}
                          <div className="relative w-[10rem] h-[6rem]">
                            <div
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#FF2B5E]/20 border border-[#FF2B5E]/40 flex items-center justify-center animate-bounce"
                              style={{ animationDelay: '0s' }}
                            >
                              <svg width="26" height="26" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                                <path d="M18 24c0-6 6-11 14-11s14 5 14 11" stroke="#FF2B5E" strokeWidth="4" strokeLinecap="round" />
                                <circle cx="26" cy="28" r="3.5" fill="#FF2B5E" />
                                <circle cx="38" cy="28" r="3.5" fill="#FF2B5E" />
                                <path d="M24 39c4 3 12 3 16 0" stroke="#FF2B5E" strokeWidth="4" strokeLinecap="round" />
                              </svg>
                            </div>
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-8">
                              <div className="absolute left-1 top-3 w-6 h-6 rounded-full bg-[#60A5FA]/20 border border-[#60A5FA]/40 animate-pulse" />
                              <div className="absolute right-1 top-3 w-6 h-6 rounded-full bg-[#22C55E]/20 border border-[#22C55E]/40 animate-pulse" />
                            </div>
                            <div
                              className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#22C55E]/20 border border-[#22C55E]/40 flex items-center justify-center animate-bounce"
                              style={{ animationDelay: '0.25s' }}
                            >
                              <svg width="26" height="26" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                                <path d="M18 24c0-6 6-11 14-11s14 5 14 11" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
                                <circle cx="26" cy="28" r="3.5" fill="#22C55E" />
                                <circle cx="38" cy="28" r="3.5" fill="#22C55E" />
                                <path d="M24 39c4 3 12 3 16 0" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
                              </svg>
                            </div>
                            <div className="absolute left-1/2 top-2 w-[1px] h-[2.6rem] bg-[#60A5FA]/40" />
                            <div className="absolute left-1/2 bottom-1 w-[1px] h-[1.3rem] bg-[#60A5FA]/30" />
                          </div>
                          <span className="text-sm">
                            {callUi.phase === 'in_call'
                              ? t('call.ui.voiceInProgress')
                              : t('call.ui.connectingVoice')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      <div className="relative w-full">
                        <video
                          ref={remoteVideoRef}
                          autoPlay
                          playsInline
                          className="w-full h-[16rem] sm:h-[22rem] bg-black rounded-lg object-cover"
                        />
                        {subtitle && (
                          <div className="absolute bottom-3 left-3 right-3 z-10 bg-black/55 text-white rounded-xl px-3 py-2 pointer-events-none">
                            <div className="text-[10px] text-white/80">
                              {subtitle.speaker === 'me' ? t('call.ui.speakerYou') : t('call.ui.speakerPeer')}
                            </div>
                            <div className="text-[11px] text-white/90 whitespace-pre-wrap break-words">{subtitle.original}</div>
                            {subtitle.translated && (
                              <div className="text-sm font-semibold whitespace-pre-wrap break-words">{subtitle.translated}</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-32 h-20 sm:w-40 sm:h-28 bg-black rounded-lg object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="hidden">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-text-primary">{t('call.ui.transcript')}</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-background-light border border-background-medium hover:bg-background-medium transition-colors text-sm"
                        onClick={() => setTranscriptEnabled((v) => !v)}
                      >
                        {transcriptEnabled ? t('call.ui.stop') : t('call.ui.start')}
                      </button>
                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          cloudTranslationEnabled
                            ? 'bg-primary text-white border-primary'
                            : 'bg-background-light border-background-medium hover:bg-background-medium text-text-primary'
                        }`}
                        onClick={() => {
                          setCloudTranslationEnabled((v) => !v);
                          if (cloudTranslationEnabled) {
                            clearAndCancelTts();
                          }
                        }}
                        title={t('call.ui.cloudTranslationTooltip')}
                      >
                        {cloudTranslationEnabled ? t('call.ui.cloud') : t('call.ui.noCloud')}
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] px-2 py-1 rounded-lg bg-background-dark/40 border border-background-medium/60 text-text-secondary">
                      {t('call.ui.asr')}: {transcriptEnabled ? t('call.ui.on') : t('call.ui.off')}
                    </span>
                    <span className="text-[11px] px-2 py-1 rounded-lg bg-background-dark/40 border border-background-medium/60 text-text-secondary">
                      {t('call.ui.mic')}: {micLevel == null ? '--' : `${Math.round(micLevel * 100)}%`}
                    </span>
                    <span className="text-[11px] px-2 py-1 rounded-lg bg-background-dark/40 border border-background-medium/60 text-text-secondary">
                      {t('call.ui.net')}: {netRttMs == null ? '--' : `${netRttMs}ms`}
                    </span>
                    <span className="text-[11px] px-2 py-1 rounded-lg bg-background-dark/40 border border-background-medium/60 text-text-secondary">
                      {t('call.ui.tts')}: {ttsSpeaking ? t('call.ui.speaking') : t('call.ui.idle')}
                    </span>
                    <button
                      type="button"
                      className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                        duckingEnabled
                          ? 'bg-background-dark/40 border-background-medium/60 text-text-secondary hover:bg-background-dark/55'
                          : 'bg-primary text-white border-primary'
                      }`}
                      onClick={() => setDuckingEnabled((v) => !v)}
                      title={t('call.ui.duckingTooltip')}
                    >
                      {duckingEnabled ? t('call.ui.duckingOn') : t('call.ui.duckingOff')}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="text-xs text-text-secondary">
                      {t('call.ui.asr')}
                      <select
                        className="mt-1 w-full px-2 py-1.5 rounded-lg bg-background-light border border-background-medium text-text-primary"
                        value={asrLangOverride}
                        onChange={(e) => setAsrLangOverride(e.target.value as 'auto' | SpeechLocale)}
                      >
                        <option value="auto">{t('call.translationTarget.auto')}</option>
                        {SPEECH_LOCALE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {t(`language.name.${opt.lang}` as any)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-text-secondary">
                      {t('call.ui.translateTo')}
                      <select
                        className="mt-1 w-full px-2 py-1.5 rounded-lg bg-background-light border border-background-medium text-text-primary"
                        value={translateTargetLang}
                        onChange={(e) => setTranslateTargetLang(e.target.value as 'auto' | LangCode)}
                      >
                        <option value="auto">{t('call.translationTarget.auto')}</option>
                        {TRANSLATE_TARGET_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {t(`language.name.${opt.value}` as any)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-text-secondary">
                      {t('call.ui.tts')}
                      <select
                        className="mt-1 w-full px-2 py-1.5 rounded-lg bg-background-light border border-background-medium text-text-primary"
                        value={ttsLangOverride}
                        onChange={(e) => setTtsLangOverride(e.target.value as 'auto' | SpeechLocale)}
                      >
                        <option value="auto">{t('call.translationTarget.auto')}</option>
                        {SPEECH_LOCALE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {t(`language.name.${opt.lang}` as any)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!lastSpokenTranslated || !translateEngineEnabled}
                      onClick={() => {
                        if (!lastSpokenTranslated) return;
                        enqueueTts(lastSpokenTranslated);
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                        lastSpokenTranslated && translateEngineEnabled
                          ? 'bg-primary text-white border-primary hover:opacity-95'
                          : 'bg-background-light border-background-medium text-text-secondary disabled:opacity-60'
                      }`}
                      title={t('call.ui.repeatTooltip')}
                    >
                      {t('call.ui.repeat')}
                    </button>
                    <span className="text-[11px] text-text-secondary px-1">{t('call.ui.presetsLabel')}</span>
                    {(
                      [
                        { v: 'auto', label: t('call.translationTarget.auto') },
                        { v: 'ru', label: t('language.name.ru') },
                        { v: 'en', label: t('language.name.en') },
                        { v: 'zh', label: t('language.name.zh') },
                        { v: 'ja', label: t('language.name.ja') },
                      ] as const
                    ).map((p) => (
                      <button
                        key={p.v}
                        type="button"
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          translateTargetLang === p.v
                            ? 'bg-background-dark/40 border-background-medium text-text-primary'
                            : 'bg-background-light border-background-medium hover:bg-background-medium text-text-primary'
                        }`}
                        onClick={() => setTranslateTargetLang(p.v)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2">
                    <label className="text-xs text-text-secondary">
                      {t('call.ui.skipTermsLabel')}
                      <input
                        type="text"
                        value={skipTranslateTermsInput}
                        onChange={(e) => setSkipTranslateTermsInput(e.target.value)}
                        placeholder={t('call.ui.skipTermsPlaceholder')}
                        className="mt-1 w-full px-3 py-2 rounded-lg bg-background-light border border-background-medium text-text-primary"
                      />
                    </label>
                  </div>

                  <div className="mt-3 flex-1 overflow-y-auto rounded-lg bg-background-dark/40 border border-background-medium/50 p-2">
                    {callTranscript.length === 0 ? (
                      <div className="text-xs text-text-secondary">{t('call.ui.noTranscriptYet')}</div>
                    ) : (
                      <div className="space-y-2">
                        {callTranscript.slice(-80).map((l) => (
                          <div key={l.id} className="text-sm">
                            <div className="text-[11px] text-text-secondary">
                              {new Date(l.at).toLocaleTimeString()} · {l.from === 'me' ? t('call.ui.me') : t('call.ui.peer')}{' '}
                              {l.lang ? `· ${l.lang}` : ''}
                            </div>
                            <div className="text-text-primary whitespace-pre-wrap break-words">{l.text}</div>
                            {l.translated && (
                              <div className="mt-0.5 text-text-secondary whitespace-pre-wrap break-words">{l.translated}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {callUi.phase === 'waking' && (
                <div className="absolute inset-0 bg-background-light/40 backdrop-blur-sm flex items-center justify-center">
                  <CallSlapWaking />
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-background-medium/70 flex items-center gap-2">
              {callUi.phase === 'incoming' ? (
                <>
                  <button
                    type="button"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-95 transition-opacity"
                    onClick={() => void acceptIncomingCall()}
                  >
                    {t('call.accept')}
                  </button>
                  <button
                    type="button"
                    className="flex-1 px-4 py-2 bg-background-light border border-background-medium rounded-lg hover:bg-background-medium transition-colors"
                    onClick={rejectIncomingCall}
                  >
                    {t('call.reject')}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  {hasAudioTrack && (
                    <button
                      type="button"
                      className="flex-1 px-3 py-2 bg-background-light border border-background-medium rounded-lg hover:bg-background-medium transition-colors text-sm"
                      onClick={toggleLocalAudio}
                    >
                      {localAudioEnabled ? t('call.mute') : t('call.unmute')}
                    </button>
                  )}
                  {hasVideoTrack && (
                    <button
                      type="button"
                      className="flex-1 px-3 py-2 bg-background-light border border-background-medium rounded-lg hover:bg-background-medium transition-colors text-sm"
                      onClick={toggleLocalVideo}
                    >
                      {localVideoEnabled ? t('call.cameraOff') : t('call.cameraOn')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex-1 px-3 py-2 bg-primary text-white rounded-lg hover:opacity-95 transition-opacity text-sm"
                    onClick={endCall}
                  >
                    {t('call.end')}
                  </button>
                </div>
              )}
            </div>
            <div className="px-4 pb-3">
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-background-dark/40 border border-background-medium/70 hover:bg-background-dark/55 transition-colors"
                onClick={() => setCallDebugExpanded((v) => !v)}
              >
                <span className="text-[12px] text-text-secondary">{t('call.ui.callDebugLog')}</span>
                <span className="text-[12px] text-text-secondary">
                  {callDebugExpanded ? t('call.ui.hide') : t('call.ui.show')}
                </span>
              </button>
              {callDebugExpanded && (
                <div className="mt-2 rounded-lg bg-background-dark/60 border border-background-medium/70 p-2 max-h-72 overflow-y-auto">
                  {callDebugLogs.length === 0 ? (
                    <div className="text-[11px] text-text-secondary/80">{t('call.ui.noEventsYet')}</div>
                  ) : (
                    <div className="space-y-0.5">
                      {callDebugLogs.map((l, i) => (
                        <div key={`${i}-${l.slice(0, 24)}`} className="text-[11px] leading-4 text-text-primary/90 break-all font-mono">
                          {l}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-background-medium/70">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-text-secondary">{t('call.ui.transcriptAndTranslation')}</div>
                      <div className="text-[11px] text-text-secondary">
                        {callTranscript.length > 0
                          ? t('call.ui.linesCount').replace('{n}', String(callTranscript.length))
                          : ''}
                      </div>
                    </div>
                    <div className="mt-2 space-y-2 max-h-56 overflow-y-auto">
                      {callTranscript.length === 0 ? (
                        <div className="text-[11px] text-text-secondary/80">{t('call.ui.transcriptNoYetShort')}</div>
                      ) : (
                        callTranscript.slice(-120).map((l) => (
                          <div key={l.id} className="text-[11px]">
                            <div className="text-[10px] text-text-secondary">
                              {new Date(l.at).toLocaleTimeString()} ·{' '}
                              {l.from === 'me' ? t('call.ui.speakerYou') : t('call.ui.speakerPeer')}{' '}
                              {l.lang ? `· ${l.lang}` : ''}
                            </div>
                            <div className="text-text-primary whitespace-pre-wrap break-words">{l.translated ? l.translated : l.text}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCallSummary && callSummaryText && (
        <div className="fixed inset-0 z-[260] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background-light border border-background-medium rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-background-medium/70">
              <div className="text-sm font-semibold text-text-primary">
                {t('call.summary.title')}
              </div>
              <button
                type="button"
                className="p-2 hover:bg-background-light rounded-full transition-colors"
                aria-label={t('call.summary.closeAria')}
                onClick={() => setShowCallSummary(false)}
              >
                ✕
              </button>
            </div>
            <div className="p-4 whitespace-pre-wrap text-sm text-text-primary">
              {callSummaryText}
            </div>
            <div className="px-4 py-3 border-t border-background-medium/70">
              <button
                type="button"
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:opacity-95 transition-opacity text-sm"
                onClick={() => setShowCallSummary(false)}
              >
                {t('common.ok')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-background-medium border-b border-background-light shrink-0">
        {parentDiscussion?.parentChatId ? (
          <button
            type="button"
            onClick={() => navigate(`/chat/${parentDiscussion.parentChatId}`)}
            className="p-2 hover:bg-background-light rounded-full transition-colors"
            aria-label={t('chat.navigation.backToParentChat')}
            title={t('common.back')}
          >
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="md:hidden p-2 hover:bg-background-light rounded-full transition-colors"
            aria-label={t('chat.navigation.backToChats')}
          >
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </button>
        )}

        <div className="relative shrink-0 w-10 h-10">
          {mediaUrl(info.avatar) && !peerHeaderAvatarFailed ? (
            <button
              type="button"
              onClick={openHeader}
              className="rounded-full w-10 h-10 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <img
                src={mediaUrl(info.avatar)}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setPeerHeaderAvatarFailed(true)}
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={openHeader}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="text-lg font-semibold text-white">{info.title.charAt(0).toUpperCase()}</span>
            </button>
          )}
          {info.isOnline && (
            <div className="absolute right-0.5 bottom-0.5 w-2.5 h-2.5 bg-status-online rounded-full pointer-events-none shadow-[0_0_0_2px_rgba(255,255,255,0.08)]" />
          )}
        </div>

        <button
          type="button"
          onClick={openHeader}
          className="flex-1 min-w-0 text-left"
        >
          <h2 className="font-semibold text-text-primary truncate">{info.title}</h2>
          <p className="text-xs text-text-secondary truncate">{subtitleText()}</p>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowChatSearch((v) => !v);
              if (showChatSearch) {
                setMessageSearchQuery('');
                setChatSearchFilter('all');
              }
            }}
            className="p-2 hover:bg-background-light rounded-full transition-colors"
            aria-label={t('chat.navigation.searchInChat')}
            title={t('chat.navigation.searchInChat')}
          >
            <Search className="w-5 h-5 text-text-secondary" />
          </button>
          {currentChat?.type === 'PRIVATE' && (
            <>
              <button
                type="button"
                onClick={() => void startCallerCall('audio')}
                disabled={Boolean(callUi) || !socket.connected && !accessToken}
                className="p-2 hover:bg-background-light rounded-full transition-colors disabled:opacity-50"
                aria-label={t('chat.navigation.voiceCall')}
                title={t('chat.navigation.voiceCall')}
              >
                <Phone className="w-5 h-5 text-text-secondary" />
              </button>
              <button
                type="button"
                onClick={() => void startCallerCall('video')}
                disabled={Boolean(callUi) || !socket.connected && !accessToken}
                className="p-2 hover:bg-background-light rounded-full transition-colors disabled:opacity-50"
                aria-label={t('chat.navigation.videoCall')}
                title={t('chat.navigation.videoCall')}
              >
                <Video className="w-5 h-5 text-text-secondary" />
              </button>
            </>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setMenuPanel('main');
                setShowMenu(!showMenu);
              }}
              className="p-2 hover:bg-background-light rounded-full transition-colors"
              aria-label={t('chat.navigation.chatMenu')}
            >
              <MoreVertical className="w-5 h-5 text-text-secondary" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => {
                    setShowMenu(false);
                    setMenuPanel('main');
                  }}
                  aria-hidden
                />
                <div className="absolute right-0 top-full mt-2 w-60 bg-background-light rounded-xl shadow-xl z-20 py-1 animate-scale-in border border-background-medium/80">
                  {menuPanel === 'main' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setShowChatSearch(true);
                        }}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                      >
                        <Search className="w-4 h-4 shrink-0" />
                        {t('chat.menu.searchInChat')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMenuPanel('mute')}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                      >
                        <BellOff className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{t('chat.menu.muteNotifications')}</span>
                        <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
                      </button>
                      {muted && chatId && (
                        <p className="px-4 pb-1 text-xs text-text-secondary" key={muteTick}>
                          {t('chat.menu.until').replace(
                            '{time}',
                            muteLabel(chatId) ?? t('call.ui.forever')
                          )}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setShowChatInfo(true);
                        }}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                      >
                        <Users className="w-4 h-4 shrink-0" />
                        {t('chat.menu.chatInfo')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setShowThemeModal(true);
                        }}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                      >
                        <Palette className="w-4 h-4 shrink-0" />
                        Chat theme / wallpaper
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setToast('Copying can be restricted in a future update.');
                        }}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                      >
                        <ShieldOff className="w-4 h-4 shrink-0" />
                        Restrict copying
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          exportChatHistory();
                        }}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        Export chat history
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          void handleClearHistory();
                        }}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                      >
                        <Paintbrush className="w-4 h-4 shrink-0" />
                        Clear history
                      </button>
                      {currentChat?.type !== 'PRIVATE' && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMenu(false);
                            setShowChatInfo(true);
                          }}
                          className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                        >
                          <Users className="w-4 h-4 shrink-0" />
                          Add members
                        </button>
                      )}

                      {(currentChat?.type === 'GROUP' || currentChat?.type === 'SUPERGROUP') && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMenu(false);
                            setShowPollModal(true);
                          }}
                          className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                        >
                          <BarChart3 className="w-4 h-4 shrink-0" />
                        {t('poll.new')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          void handleDeleteChat();
                        }}
                        className="w-full px-4 py-2.5 text-left text-status-danger hover:bg-background-medium flex items-center gap-3 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                        {t('chatSidebar.context.deleteChat')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setMenuPanel('main')}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium flex items-center gap-2 transition-colors text-sm border-b border-background-medium"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        {t('chat.menu.muteNotifications')}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMute('off')}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium text-sm"
                      >
                        {t('chat.menu.disableMute')}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMute('1h')}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium text-sm"
                      >
                        {t('chat.menu.mute1h')}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMute('8h')}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium text-sm"
                      >
                        {t('chat.menu.mute8h')}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMute('1w')}
                        className="w-full px-4 py-2.5 text-left text-text-primary hover:bg-background-medium text-sm"
                      >
                        {t('chat.menu.mute1w')}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMute('forever')}
                        className="w-full px-4 py-2.5 text-left text-status-danger hover:bg-background-medium text-sm"
                      >
                        {t('chat.menu.muteForever')}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showChatSearch && (
        <div className="px-4 py-2 bg-background-dark border-b border-background-light shrink-0 space-y-2">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-text-secondary shrink-0" />
            <input
              type="search"
              value={messageSearchQuery}
              onChange={(e) => setMessageSearchQuery(e.target.value)}
              placeholder={t('chat.search.placeholder')}
              className="flex-1 min-w-0 bg-background-light rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary border border-transparent focus:border-primary"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setShowChatSearch(false);
                setMessageSearchQuery('');
                setChatSearchFilter('all');
              }}
              className="p-2 hover:bg-background-light rounded-full"
              aria-label={t('chat.search.close')}
            >
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'all' as const, label: t('chat.search.filter.all') },
                { id: 'IMAGE' as const, label: t('chat.search.filter.photo') },
                { id: 'VIDEO' as const, label: t('chat.search.filter.video') },
                { id: 'FILE' as const, label: t('chat.search.filter.files') },
                { id: 'VOICE' as const, label: t('chat.search.filter.voice') },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setChatSearchFilter(chip.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  chatSearchFilter === chip.id
                    ? 'bg-tg-link text-white'
                    : 'bg-background-light text-text-secondary hover:bg-background-medium'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={chatMessagesRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
        style={
          chatId && chatThemeId !== 'default'
            ? { backgroundColor: preset.wallpaper }
            : undefined
        }
      >
        {pinnedMessage && (
          <div className="sticky top-0 z-[40] flex items-center gap-3 bg-background-dark/90 backdrop-blur border border-background-light/50 rounded-2xl px-3 py-2">
            <div className="shrink-0 w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
              📌
            </div>
            <button
              type="button"
              className="flex-1 min-w-0 text-left"
              onClick={() => {
                const el = document.getElementById(`message-${pinnedMessage.messageId}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              <p className="text-xs text-text-secondary truncate">
                {t('message.pinned')} · {pinnedMessage.senderDisplayName}
              </p>
              <p className="text-sm text-text-primary truncate">
                {pinnedMessage.content?.trim() ||
                  (pinnedMessage.mediaUrl ? t('sidebar.attachment') : t('chat.message'))}
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!user?.id || !chatId) return;
                clearPinnedMessage(user.id, chatId);
                setPinVersion((n) => n + 1);
                setToast(t('toast.messageUnpinned'));
              }}
              className="px-3 py-2 rounded-xl bg-background-light hover:bg-background-medium text-sm text-text-primary transition-colors shrink-0"
            >
              {t('message.unpin')}
            </button>
          </div>
        )}
        {messageGroups.map((group) => (
          <div key={group.date}>
            <div className="flex items-center justify-center my-4">
              <span className="px-3 py-1 bg-background-medium rounded-full text-xs text-text-secondary">
                {isToday(new Date(group.date))
                  ? t('chat.today')
                  : isYesterday(new Date(group.date))
                    ? t('chat.yesterday')
                    : format(new Date(group.date), 'MMMM d, yyyy')}
              </span>
            </div>

            <div className="space-y-2">
              {group.messages.map((message, msgIndex) => {
                const isOutgoing = message.senderId === user?.id;
                const reactionEmoji = user?.id ? getReaction(user.id, message.id) : null;
                const discussionLinked = Boolean(user?.id && chatId && getDiscussionLink(user.id, chatId, message.id));
                const receipt =
                   isOutgoing && user ? getOutgoingReceipt(message, user.id) : null;
                const isPollMessage = Boolean(parsePollStub(message.content));
                const isLocationMessage = Boolean(parseLocationStub(message.content));
                const isRestrictedMessage = isPollMessage || isLocationMessage;
                const showAvatar =
                  !isOutgoing &&
                  (msgIndex === 0 || group.messages[msgIndex - 1]?.senderId !== message.senderId);

                const metaIncoming = 'text-[#c8d6e3]';
                const metaOutgoing = 'text-white/90';

                return (
                  <div
                    key={message.id}
                    id={`message-${message.id}`}
                    className="group relative"
                    onClick={(e) => {
                      if (selectedMessageIds.size === 0) return;
                      const target = e.target as HTMLElement | null;
                      if (!target) return;
                      if (target.closest('button,a,input,textarea,select,label,[role="button"],[role="menuitem"]')) return;
                      toggleSelectedMessage(message.id);
                    }}
                    onContextMenu={(e) => {
                      // Poll/location stubs should not be editable/copiable via message menu.
                      if (isRestrictedMessage) return;
                      e.preventDefault();
                      e.stopPropagation();
                      openMessageMenu(e, message);
                    }}
                  >
                    {selectedMessageIds.has(message.id) && (
                      <div className="absolute -top-2 -left-2 z-30 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
                    <div
                      className={`flex gap-2 ${isOutgoing ? 'justify-end' : 'justify-start items-end'} ${
                        showAvatar ? 'mt-4' : ''
                      }`}
                    >
                      {!isOutgoing && (
                        <div className="w-9 shrink-0 flex flex-col justify-end pb-0.5">
                          {showAvatar ? (
                            mediaUrl(message.sender.avatarUrl) ? (
                              <img
                                src={mediaUrl(message.sender.avatarUrl)}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                <span className="text-xs font-semibold text-white">
                                  {message.sender.displayName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="w-8 h-8 shrink-0" aria-hidden />
                          )}
                        </div>
                      )}
                    <div
                      className={`flex min-w-0 max-w-[calc(100%-2.5rem)] items-end gap-1 ${
                        isOutgoing ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div
                        className={`max-w-[min(72vw,100%)] md:max-w-[min(60vw,28rem)] min-w-0 ${
                          isOutgoing ? 'message-outgoing' : 'message-incoming'
                        }`}
                      >
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isOutgoing
                              ? 'bg-chat-outgoing rounded-br-md'
                              : 'bg-chat-incoming rounded-bl-md'
                          } ${
                            pinnedMessage?.messageId === message.id || highlightMessageId === message.id
                              ? 'ring-2 ring-primary/60'
                              : ''
                          } ${discussionLinked ? 'ring-2 ring-[#FF2B5E]/60' : ''}
                          }`}
                        >
                          {message.replyTo && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const replyId = message.replyTo?.id;
                                if (!replyId) return;
                                const el = document.getElementById(`message-${replyId}`);
                                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                setHighlightMessageId(replyId);
                                window.setTimeout(() => setHighlightMessageId(null), 1400);
                              }}
                              className={`border-l-2 pl-2 mb-2 text-left ${
                                isOutgoing ? 'border-white/25' : 'border-text-secondary/30'
                              } ${
                                isOutgoing
                                  ? 'bg-white/10 rounded-r-md py-1.5 pr-2'
                                  : 'bg-background-dark/35 rounded-r-md py-1.5 pr-2'
                              }`}
                              style={{ cursor: 'pointer' }}
                            >
                              <p
                                className={`text-xs ${isOutgoing ? 'text-white/90' : 'text-primary/90'}`}
                                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                              >
                                {message.replyTo.sender.displayName}
                              </p>
                              <p
                                className={`text-sm truncate ${isOutgoing ? 'text-white' : 'text-text-primary'}`}
                                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                              >
                                {(() => {
                                  const rt = message.replyTo;
                                  if (!rt) return '';
                                  if (rt.isDeleted) return t('chat.message.deleted');
                                  if (rt.content?.trim()) return rt.content.trim();
                                  const poll = parsePollStub(rt.content);
                                  if (poll) return t('chat.snippet.poll');
                                  const loc = parseLocationStub(rt.content);
                                  if (loc) return t('chat.snippet.location');
                                  if (rt.contentType === 'IMAGE' && rt.mediaUrl) return t('chat.snippet.drawing');
                                  if (rt.contentType === 'VIDEO' && rt.mediaUrl) return t('chat.search.filter.video');
                                  if (rt.contentType === 'AUDIO' || rt.contentType === 'VOICE') return t('chat.snippet.audio');
                                  if (rt.contentType === 'FILE' && rt.mediaUrl) return t('chat.snippet.file');
                                  return t('chat.snippet.message');
                                })()}
                              </p>
                            </button>
                          )}

                          {message.isDeleted ? (
                            <p className="text-text-secondary italic text-sm">{t('chat.message.deleted')}</p>
                          ) : (
                            <>
                              {message.mediaUrl && (
                                <div className="mb-2">
                                  {message.contentType === 'IMAGE' ? (
                                    <div className="relative inline-block max-w-full">
                                      <img
                                        src={mediaUrl(message.mediaUrl)}
                                        alt=""
                                        className="rounded-lg max-w-full max-h-64 object-contain block"
                                      />
                                      {(activeAnimsByMessageId[message.id]?.length ?? 0) > 0 && (
                                        <div className="draw-anim-layer">
                                          {activeAnimsByMessageId[message.id].map((a) => {
                                            const r = animRand(a.seed);
                                            const amp = a.intensity === 'high' ? 16 : a.intensity === 'low' ? 6 : 10;
                                            const dx = () => `${Math.round((r() * 2 - 1) * amp)}px`;
                                            const dy = () => `${Math.round((r() * 2 - 1) * amp)}px`;
                                            const style: React.CSSProperties = {
                                              // drift points
                                              ['--dx1' as any]: dx(),
                                              ['--dy1' as any]: dy(),
                                              ['--dx2' as any]: dx(),
                                              ['--dy2' as any]: dy(),
                                              ['--dx3' as any]: dx(),
                                              ['--dy3' as any]: dy(),
                                              ['--dx4' as any]: dx(),
                                              ['--dy4' as any]: dy(),
                                              ['--rollFrom' as any]: `${Math.round((r() * 2 - 1) * (amp + 6))}px`,
                                              ['--rollTo' as any]: `${Math.round((r() * 2 - 1) * (amp + 6))}px`,
                                              opacity: a.preset === 'glow' ? 0.8 : 0.55,
                                            };
                                            const cls =
                                              a.preset === 'glow'
                                                ? 'draw-anim-glow'
                                                : a.preset === 'bounce'
                                                  ? 'draw-anim-bounce'
                                                  : 'draw-anim-roll';
                                            return (
                                              <div
                                                key={a.instanceId}
                                                className={cls}
                                                style={style}
                                              />
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  ) : message.contentType === 'VIDEO' ? (
                                    <video
                                      src={mediaUrl(message.mediaUrl)}
                                      controls
                                      className="rounded-lg max-w-full max-h-64"
                                    />
                                  ) : message.contentType === 'VOICE' || message.contentType === 'AUDIO' ? (
                                    <audio
                                      src={mediaUrl(message.mediaUrl)}
                                      controls
                                      className="w-full max-w-[260px]"
                                    />
                                  ) : (
                                    <div className="flex items-center gap-2 p-2 bg-background-dark/50 rounded-lg">
                                      <File className="w-5 h-5 text-text-secondary shrink-0" />
                                      <span className="text-sm text-text-primary truncate">
                                        {message.content || t('chat.snippet.file')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {(() => {
                                const poll = parsePollStub(message.content);
                                if (poll) {
                                  return (
                                    <PollCard chatId={chatId ?? ''} pollId={poll.pollId} />
                                  );
                                }
                                const loc = parseLocationStub(message.content);
                                if (loc) {
                                  return (
                                    <div className="mt-2 rounded-xl overflow-hidden border border-background-medium/70 bg-background-dark/10">
                                      <div className="h-36 bg-[#0B1220] flex items-center justify-center">
                                        {/* Map placeholder for location messages */}
                                        <svg width="220" height="120" viewBox="0 0 220 120" fill="none" aria-hidden="true">
                                          <rect x="0" y="0" width="220" height="120" rx="14" fill="#0B1220" />
                                          <path
                                            d="M25 78 C55 38, 115 38, 145 83 C160 103, 173 110, 200 108"
                                            stroke="#60A5FA"
                                            strokeWidth="5"
                                            strokeLinecap="round"
                                          />
                                          <circle cx="110" cy="70" r="9" fill="#FF2B5E" fillOpacity="0.25" />
                                          <circle cx="110" cy="70" r="4" fill="#FF2B5E" />
                                        </svg>
                                      </div>
                                      <div className="px-3 py-2">
                                        <div className="text-sm font-semibold text-text-primary truncate">{loc.label}</div>
                                        <div className="text-xs text-text-secondary tabular-nums">
                                          {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                if (!message.content) return null;
                                return (
                                  <p
                                    className={`text-text-primary whitespace-pre-wrap break-words ${
                                      message.mediaUrl ? 'mt-2 text-sm opacity-90' : ''
                                    }`}
                                    style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                                  >
                                    {message.content}
                                  </p>
                                );
                              })()}
                              {reactionEmoji && (
                                <div className={`mt-2 ${isOutgoing ? 'flex justify-end' : 'flex justify-start'}`}>
                                  <span className="text-lg leading-none">{reactionEmoji}</span>
                                </div>
                              )}
                            </>
                          )}

                          <div
                            className={`flex items-center gap-1.5 mt-1.5 flex-wrap ${
                              isOutgoing ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {message.isEdited && (
                              <span
                                className={`text-xs ${isOutgoing ? metaOutgoing : metaIncoming}`}
                              >
                                (ред.)
                              </span>
                            )}
                            <span
                              className={`text-xs tabular-nums ${isOutgoing ? metaOutgoing : metaIncoming}`}
                            >
                              {formatMessageDate(message.createdAt)}
                            </span>
                            {isOutgoing && user && receipt && (
                              <span className="text-xs inline-flex items-center" title={receipt}>
                                {receipt === 'READ' ? (
                                  <CheckCheck className="w-4 h-4 text-[#b8e7ff]" />
                                ) : receipt === 'DELIVERED' ? (
                                  <CheckCheck className="w-4 h-4 text-white/75" />
                                ) : (
                                  <Check className="w-4 h-4 text-white/75" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                          <div
                            className={`relative flex shrink-0 items-center self-end pb-1 transition-opacity ${
                              showMessageMenu?.id === message.id
                                ? 'opacity-100'
                                : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
                            }`}
                          >
                          {!isRestrictedMessage && <div className="flex flex-row items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => setReplyingTo(message)}
                              className="p-1.5 hover:bg-background-light rounded-full transition-colors shrink-0"
                              aria-label={t('chat.menu.reply')}
                            >
                              <Reply className="w-4 h-4 text-text-secondary" />
                            </button>
                            {isOutgoing && (
                              <button
                                type="button"
                                onClick={() => handleEditMessage(message)}
                                className="p-1.5 hover:bg-background-light rounded-full transition-colors shrink-0"
                                aria-label={t('chat.menu.edit')}
                              >
                                <Edit className="w-4 h-4 text-text-secondary" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => openMessageMenu(e, message)}
                              className="p-1.5 hover:bg-background-light rounded-full transition-colors shrink-0"
                              aria-label={t('chat.menu.actions')}
                            >
                              <MoreVertical className="w-4 h-4 text-text-secondary" />
                            </button>
                          </div>}

                          {showMessageMenu?.id === message.id && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => {
                                  setShowMessageMenu(null);
                                  setReactionPickerMessageId(null);
                                }}
                                aria-hidden
                              />
                              <div
                                className={`absolute min-w-[11rem] bg-background-light rounded-lg shadow-xl z-[220] py-1 animate-scale-in ${
                                  isOutgoing ? 'right-0' : 'left-0'
                                } ${messageMenuPlacement === 'below' ? 'top-full mt-1' : 'bottom-full mb-1 top-auto'}`}
                              >
                              {!message.isDeleted && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingTo(message);
                                    setShowMessageMenu(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-medium flex items-center gap-2 transition-colors"
                                >
                                  <Reply className="w-4 h-4" />
                                  {t('chat.menu.reply')}
                                </button>
                              )}
                              {!message.isDeleted && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    toggleSelectedMessage(message.id);
                                    setShowMessageMenu(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-medium flex items-center gap-2 transition-colors"
                                >
                                  {selectedMessageIds.has(message.id) ? t('chat.menu.deselect') : t('chat.menu.select')}
                                </button>
                              )}
                              <div className="my-1 border-t border-background-medium/80" />
                              {!message.isDeleted && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveToSaved(message)}
                                  className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-medium flex items-center gap-2 transition-colors"
                                >
                                  <Bookmark className="w-4 h-4" />
                                  {t('chat.menu.saved')}
                                </button>
                              )}
                              {!message.isDeleted &&
                                (currentChat?.type === 'GROUP' || currentChat?.type === 'SUPERGROUP') && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleDiscussMessage(message);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-medium flex items-center gap-2 transition-colors"
                                  >
                                    <span className="text-base leading-none">💬</span>
                                    {t('message.discuss')}
                                  </button>
                                )}
                              {!message.isDeleted && (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePinMessage(message)}
                                  className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-medium flex items-center gap-2 transition-colors"
                                >
                                  <MapPin className="w-4 h-4" />
                                  {pinnedMessage?.messageId === message.id ? t('message.unpin') : t('message.pin')}
                                </button>
                              )}
                              {!message.isDeleted && message.contentType === 'IMAGE' && message.mediaUrl && (
                                <>
                                  <div className="my-1 border-t border-background-medium/80" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Start a random preset; multiple clicks => parallel instances.
                                      const presets: AnimPreset[] = ['glow', 'bounce', 'roll'];
                                      const preset = presets[Math.floor(Math.random() * presets.length)]!;
                                      startSyncedAnimation(message.id, preset);
                                      setShowMessageMenu(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-medium flex items-center gap-2 transition-colors"
                                  >
                                    <Sparkles className="w-4 h-4" />
                                    {t('chat.menu.animate')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      stopSyncedAnimations(message.id);
                                      setShowMessageMenu(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-background-medium flex items-center gap-2 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                    {t('chat.menu.animateStop')}
                                  </button>
                                </>
                              )}
                              {!message.isDeleted && message.content && !parsePollStub(message.content) && !parseLocationStub(message.content) && (
                                <button
                                  type="button"
                                  onClick={() => void handleCopyMessage(message)}
                                  className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-medium flex items-center gap-2 transition-colors"
                                >
                                  <Copy className="w-4 h-4" />
                                  {t('chat.menu.copyText')}
                                </button>
                              )}
                              {isOutgoing && (
                                <>
                                  <div className="my-1 border-t border-background-medium/80" />
                                  <button
                                    type="button"
                                    onClick={() => handleEditMessage(message)}
                                    className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-medium flex items-center gap-2 transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                    {t('chat.menu.edit')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMessage(message, true)}
                                    className="w-full px-3 py-2 text-left text-sm text-status-danger hover:bg-background-medium flex items-center gap-2 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    {t('chat.menu.delete')}
                                  </button>
                                </>
                              )}

                              {!message.isDeleted && user?.id && (
                                <>
                                  <div className="my-1 border-t border-background-medium/80" />
                                  <div className="px-3 py-2 flex items-center justify-center">
                                    <button
                                      ref={reactionButtonRef}
                                      type="button"
                                      onClick={() =>
                                        setReactionPickerMessageId((cur) =>
                                          cur === message.id ? null : message.id
                                        )
                                      }
                                      className="w-10 h-10 rounded-full bg-background-light hover:bg-background-medium flex items-center justify-center transition-colors"
                                      aria-label={t('chat.menu.reaction')}
                                      title={t('chat.menu.reaction')}
                                    >
                                      <Smile className="w-5 h-5 text-text-secondary" />
                                    </button>
                                    {reactionPickerMessageId === message.id && (
                                      <EmojiPicker
                                        open={true}
                                        onClose={() => setReactionPickerMessageId(null)}
                                        onPick={(emoji) => {
                                          setReaction(user.id, message.id, emoji);
                                          setReactionVersion((n) => n + 1);
                                          setReactionPickerMessageId(null);
                                          setShowMessageMenu(null);
                                        }}
                                        anchorRef={reactionButtonRef}
                                      />
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-text-secondary rounded-full typing-dot" />
              <span className="w-2 h-2 bg-text-secondary rounded-full typing-dot" />
              <span className="w-2 h-2 bg-text-secondary rounded-full typing-dot" />
            </div>
            <span>{t('chat.typing')}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {replyingTo && (
        <div className="px-4 py-2 bg-background-medium border-t border-background-light flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-primary">
                {t('chat.message.replyingTo').replace('{name}', replyingTo.sender.displayName)}
            </p>
            <p className="text-sm text-text-primary truncate">{replyingTo.content}</p>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:bg-background-light rounded-full transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {editingMessage && (
        <div className="px-4 py-2 bg-background-medium border-t border-background-light flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary">{t('chat.message.editingMessage')}</p>
            <p className="text-sm text-text-primary truncate">{editingMessage.content}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingMessage(null);
              setMessageInput('');
            }}
            className="p-1 hover:bg-background-light rounded-full transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <div className="p-4 bg-background-medium border-t border-background-light shrink-0 relative z-30">
        {activeMention && mentionMembers.length > 0 && (
          <div
            className="absolute bottom-full left-0 right-0 mb-2 max-h-52 overflow-y-auto rounded-xl border border-background-light bg-background-medium shadow-2xl py-1"
            role="listbox"
            aria-label={t('chat.mentions')}
          >
            {mentionFiltered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-text-secondary">{t('chat.noMatches')}</p>
            ) : (
              mentionFiltered.map((u, i) => (
                <button
                  key={u.id}
                  type="button"
                  role="option"
                  aria-selected={i === mentionPickIdx}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-tg-rowHover ${
                    i === mentionPickIdx ? 'bg-tg-rowActive' : ''
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickMention(u)}
                >
                  {mediaUrl(u.avatarUrl) ? (
                    <img src={mediaUrl(u.avatarUrl)} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/40 flex items-center justify-center text-xs font-semibold shrink-0">
                      {u.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="text-text-primary font-medium truncate block">{u.displayName}</span>
                    {u.username && (
                      <span className="text-xs text-text-secondary block truncate">@{u.username}</span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
        {pendingAttachments.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
            {pendingAttachments.map((p) => {
              const isImg = p.file.type.startsWith('image/');
              const isVid = p.file.type.startsWith('video/');
              const isAud = p.file.type.startsWith('audio/');
              return (
                <div
                  key={p.id}
                  className="relative shrink-0 w-16 h-16 rounded-lg border border-background-light bg-background-light overflow-hidden group"
                >
                  {isImg ? (
                    <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                  ) : isVid ? (
                    <video
                      src={p.previewUrl}
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : isAud ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-background-dark p-0.5">
                      <Mic className="w-6 h-6 text-tg-link shrink-0" />
                      <span className="text-[9px] text-text-secondary truncate w-full text-center leading-tight mt-0.5">
                        {p.file.name.replace(/\.[^.]+$/, '') || 'audio'}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-1">
                      <File className="w-8 h-8 text-text-secondary" />
                    </div>
                  )}
                  <button
                    type="button"
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-background-dark/80 text-text-primary opacity-90 hover:opacity-100"
                    onClick={() => removePendingAttachment(p.id)}
                    aria-label={t('chat.composer.removeAttachmentAria')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="relative flex-shrink-0" ref={attachMenuRef}>
            <button
              type="button"
              disabled={uploadBusy}
              onClick={() => {
                setShowEmojiPicker(false);
                setShowAttachMenu((v) => !v);
              }}
              className="p-2 hover:bg-background-light rounded-full transition-colors disabled:opacity-50"
              aria-label={t('composer.attachments')}
              title={t('composer.attachments')}
            >
              <Paperclip className="w-5 h-5 text-text-secondary" />
            </button>
            {showAttachMenu && (
              <div
                className="absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-background-light bg-background-medium shadow-2xl z-50 py-1 animate-scale-in"
                role="menu"
              >
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm text-text-primary hover:bg-background-light flex items-center gap-2"
                  onClick={() => {
                    setShowAttachMenu(false);
                    openFilePicker(attachFileRef);
                  }}
                >
                  <FolderOpen className="w-4 h-4 shrink-0 text-text-secondary" />
                  {t('composer.file')}
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm text-text-primary hover:bg-background-light flex items-center gap-2"
                  onClick={() => {
                    setShowAttachMenu(false);
                    setShowDrawModal(true);
                  }}
                >
                  <Paintbrush className="w-4 h-4 shrink-0 text-text-secondary" />
                  {t('composer.drawing')}
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm text-text-primary hover:bg-background-light flex items-center gap-2"
                  onClick={() => {
                    setShowAttachMenu(false);
                    setShowGeoModal(true);
                  }}
                >
                  <MapPin className="w-4 h-4 shrink-0 text-text-secondary" />
                  {t('composer.geolocation')}
                </button>

                {(currentChat?.type === 'GROUP' || currentChat?.type === 'SUPERGROUP') && (
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-sm text-text-primary hover:bg-background-light flex items-center gap-2"
                    onClick={() => {
                      setShowAttachMenu(false);
                      setShowPollModal(true);
                    }}
                  >
                    <BarChart3 className="w-4 h-4 shrink-0 text-text-secondary" />
                    {t('composer.poll')}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 relative min-w-0">
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={(e) => {
                const v = e.target.value;
                setMessageInput(v);
                setInputSel(e.target.selectionStart ?? v.length);
                if (v.length > 0) {
                  handleTypingStart();
                } else {
                  handleTypingStop();
                }
              }}
              onSelect={(e) => {
                setInputSel((e.target as HTMLTextAreaElement).selectionStart ?? 0);
              }}
              onClick={(e) => {
                setInputSel((e.target as HTMLTextAreaElement).selectionStart ?? 0);
              }}
              onKeyDown={(e) => {
                const cursor = inputRef.current?.selectionStart ?? messageInput.length;
                const m = parseActiveMention(messageInput, cursor);
                const filtered =
                  m && mentionMembers.length > 0
                    ? mentionMembers.filter(
                        (u) =>
                          u.displayName.toLowerCase().includes(m.query.toLowerCase()) ||
                          (u.username && u.username.toLowerCase().includes(m.query.toLowerCase()))
                      )
                    : [];
                if (m && filtered.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setMentionPickIdx((i) => Math.min(i + 1, filtered.length - 1));
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setMentionPickIdx((i) => Math.max(i - 1, 0));
                    return;
                  }
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const u = filtered[mentionPickIdx] ?? filtered[0];
                    if (u) pickMention(u);
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    return;
                  }
                }
                if (e.key !== 'Enter' || e.shiftKey) return;
                e.preventDefault();
                if (uploadBusy) return;
                if (messageInput.trim() || editingMessage || pendingAttachments.length > 0) {
                  void handleSendMessage();
                }
              }}
              onBlur={handleTypingStop}
              placeholder={t('chat.composer.placeholder')}
              rows={1}
              className="w-full px-4 py-2.5 bg-background-light rounded-lg border border-transparent focus:border-primary text-text-primary placeholder-text-secondary resize-none max-h-[7.5rem] transition-colors leading-6"
              style={{
                height: 'auto',
                minHeight: '42px',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                const maxScroll = 24 * 5;
                target.style.height = Math.min(target.scrollHeight, maxScroll) + 'px';
              }}
            />
          </div>

          <div className="relative flex-shrink-0">
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={() => {
                setShowAttachMenu(false);
                setShowEmojiPicker((v) => !v);
              }}
              className="p-2 hover:bg-background-light rounded-full transition-colors"
              aria-label={t('chat.emoji')}
              aria-expanded={showEmojiPicker}
            >
              <Smile className="w-5 h-5 text-text-secondary" />
            </button>
            <EmojiPicker
              open={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              onPick={insertEmoji}
              anchorRef={emojiButtonRef}
            />
          </div>

          <button
            type="button"
            onClick={() => void handleSendOrVoice()}
            disabled={uploadBusy && !isRecording}
            className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${
              isRecording
                ? 'bg-status-danger hover:opacity-90'
                : 'bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            title={
              messageInput.trim() || editingMessage || pendingAttachments.length > 0
                ? t('chat.composer.send')
                : isRecording
                  ? t('chat.composer.stopAndSend')
                  : t('chat.composer.recordVoice')
            }
            aria-label={
              messageInput.trim() || editingMessage || pendingAttachments.length > 0
                ? t('chat.composer.sendMessageAria')
                : isRecording
                  ? t('chat.composer.stopRecordingAria')
                  : t('chat.composer.recordVoiceMessageAria')
            }
          >
            {messageInput.trim() || editingMessage || pendingAttachments.length > 0 ? (
              <Send className="w-5 h-5 text-white" />
            ) : isRecording ? (
              <Square className="w-5 h-5 text-white fill-current" />
            ) : (
              <Mic className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>

      {showThemeModal && chatId && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/55 p-4">
          <div
            className="w-full max-w-lg rounded-2xl bg-background-medium border border-background-light shadow-2xl overflow-hidden animate-scale-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-theme-title"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-background-light">
              <h2 id="chat-theme-title" className="font-semibold text-text-primary">
                {t('chat.theme.choose')}
              </h2>
              <button
                type="button"
                onClick={() => setShowThemeModal(false)}
                className="p-2 rounded-full hover:bg-background-light text-text-secondary"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto">
              {(Object.keys(CHAT_THEME_PRESETS) as ChatThemeId[]).map((id) => {
                const theme = CHAT_THEME_PRESETS[id];
                const selected = chatThemeId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setChatTheme(chatId, id);
                      setShowThemeModal(false);
                      setToast(t('chat.toast.themeApplied'));
                    }}
                    className={`rounded-xl border-2 p-3 text-left transition-colors ${
                      selected ? 'border-tg-link ring-2 ring-tg-link/40' : 'border-background-light hover:bg-background-light'
                    }`}
                  >
                    <div className="flex gap-1 mb-2 h-8 rounded overflow-hidden">
                      <div className="flex-1" style={{ background: theme.outgoing }} />
                      <div className="flex-1" style={{ background: theme.incoming }} />
                    </div>
                    <p className="text-sm text-text-primary font-medium">{theme.name}</p>
                  </button>
                );
              })}
            </div>
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => {
                  setChatTheme(chatId, 'default');
                  setShowThemeModal(false);
                  setToast(t('chat.toast.defaultTheme'));
                }}
                className="w-full py-2.5 text-tg-link text-sm font-medium hover:underline"
              >
                {t('chat.theme.resetDefault')}
              </button>
            </div>
          </div>
        </div>
      )}

      <PollCreateModal
        chatId={chatId ?? ''}
        open={showPollModal}
        onClose={() => setShowPollModal(false)}
      />

      <GeoPickerModal
        open={showGeoModal}
        onClose={() => setShowGeoModal(false)}
        onPick={(choice) => void sendLocationMessage(choice)}
      />

      <DrawMessageModal
        open={showDrawModal}
        onClose={() => setShowDrawModal(false)}
        onSend={(blob) => void sendDrawingAsImage(blob)}
      />

      {showChatInfo && currentChat && (
        <ChatInfoModal
          chat={currentChat}
          currentUserId={user?.id}
          onClose={() => setShowChatInfo(false)}
          onOpenProfile={(uid) => {
            setShowChatInfo(false);
            navigate(`/profile/${uid}`);
          }}
          onChatUpdated={(c) => {
            updateChat(c.id, c);
            void fetchChat(c.id);
          }}
        />
      )}
    </div>
  );
}
