import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface VideoCallProps {
  targetUserId: string;
  targetUserName: string;
  onClose: () => void;
  isIncoming?: boolean;
  incomingOffer?: RTCSessionDescriptionInit;
}

export const VideoCall: React.FC<VideoCallProps> = ({
  targetUserId,
  targetUserName,
  onClose,
  isIncoming,
  incomingOffer
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const socket = useSocket();

  const iceConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Failed to get media devices:', err);
      throw err;
    }
  };

  const startCall = async () => {
    if (!socket) return;
    try {
      const stream = await startLocalStream();
      const pc = new RTCPeerConnection(iceConfig);
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setIsConnected(true);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('call:ice-candidate', { to: targetUserId, candidate: event.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call:offer', { to: targetUserId, offer });
    } catch (err) {
      console.error('Error starting video call:', err);
      setHasPermissionError(true);
    }
  };

  const answerCall = async () => {
    if (!incomingOffer || !socket) return;
    try {
      const stream = await startLocalStream();
      const pc = new RTCPeerConnection(iceConfig);
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setIsConnected(true);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('call:ice-candidate', { to: targetUserId, candidate: event.candidate });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      await flushIceCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call:answer', { to: targetUserId, answer });
    } catch (err) {
      console.error('Error answering video call:', err);
      setHasPermissionError(true);
    }
  };

  const flushIceCandidates = async () => {
    if (!pcRef.current) return;
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error flushing ICE candidate:', e);
        }
      }
    }
  };

  const endCall = () => {
    if (pcRef.current) {
      pcRef.current.close();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (socket) {
      socket.emit('call:end', { to: targetUserId });
    }
    onClose();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  useEffect(() => {
    if (!socket) return;

    if (isIncoming) {
      answerCall();
    } else {
      startCall();
    }

    socket.on('call:answered', async ({ answer }) => {
      if (pcRef.current && pcRef.current.signalingState !== 'stable') {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          await flushIceCandidates();
        } catch (e) {
          console.error('Error setting remote description:', e);
        }
      }
    });

    socket.on('call:ice-candidate', async ({ candidate }) => {
      if (pcRef.current && pcRef.current.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      } else {
        iceCandidatesQueue.current.push(candidate);
      }
    });

    socket.on('call:ended', () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      onClose();
    });

    return () => {
      socket.off('call:answered');
      socket.off('call:ice-candidate');
      socket.off('call:ended');
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [socket]);

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col items-center justify-center">
      <div className="relative w-full h-full max-w-5xl max-h-[80vh] bg-black rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
        {hasPermissionError ? (
          <div className="text-white text-center p-8 max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <VideoOff className="text-red-500" size={32} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Camera & Mic Access Required</h3>
            <p className="text-sm text-gray-400 mb-6">
              Nexus needs access to your camera and microphone to establish this video call. Please verify your browser's site permissions and try again.
            </p>
            <button onClick={endCall} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
              Close Call Screen
            </button>
          </div>
        ) : isConnected ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="text-white text-center">
            <div className="animate-pulse flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
                <Video className="text-primary-500 animate-bounce" size={32} />
              </div>
              <p className="text-lg font-medium">{isIncoming ? 'Connecting Call...' : `Calling ${targetUserName}...`}</p>
            </div>
          </div>
        )}

        {!hasPermissionError && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-4 right-4 w-44 h-32 rounded-lg border-2 border-white/20 object-cover shadow-lg bg-gray-900"
          />
        )}
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all ${
            isMuted ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
          }`}
          title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        <button
          onClick={endCall}
          className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all transform hover:scale-105"
          title="End Call"
        >
          <PhoneOff size={22} />
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-all ${
            isVideoOff ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
          }`}
          title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
        </button>
      </div>
    </div>
  );
};
