import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();

  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get("/me")
      .then((res) => {
        if (res.data?.logged_in) nav("/", { replace: true });
      })
      .catch(() => {});
  }, [nav]);

 
  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const login = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      await api.post("/login", { username, password });
      nav("/", { replace: true });
    } catch (e) {
      console.error(e);
      setErr("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-cover bg-center"
      style={{
        backgroundImage: "url('/bg1.jpg')",
        filter: "brightness(1.12) contrast(1.05)",
      }}
    >
      {/*  lighter overlay */}
      <div className="absolute inset-0 bg-black/20"></div>

      {/*  TOP BAR */}
      <div className="relative z-10 w-full px-6 py-5 flex items-center justify-between">
        {/* Left Title */}
        <div className="flex flex-col">
          <h1 className="text-white text-2xl font-extrabold tracking-wide drop-shadow">
            
          </h1>
          <p className="text-white/80 text-sm font-medium"></p>
        </div>

        {/* Right Login */}
        <div className="relative" ref={boxRef}>
          <button
            onClick={() => setOpen(!open)}
            className="text-white font-semibold px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition"
          >
            Login
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden origin-top-right transition-all duration-200 ease-out">
              {/* header */}
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h2 className="text-base font-bold text-gray-900">
                  Admin Login
                </h2>
              </div>

              {/* body */}
              <div className="p-4">
                <form onSubmit={login} className="grid gap-3">
                  <input
                    className="border rounded-xl p-2 bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                  />

                  <input
                    className="border rounded-xl p-2 bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  {err && <p className="text-sm text-red-600">{err}</p>}

                  <button
                    disabled={loading}
                    className="bg-blue-600 text-white rounded-xl py-2 font-bold hover:bg-blue-700 transition disabled:opacity-60"
                  >
                    {loading ? "Logging in..." : "Login"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* center text */}
      <div className="relative z-10 mt-16 px-6">
        <div className="max-w-xl">
          <h2 className="text-white text-4xl font-extrabold leading-tight drop-shadow">
            
          </h2>
          <p className="text-white/80 mt-3 text-base max-w-md">
          
          </p>
        </div>
      </div>
    </div>
  );
}
