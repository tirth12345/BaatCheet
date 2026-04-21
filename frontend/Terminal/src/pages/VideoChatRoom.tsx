import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SimplePeer from 'simple-peer';
import { socket } from '../socket';
import './VideoChatRoom.css';

interface Participant {
  socketId: string;
  userName: string;
  peer?: SimplePeer.Instance;
  stream?: MediaStream;
}

interface ChatMessage {
  userName: string;
  message: string;
  timestamp: Date;
  isVoiceTranscribed: boolean;
}

// Helper function to get the physical camera device
async function getPhysicalCameraDevice() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    if (videoDevices.length === 0) {
      console.warn('No video devices found');
      return undefined;
    }

    // Filter out virtual cameras (OBS, virtual camera apps, etc.)
    const physicalCameras = videoDevices.filter(device => {
      const label = device.label.toLowerCase();
      // Exclude known virtual camera indicators
      const isVirtual = 
        label.includes('obs') ||
        label.includes('virtual') ||
        label.includes('dummy') ||
        label.includes('screen') ||
        label.includes('xsplit');
      return !isVirtual;
    });

    // Return the first physical camera, or fallback to first available
    return physicalCameras.length > 0 ? physicalCameras[0].deviceId : videoDevices[0].deviceId;
  } catch (error) {
    console.error('Error enumerating devices:', error);
    return undefined;
  }
}

export default function VideoChatRoom() {
  const { roomId } = useParams<{ roomId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State management
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showWarning, setShowWarning] = useState<string | null>(null);

  // Refs
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<Map<string, { peer: SimplePeer.Instance; stream: MediaStream | null }>>(new Map());
  const processingPeersRef = useRef<Set<string>>(new Set());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isSocketInitializedRef = useRef(false);
  const timerIntervalRef = useRef<number | null>(null);

  // Sync stream to video element when it mounts after loading state
  useEffect(() => {
    if (myVideoRef.current && myStream) {
      myVideoRef.current.srcObject = myStream;
    }
  }, [myStream, loading]);

  // Initialize user and get media, then connect socket
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    if (!roomId) {
      setError('Invalid room ID');
      return;
    }

    // Initialize media stream
    const initializeMedia = async () => {
      try {
        setLoading(true);
        
        // Get physical camera device ID
        const cameraDeviceId = await getPhysicalCameraDevice();
        
        // Build constraints with physical camera preference
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        };

        // Add device ID if found — use 'ideal' instead of 'exact' to avoid
        // hard failure if the specific device is unavailable
        if (cameraDeviceId) {
          (constraints.video as any).deviceId = { ideal: cameraDeviceId };
          console.log('Using camera device:', cameraDeviceId);
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (camErr) {
          // Fallback: try without specific device constraint
          console.warn('Camera device failed, trying default:', camErr);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        }

        setMyStream(stream);
        streamRef.current = stream;

        console.log('Media stream ready, connecting socket...');

        // Connect socket AFTER stream is ready so handlers can use streamRef.current
        if (!socket.connected) {
          socket.connect();
        } else {
          // Socket was already connected (e.g. reconnection), manually emit join
          socket.emit('join-room', {
            roomId: roomId,
            userId: user!.id,
            userName: user!.username || 'Anonymous',
          });
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error accessing media:', err);
        setError('Unable to access camera/microphone. Please check permissions.');
        setLoading(false);
      }
    };

    initializeMedia();

    return () => {
      // Cleanup media stream and all connections
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }

      // Leave room and cleanup peers
      if (roomId) {
        socket.emit('leave-room', { roomId: roomId });
      }
      
      peersRef.current.forEach((peerConn) => {
        try {
          peerConn.peer.destroy();
        } catch (err) {
          console.error('Error destroying peer:', err);
        }
      });
      peersRef.current.clear();
      setParticipants([]);
      
      // Disconnect socket with guard
      if (socket.connected) {
        socket.disconnect();
      }
      isSocketInitializedRef.current = false;

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [user, roomId, navigate]);

  // Setup socket event handlers
  useEffect(() => {
    if (!roomId || !user) return;

    // Prevent duplicate handler registration
    if (isSocketInitializedRef.current) return;
    isSocketInitializedRef.current = true;

    // NOTE: We use streamRef.current (not a captured const) inside all handlers
    // so that we always reference the live stream, even if it wasn't ready
    // when the useEffect first ran.

    // Handle connect
    socket.on('connect', () => {
      console.log('Connected to socket server');

      // Join room
      socket.emit('join-room', {
        roomId: roomId,
        userId: user.id,
        userName: user.username || 'Anonymous',
      });
    });

    // Handle errors
    socket.on('error', (errorMsg: string) => {
      console.error('Socket error:', errorMsg);
      setError(errorMsg);
    });

    // User joined
    socket.on('user-joined', (data) => {
      console.log('User joined:', data);
      const stream = streamRef.current;
      if (stream) {
        createPeerConnection(data.socketId, data.userName, false, stream);
      } else {
        console.warn('user-joined: local stream not ready yet');
      }
    });

    // Existing users
    socket.on('existing-users', (users) => {
      console.log('Existing users:', users);
      const stream = streamRef.current;
      if (stream) {
        users.forEach((userData: { socketId: string; userName: string }) => {
          createPeerConnection(userData.socketId, userData.userName, true, stream);
        });
      } else {
        console.warn('existing-users: local stream not ready yet');
      }
    });

    // Incoming call
    socket.on('incoming-call', async (data) => {
      console.log('Incoming call from:', data.from_name);
      const stream = streamRef.current;
      if (stream) {
        handleIncomingCall(data, stream);
      } else {
        console.warn('incoming-call: local stream not ready yet');
      }
    });

    // Call answered
    socket.on('call-answered', (data) => {
      console.log('Call answered by:', data.from);
      const peerConnection = peersRef.current.get(data.from);
      if (peerConnection) {
        peerConnection.peer.signal(data.answer);
      }
    });

    // ICE candidate
    socket.on('ice-candidate', (data) => {
      const peerConnection = peersRef.current.get(data.from);
      if (peerConnection) {
        peerConnection.peer.signal(data.candidate);
      }
    });

    // User left
    socket.on('user-left', (data) => {
      console.log('User left:', data.socketId);
      if (data && data.socketId) {
        removePeerConnection(data.socketId);
      }
    });

    // Socket disconnected
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      // Clear all participants and peers when socket disconnects
      peersRef.current.forEach((peerConn) => {
        try {
          peerConn.peer.destroy();
        } catch (err) {
          console.error('Error destroying peer on disconnect:', err);
        }
      });
      peersRef.current.clear();
      setParticipants([]);
    });

    // Chat message
    socket.on('new-message', (data) => {
      const newMsg: ChatMessage = {
        userName: data.userName,
        message: data.message,
        timestamp: new Date(data.timestamp),
        isVoiceTranscribed: data.isVoiceTranscribed,
      };
      setMessages((prev) => [...prev, newMsg]);
    });

    // Room info (remaining time)
    socket.on('room-info', (data) => {
      console.log('Room info received:', data);
      const remainingMs = data.remainingTime;
      setRemainingSeconds(Math.floor(remainingMs / 1000));
      
      // Start local countdown
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev === null || prev <= 0) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    // Room warning (5 mins left)
    socket.on('room-warning', (data) => {
      setShowWarning(data.message);
      setTimeout(() => setShowWarning(null), 10000); // Hide after 10s
    });

    // Room expired
    socket.on('room-expired', () => {
      setSessionExpired(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    });

    // Cleanup event handlers
    return () => {
      socket.off('connect');
      socket.off('error');
      socket.off('user-joined');
      socket.off('existing-users');
      socket.off('incoming-call');
      socket.off('call-answered');
      socket.off('ice-candidate');
      socket.off('user-left');
      socket.off('disconnect');
      socket.off('new-message');
      socket.off('room-info');
      socket.off('room-warning');
      socket.off('room-expired');
    };
  }, [roomId, user]);

  // Create peer connection
  const createPeerConnection = (socketId: string, userName: string, initiator: boolean, stream: MediaStream) => {
    try {
      // Prevent duplicate processing
      if (processingPeersRef.current.has(socketId) || peersRef.current.has(socketId)) {
        console.log('Peer connection already exists or being created for:', socketId);
        return;
      }

      processingPeersRef.current.add(socketId);

      // Validate stream
      if (!stream || stream.getTracks().length === 0) {
        console.error('Invalid stream for peer connection:', socketId);
        processingPeersRef.current.delete(socketId);
        return;
      }

      console.log('Creating peer connection for:', socketId, 'initiator:', initiator);
      
      const peer = new SimplePeer({
        initiator: initiator,
        trickle: false,
        stream: stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      peer.on('signal', (signal) => {
        console.log('Sending signal to:', socketId);
        if (initiator) {
          socket.emit('call-user', {
            to: socketId,
            offer: signal,
          });
        } else {
          socket.emit('answer-call', {
            to: socketId,
            answer: signal,
          });
        }
      });

      peer.on('stream', (remoteStream) => {
        console.log('Received remote stream from:', userName);
        addParticipant(socketId, userName, remoteStream);
        peersRef.current.set(socketId, { peer, stream: remoteStream });
      });

      peer.on('error', (err) => {
        console.error('Peer error for', socketId, ':', err);
        peersRef.current.delete(socketId);
        processingPeersRef.current.delete(socketId);
      });

      // Store peer before stream is received
      peersRef.current.set(socketId, { peer, stream: null });
      processingPeersRef.current.delete(socketId);
      
      // Add participant before stream
      addParticipant(socketId, userName, null);
    } catch (error) {
      console.error('Error creating peer connection for', socketId, ':', error);
      processingPeersRef.current.delete(socketId);
    }
  };

  // Handle incoming call
  const handleIncomingCall = (data: any, stream: MediaStream) => {
    const peerConnection = peersRef.current.get(data.from);
    if (peerConnection) {
      peerConnection.peer.signal(data.offer);
    } else {
      createPeerConnection(data.from, data.from_name, false, stream);
      setTimeout(() => {
        const peer = peersRef.current.get(data.from);
        if (peer) {
          peer.peer.signal(data.offer);
        }
      }, 100);
    }
  };

  // Add participant
  const addParticipant = (socketId: string, userName: string, stream: MediaStream | null) => {
    setParticipants((prev) => {
      const exists = prev.find((p) => p.socketId === socketId);
      if (exists && stream) {
        return prev.map((p) => (p.socketId === socketId ? { ...p, stream } : p));
      } else if (!exists) {
        return [
          ...prev,
          {
            socketId,
            userName,
            stream: stream || undefined,
            peer: peersRef.current.get(socketId)?.peer,
          },
        ];
      }
      return prev;
    });
  };

  // Remove peer connection
  const removePeerConnection = (socketId: string) => {
    console.log('Removing peer connection for:', socketId);
    const peerConnection = peersRef.current.get(socketId);
    if (peerConnection) {
      try {
        peerConnection.peer.destroy();
      } catch (err) {
        console.error('Error destroying peer:', err);
      }
      peersRef.current.delete(socketId);
    }

    setParticipants((prev) => {
      const filtered = prev.filter((p) => p.socketId !== socketId);
      console.log('Participants after removal:', filtered.length);
      return filtered;
    });
  };

  // Toggle microphone
  const toggleMic = () => {
    if (myStream) {
      const audioTracks = myStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMicEnabled(!isMicEnabled);
    }
  };

  // Toggle camera
  const toggleCamera = () => {
    if (myStream) {
      const videoTracks = myStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCameraEnabled(!isCameraEnabled);
    }
  };

  // Start recording
  const startRecording = () => {
    if (!myStream) return;

    const mediaRecorder = new MediaRecorder(myStream);

    mediaRecorder.ondataavailable = (e) => {
      // Recording data available
      console.log('Recording chunk received:', e.data.size);
    };

    mediaRecorder.onstop = () => {
      console.log('Recording stopped');
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Start voice recognition
  const startVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          // Send final transcription as message
          if (socket && transcript) {
            socket.emit('send-voice-message', {
              message: transcript,
              roomId: roomId,
            });
          }
        } else {
          interimTranscript += transcript;
        }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  // Stop voice recognition
  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Send text message
  const sendMessage = (text: string) => {
    if (socket && text.trim()) {
      socket.emit('send-message', {
        message: text,
        roomId: roomId,
      });
    }
  };

  // Export PDF
  const exportPDF = () => {
    if (!roomId) return;
    const exportUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/video-rooms/${roomId}/export-pdf`;
    window.open(exportUrl, '_blank');
  };

  // Leave room
  const leaveRoom = () => {
    if (socket) {
      socket.emit('leave-room', { roomId });
      socket.disconnect();
    }

    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
    }

    peersRef.current.forEach(({ peer }) => {
      peer.destroy();
    });

    navigate('/video-chat');
  };

  if (loading) {
    return (
      <div className="video-chat-room">
        <div className="loading-spinner">Loading video chat...</div>
      </div>
    );
  }

  return (
    
    <div className="video-chat-room">
      {error && <div className="error-banner">{error}</div>}
      {showWarning && <div className="warning-banner">{showWarning}</div>}
      
      {sessionExpired && (
        <div className="modal-overlay">
          <div className="session-expired-modal">
            <h2>Session Ended</h2>
            <p>This 60-minute video chat session has automatically concluded.</p>
            <button onClick={() => navigate('/video-chat')}>Return to Lobby</button>
          </div>
        </div>
      )}

      {/* Timer Display */}
      {remainingSeconds !== null && (
        <div className={`session-timer ${remainingSeconds < 300 ? 'urgent' : ''}`}>
          Time Remaining: {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
        </div>
      )}

      <div className="video-container">
        {/* My video */}
        <div className="video-wrapper my-video">
          <video
            ref={myVideoRef}
            autoPlay
            muted
            playsInline
            className="video-element"
          />
          <div className="video-label">You</div>
          <div className="camera-status">
            {isCameraEnabled ? '📷' : '❌'}
          </div>
        </div>

        {/* Participant videos */}
        {participants.map((participant) => (
          <RemoteVideo key={participant.socketId} participant={participant} />
        ))}
      </div>

      {/* Controls */}
      <div className="controls">
        <button
          className={`control-btn ${!isMicEnabled ? 'disabled' : ''}`}
          onClick={toggleMic}
          title={isMicEnabled ? 'Mute' : 'Unmute'}
        >
          {isMicEnabled ? '🎤' : '🔇'}
        </button>

        <button
          className={`control-btn ${!isCameraEnabled ? 'disabled' : ''}`}
          onClick={toggleCamera}
          title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isCameraEnabled ? '📷' : '🚫'}
        </button>

        <button
          className={`control-btn ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? '⏹️' : '⏺️'}
        </button>

        <button
          className={`control-btn ${isListening ? 'listening' : ''}`}
          onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
          title={isListening ? 'Stop listening' : 'Start voice recognition'}
        >
          {isListening ? '🎙️' : '🎤'}
        </button>

        <button
          className="control-btn"
          onClick={() => setShowChat(!showChat)}
          title="Toggle chat"
        >
          💬
        </button>

        <button
          className="control-btn"
          onClick={exportPDF}
          title="Export Session PDF"
        >
          📄
        </button>

        <button
          className="control-btn leave"
          onClick={leaveRoom}
          title="Leave room"
        >
          ☎️
        </button>
      </div>

      {/* Chat panel */}
      {showChat && (
        <ChatPanel messages={messages} onSendMessage={sendMessage} />
      )}

      {/* Info panel */}
      <div className="info-panel">
        <div className="participant-count">
          Participants: {participants.length + 1}
        </div>
        {isRecording && <div className="recording-indicator">● Recording</div>}
        {isListening && <div className="listening-indicator">● Listening</div>}
      </div>
    </div>
  );
}

// Remote video component
function RemoteVideo({ participant }: { participant: Participant }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="video-wrapper remote-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="video-element"
      />
      <div className="video-label">{participant.userName}</div>
    </div>
  );
}

// Chat panel component
function ChatPanel({
  messages,
  onSendMessage,
}: {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">Chat</div>
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.isVoiceTranscribed ? 'voice' : ''}`}>
            <strong>{msg.userName}:</strong> {msg.message}
            {msg.isVoiceTranscribed && <span className="voice-badge">🎤</span>}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
