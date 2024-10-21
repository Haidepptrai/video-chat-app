import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";

const Navbar = () => {
  const { data: session, status } = useSession(); // Get the authentication session

  return (
    <nav className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link className="text-xl font-bold" href="/">
              Video/Audio Chat
            </Link>

            {/* Navigation links */}
            <div className="ml-10 space-x-4">
              <Link
                className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                href="/"
              >
                Home
              </Link>
              <Link
                className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                href="/chat"
              >
                Chat
              </Link>
            </div>
          </div>

          {/* Login / Logout button */}
          <div>
            {status === "loading" ? (
              <p>Loading...</p>
            ) : session ? (
              <>
                <span className="mr-4">
                  Hello, {session.user?.name || "User"}
                </span>
                <button
                  onClick={() => signOut()}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
