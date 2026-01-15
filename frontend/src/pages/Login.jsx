import { useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = async (e) => {
    e.preventDefault();
    try {
      await api.post("/login", { username, password });
      nav("/"); // ✅ go dashboard directly
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5 bg-cover bg-center"
      style={{
        backgroundImage: "url('/bg1.jpg')", // ✅ put bg.jpg inside frontend/public
      }}
    >
      {/* ✅ Dark overlay for better UI */}
      <div className="absolute inset-0 bg-black/40"></div>

      <form
        onSubmit={login}
        className="relative z-10 bg-white/90 backdrop-blur shadow-2xl rounded-2xl p-6 w-full max-w-sm grid gap-3"
      >
        <h1 className="text-2xl font-bold text-center text-black">
          Admin Login
        </h1>

        {/* ✅ Username */}
        <input
          className="border rounded-xl p-2 bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        {/* ✅ Password */}
        <input
          className="border rounded-xl p-2 bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="bg-black text-white rounded-xl py-2 font-bold hover:bg-gray-900 transition">
          Login
        </button>
      </form>
    </div>
  );
}
