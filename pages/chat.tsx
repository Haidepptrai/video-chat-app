import { useEffect, useRef, useState } from "react";

// Helper function to generate unique client IDs
const generateUniqueId = (): string => {
  return crypto.randomUUID();
};

type WebSocketMessage = {
  action: string;
  data?: any;
  senderClientId?: string;
  targetClientId?: string;
  clients?: string[];
  roomId?: string;
  clientId?: string;
};

export default function ChatPage() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [email, setEmail] = useState("");
  const [searchedUser, setSearchedUser] = useState<{ email: string } | null>(
    null
  ); 
  
  // Mock user search result
  const [isUserFound, setIsUserFound] = useState(false);

  const handleSearchEmail = () => {
    // Mock search logic
    if (email === "user@example.com") {
      setSearchedUser({ email });
      setIsUserFound(true);
    } else {
      setSearchedUser(null);
      setIsUserFound(false);
    }
  };

  const handleStartCall = () => {
    if (!searchedUser) return;
    setIsCallActive(true);
    // Logic to initialize WebRTC connection with searchedUser's email goes here
    console.log(`Starting a call with ${searchedUser.email}`);
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    // Logic to end WebRTC connection goes here
    console.log("Call ended");
  };

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{
    [key: string]: MediaStream;
  }>({});
  const [isSocketOpen, setIsSocketOpen] = useState(false);
  const clientId = generateUniqueId();
  const roomId = "5"; // Static room ID, can be dynamically generated if needed
  const peerConnections: { [key: string]: RTCPeerConnection } = {}; // Peer connections
  let localStream: MediaStream | null = null;
  let socket: WebSocket | null = null;
  const messageQueue: string[] = [];

  const peerConnectionConfig: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    if (isCallActive) {
      initializeWebSocket();

      return () => {
        if (socket) socket.close();
        Object.values(peerConnections).forEach((pc) => pc.close());
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [isCallActive]);

  // Initialize WebSocket connection
  const initializeWebSocket = () => {
    socket = new WebSocket(
      "wss://x6mfeq38bg.execute-api.us-east-1.amazonaws.com/production/"
    );

    socket.onopen = () => {
      console.log("WebSocket connection opened");
      setIsSocketOpen(true);

      sendMessage({
        action: "join",
        roomId: roomId,
        clientId: clientId,
      });

      // Send queued messages
      while (messageQueue.length > 0) {
        if (socket) {
          socket.send(messageQueue.shift()!);
        }
      }
    };

    socket.onmessage = async (message) => {
      console.log("Received message:", message.data);
      let msg: WebSocketMessage;
      try {
        msg = JSON.parse(message.data);
      } catch (e) {
        console.error("Failed to parse message as JSON:", message.data);
        return;
      }

      const { action, data, senderClientId } = msg;

      if (senderClientId === clientId) return; // Ignore own messages

      switch (action) {
        case "joined":
          console.log("Joined room. Clients in room:", msg.clients);
          await ensureLocalStream();
          msg.clients?.forEach(async (existingClientId) => {
            if (existingClientId !== clientId) {
              await initializePeerConnection(existingClientId, true);
            }
          });
          break;
        case "new-peer":
          console.log("New peer joined:", senderClientId);
          await initializePeerConnection(senderClientId!, false);
          break;
        case "offer":
          await handleOffer(data as RTCSessionDescriptionInit, senderClientId!);
          break;
        case "answer":
          await handleAnswer(
            data as RTCSessionDescriptionInit,
            senderClientId!
          );
          break;
        case "candidate":
          await handleCandidate(data as RTCIceCandidateInit, senderClientId!);
          break;
        default:
          console.warn("Unknown action:", action);
          break;
      }
    };

    socket.onerror = (error) => console.error("WebSocket error:", error);

    socket.onclose = () => {
      console.log("WebSocket connection closed");
      setIsSocketOpen(false);
    };
  };

  // Ensure local stream is captured
  const ensureLocalStream = async (): Promise<void> => {
    if (!localStream) {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        console.log("Local stream obtained");
      } catch (error) {
        console.error("Error accessing media devices.", error);
      }
    }
  };

  const initializePeerConnection = async (
    remoteClientId: string,
    isInitiator: boolean
  ) => {
    await ensureLocalStream();

    const pc = new RTCPeerConnection(peerConnectionConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate to:", remoteClientId);
        sendMessage({
          action: "candidate",
          data: event.candidate,
          roomId: roomId,
          clientId: clientId,
          targetClientId: remoteClientId,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track from:", remoteClientId);
      setRemoteStreams((prevStreams) => ({
        ...prevStreams,
        [remoteClientId]: event.streams[0],
      }));
    };

    localStream
      ?.getTracks()
      .forEach((track) => pc.addTrack(track, localStream!));

    peerConnections[remoteClientId] = pc;

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log(
          "Created and set local description for offer to:",
          remoteClientId
        );

        sendMessage({
          action: "offer",
          data: offer,
          roomId: roomId,
          clientId: clientId,
          targetClientId: remoteClientId,
        });
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    }
  };

  const handleOffer = async (
    offer: RTCSessionDescriptionInit,
    senderClientId: string
  ) => {
    const pc = peerConnections[senderClientId];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log("Set remote description for offer from:", senderClientId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log(
          "Created and set local description for answer to:",
          senderClientId
        );

        sendMessage({
          action: "answer",
          data: answer,
          roomId: roomId,
          clientId: clientId,
          targetClientId: senderClientId,
        });
      } catch (error) {
        console.error("Error handling offer from:", senderClientId, error);
      }
    }
  };

  const handleAnswer = async (
    answer: RTCSessionDescriptionInit,
    senderClientId: string
  ) => {
    const pc = peerConnections[senderClientId];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("Set remote description for answer from:", senderClientId);
      } catch (error) {
        console.error("Error handling answer from:", senderClientId, error);
      }
    }
  };

  const handleCandidate = async (
    candidate: RTCIceCandidateInit,
    senderClientId: string
  ) => {
    const pc = peerConnections[senderClientId];
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("Added ICE candidate from:", senderClientId);
      } catch (error) {
        console.error(
          "Error adding ICE candidate from:",
          senderClientId,
          error
        );
      }
    }
  };

  const sendMessage = (message: WebSocketMessage) => {
    const fullMessage = { ...message, clientId };
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(fullMessage));
    } else {
      console.log("Queueing message:", fullMessage);
      messageQueue.push(JSON.stringify(fullMessage));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="w-[80%] p-5">
        <h1 className="text-3xl font-bold text-center mb-4">
          Video/Audio Chat
        </h1>

        {/* Email Search Section */}
        {!isCallActive && (
          <div className="mb-8">
            <h2 className="text-lg mb-2">Search for a User by Email</h2>
            <div className="flex space-x-4">
              <input
                type="email"
                placeholder="Enter user email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={handleSearchEmail}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Search
              </button>
            </div>

            {/* Search Result */}
            {searchedUser && isUserFound ? (
              <div className="mt-4 text-green-600">
                User found: {searchedUser.email}
              </div>
            ) : (
              email.length > 0 &&
              !isUserFound && (
                <div className="mt-4 text-red-600">User not found.</div>
              )
            )}
          </div>
        )}

        {/* Video Containers */}
        <div className="flex md:flex-row flex-col space-x-4 justify-center items-center">
          {/* Local Video */}
          <div className="w-1/2">
            <h2 className="text-lg text-center mb-2">Your Video</h2>
            <video
              ref={localVideoRef}
              className="w-full h-64 bg-gray-800 rounded-md"
              autoPlay
              muted
              playsInline
            />
          </div>

          {/* Remote Video */}
          <div className="w-1/2">
            {Object.keys(remoteStreams).map((clientId) => {
              const stream = remoteStreams[clientId];
              return stream?.active ? ( // Only render if the stream is active
                <div key={clientId}>
                  <h2 className="text-lg text-center mb-2">
                    Remote Video from {clientId}
                  </h2>
                  <video
                    ref={(video) => {
                      if (video && stream) {
                        video.srcObject = stream;
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-64 bg-gray-800 rounded-md"
                  />
                </div>
              ) : null; // If the stream is inactive, render nothing
            })}
          </div>
        </div>

        {/* Call Controls */}
        <div className="mt-8 flex justify-center space-x-4">
          {!isCallActive ? (
            searchedUser && isUserFound ? (
              <button
                onClick={handleStartCall}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
              >
                Start Call
              </button>
            ) : (
              <button
                disabled
                className="bg-gray-300 text-white px-4 py-2 rounded-md"
              >
                Start Call (Search for a user first)
              </button>
            )
          ) : (
            <>
              <button
                onClick={handleEndCall}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
              >
                End Call
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
