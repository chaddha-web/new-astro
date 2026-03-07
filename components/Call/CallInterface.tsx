
import React, { useState, useEffect, useRef } from 'react';
import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { AGORA_APP_ID, AGORA_TEMP_TOKEN } from '../../constants';

interface CallInterfaceProps {
  partnerName: string;
  partnerImage: string;
  callType: 'voice' | 'video';
  channelName?: string;
  onEndCall: (duration: number) => void;
}

const CallInterface: React.FC<CallInterfaceProps> = ({ partnerName, partnerImage, callType, channelName, onEndCall }) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'voice');
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [isSimulation, setIsSimulation] = useState(false);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const agoraRef = useRef<any>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const remoteContainerRef = useRef<HTMLDivElement>(null);
  const localVideoContainerRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    let timer: any;
    if (callStatus === 'connected') {
        timer = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  // Agora Initialization
  useEffect(() => {
    const initAgora = async () => {
      try {
        // Dynamic Import Agora SDK
        const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');
        agoraRef.current = AgoraRTC;
        
        // Hide Agora Logs
        AgoraRTC.setLogLevel(4); 

        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        // User Published Event
        client.on('user-published', async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            console.log("Subscribed to user", user.uid);
            
            if (mediaType === 'video') {
                setRemoteUsers(prev => [...prev, user]);
            }
            if (mediaType === 'audio') {
                user.audioTrack?.play();
            }
        });

        client.on('user-unpublished', (user) => {
            console.log("User unpublished", user.uid);
            setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        });

        const channel = channelName || 'test_channel';
        // USE TEMP TOKEN IF PROVIDED, OTHERWISE NULL
        const token = AGORA_TEMP_TOKEN || null;
        
        const uid = await client.join(AGORA_APP_ID, channel, token, null);
        console.log("Joined channel", channel, "as", uid);

        // Create Local Tracks
        localAudioTrackRef.current = await agoraRef.current.createMicrophoneAudioTrack();
        
        if (callType === 'video') {
            localVideoTrackRef.current = await agoraRef.current.createCameraVideoTrack();
        }

        // Publish
        const tracks = [];
        if (localAudioTrackRef.current) tracks.push(localAudioTrackRef.current);
        if (localVideoTrackRef.current) tracks.push(localVideoTrackRef.current);
        
        if (tracks.length > 0) {
            await client.publish(tracks);
            setCallStatus('connected');
        }

        // Play local video
        if (localVideoTrackRef.current && localVideoContainerRef.current) {
            localVideoTrackRef.current.play(localVideoContainerRef.current);
        }

      } catch (err: any) {
        // console.error("Agora Init Error:", err); // Keep essential error logs if needed, but suppressed by level 4 generally
        
        // --- SIMULATION FALLBACK MODE ---
        // If the error is specific to missing Token/Certificate mismatch, we fallback to a "Demo Mode"
        // so the user can still test the UI interactions.
        if (err.code === "CAN_NOT_GET_GATEWAY_SERVER" || err.code === "INVALID_TOKEN") {
             console.warn("Falling back to Simulation Mode for Demo Purposes");
             setIsSimulation(true);
             setCallStatus('connected');
             
             // Try to still get local camera for realism even if connection failed
             try {
                if (callType === 'video' && !localVideoTrackRef.current) {
                    localVideoTrackRef.current = await agoraRef.current.createCameraVideoTrack();
                    if (localVideoContainerRef.current && localVideoTrackRef.current) localVideoTrackRef.current.play(localVideoContainerRef.current);
                }
             } catch(e) { console.error("Could not even get local video for sim", e); }
             
             return;
        } else {
             alert("Failed to connect to call service. Please check your internet or camera/mic permissions.");
             onEndCall(0);
        }
      }
    };

    if (callStatus !== 'ended') {
        initAgora();
    }

    return () => {
        // Cleanup
        if (localAudioTrackRef.current) {
            localAudioTrackRef.current.stop();
            localAudioTrackRef.current.close();
        }
        if (localVideoTrackRef.current) {
            localVideoTrackRef.current.stop();
            localVideoTrackRef.current.close();
        }
        if (clientRef.current) {
            clientRef.current.leave();
        }
    };
  }, []);

  // Effect to play remote video when user is added
  useEffect(() => {
      if (remoteUsers.length > 0 && remoteContainerRef.current) {
          const user = remoteUsers[0];
          if (user.videoTrack) {
              user.videoTrack.play(remoteContainerRef.current);
          }
      }
  }, [remoteUsers]);

  // Toggle Mute
  const toggleMute = async () => {
      if (isSimulation) {
          setIsMuted(!isMuted);
          return;
      }
      if (localAudioTrackRef.current) {
          await localAudioTrackRef.current.setMuted(!isMuted);
          setIsMuted(!isMuted);
      }
  };

  // Toggle Video
  const toggleVideo = async () => {
      if (isSimulation) {
          setIsVideoOff(!isVideoOff);
           // Toggle local track play/stop for realism in sim
           if (localVideoTrackRef.current) {
               if (!isVideoOff) localVideoTrackRef.current.stop(); // If turning off
               else if (localVideoContainerRef.current) localVideoTrackRef.current.play(localVideoContainerRef.current); // If turning on
           }
          return;
      }
      if (localVideoTrackRef.current) {
          await localVideoTrackRef.current.setEnabled(isVideoOff); 
          setIsVideoOff(!isVideoOff);
      } else if (!localVideoTrackRef.current && !isVideoOff && agoraRef.current) {
          try {
              const videoTrack = await agoraRef.current.createCameraVideoTrack();
              localVideoTrackRef.current = videoTrack;
              if (clientRef.current) await clientRef.current.publish(videoTrack);
              if (localVideoContainerRef.current) videoTrack.play(localVideoContainerRef.current);
              setIsVideoOff(false);
          } catch (e) {
              console.error("Failed to enable video", e);
          }
      }
  };

  const handleHangup = async () => {
      setCallStatus('ended');
      if (localAudioTrackRef.current) localAudioTrackRef.current.close();
      if (localVideoTrackRef.current) localVideoTrackRef.current.close();
      if (clientRef.current && !isSimulation) await clientRef.current.leave();
      
      // Pass the current duration to the callback
      setTimeout(() => {
          onEndCall(duration);
      }, 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const safeImage = partnerImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col animate-in fade-in duration-300 font-sans">
      
      {/* REMOTE STREAM AREA */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-mystic-900">
         {/* If no remote video, show placeholder */}
         <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${remoteUsers.length > 0 && remoteUsers[0].videoTrack ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex flex-col items-center z-10">
                 <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full border-4 shadow-[0_0_50px_rgba(234,179,8,0.3)] overflow-hidden mb-6 ${callStatus === 'ended' ? 'border-red-500 grayscale' : 'border-gold-500/50 animate-pulse'}`}>
                    <img src={safeImage} alt={partnerName} className="w-full h-full object-cover" />
                 </div>
                 <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{partnerName}</h2>
                 
                 {callStatus === 'connecting' && <p className="text-mystic-400 uppercase tracking-widest text-xs animate-pulse">Connecting to Channel...</p>}
                 {callStatus === 'connected' && remoteUsers.length === 0 && !isSimulation && <p className="text-mystic-400 text-sm animate-pulse">Waiting for remote stream...</p>}
                 {isSimulation && callStatus === 'connected' && <p className="text-yellow-400 text-xs bg-yellow-900/30 px-2 py-1 rounded border border-yellow-500/20 mb-2">⚠ Demo Simulation Mode</p>}
                 {callStatus === 'connected' && <p className="text-gold-400 font-mono text-xl mt-2">{formatTime(duration)}</p>}
                 {callStatus === 'ended' && <p className="text-red-500 text-3xl font-bold">Call Ended</p>}
            </div>
            {/* Background blurred image */}
            <img src={safeImage} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl" />
         </div>

         {/* Actual Remote Video Container */}
         <div 
            ref={remoteContainerRef} 
            className={`absolute inset-0 w-full h-full ${remoteUsers.length > 0 ? 'z-0' : '-z-10'}`} 
            style={{ display: remoteUsers.length > 0 ? 'block' : 'none' }}
         ></div>
      </div>

      {/* LOCAL VIDEO PIP */}
      <div 
        className={`absolute top-4 right-4 w-32 h-48 bg-black rounded-xl border border-white/20 shadow-xl overflow-hidden z-20 transition-all duration-300 ${isVideoOff || callStatus === 'ended' ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'}`}
      >
         <div ref={localVideoContainerRef} className="w-full h-full object-cover"></div>
      </div>

      {/* CONTROLS */}
      {callStatus !== 'ended' && (
        <div className="absolute bottom-10 left-0 right-0 z-30 flex justify-center items-center gap-6 animate-in slide-in-from-bottom-10">
            <button 
                onClick={toggleMute}
                className={`p-4 rounded-full backdrop-blur-md border transition-all ${isMuted ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
            >
                {isMuted ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2v-7a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v7a2 2 0 01-2 2H5z" /></svg>
                )}
            </button>

            <button 
                onClick={handleHangup}
                className="p-5 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-500 transform hover:scale-110 transition-all"
            >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
            </button>

            <button 
                onClick={toggleVideo}
                className={`p-4 rounded-full backdrop-blur-md border transition-all ${isVideoOff ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
            >
                {isVideoOff ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                )}
            </button>
        </div>
      )}
    </div>
  );
};

export default CallInterface;
