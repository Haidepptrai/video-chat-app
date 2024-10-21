import { useRef, useState } from "react";

export default function ChatPage() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [email, setEmail] = useState("");
  const [searchedUser, setSearchedUser] = useState<{ email: string } | null>(
    null
  ); // Mock user search result
  const [isUserFound, setIsUserFound] = useState(false);

  const handleSearchEmail = () => {
    // Mock search logic - Replace this with a real search API call or logic
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

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
    // Logic to mute/unmute the audio stream goes here
    console.log(isMuted ? "Unmuting" : "Muting");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-5xl p-4">
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
        <div className="flex space-x-4 justify-center items-center">
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
            <h2 className="text-lg text-center mb-2">Remote Video</h2>
            <video
              ref={remoteVideoRef}
              className="w-full h-64 bg-gray-800 rounded-md"
              autoPlay
              playsInline
            />
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
              <button
                onClick={toggleMute}
                className={`${
                  isMuted ? "bg-gray-500" : "bg-blue-500"
                } text-white px-4 py-2 rounded-md hover:bg-blue-600`}
              >
                {isMuted ? "Unmute" : "Mute"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
