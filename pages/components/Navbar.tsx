import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const Navbar = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail");

    if (userEmail) {
      setUserEmail(userEmail);
    }
  }, []);

  const handleLogout = () => {
    // Clear all local storage
    localStorage.clear();
    setUserEmail(null);
    router.push("/");
  };

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
            {userEmail ? (
              <>
                <span className="mr-4">Hello, {userEmail}</span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button className="mr-4 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  <Link href="/auth/sign-up">Sign Up</Link>
                </button>
                <button className=" bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium">
                  <Link href="/auth/login">Login</Link>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
