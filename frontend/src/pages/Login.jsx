// // // import { useEffect, useState } from "react";
// // // import { api } from "../api";
// // // import { useNavigate } from "react-router-dom";

// // // export default function Login() {
// // //   const nav = useNavigate();
// // //   const [username, setUsername] = useState("");
// // //   const [password, setPassword] = useState("");

// // //   // ✅ if already logged in, don't stay on login page
// // //   useEffect(() => {
// // //     api.get("/me")
// // //       .then((res) => {
// // //         if (res.data?.logged_in) nav("/", { replace: true });
// // //       })
// // //       .catch(() => {});
// // //   }, [nav]);

// // //   const login = async (e) => {
// // //     e.preventDefault();
// // //     try {
// // //       await api.post("/login", { username, password });
// // //       nav("/", { replace: true }); // ✅ go dashboard directly
// // //     } catch (e) {
// // //       console.error(e);
// // //     }
// // //   };

// // //   return (
// // //     <div
// // //       className="min-h-screen flex items-center justify-center p-5 bg-cover bg-center"
// // //       style={{
// // //         backgroundImage: "url('/bg1.jpg')",
// // //       }}
// // //     >
// // //       <div className="absolute inset-0 bg-black/40"></div>

// // //       <form
// // //         onSubmit={login}
// // //         className="relative z-10 bg-white/90 backdrop-blur shadow-2xl rounded-2xl p-6 w-full max-w-sm grid gap-3"
// // //       >
// // //         <h1 className="text-2xl font-bold text-center text-black">
// // //           Admin Login
// // //         </h1>

// // //         <input
// // //           className="border rounded-xl p-2 bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
// // //           placeholder="Username"
// // //           value={username}
// // //           onChange={(e) => setUsername(e.target.value)}
// // //         />

// // //         <input
// // //           className="border rounded-xl p-2 bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
// // //           placeholder="Password"
// // //           type="password"
// // //           value={password}
// // //           onChange={(e) => setPassword(e.target.value)}
// // //         />

// // //         <button className="bg-black text-white rounded-xl py-2 font-bold hover:bg-gray-900 transition">
// // //           Login
// // //         </button>
// // //       </form>
// // //     </div>
// // //   );
// // // }



// import { useEffect, useRef, useState } from "react";
// import { api } from "../api";
// import { useNavigate } from "react-router-dom";

// export default function Login() {
//   const nav = useNavigate();

//   const [open, setOpen] = useState(false); // ✅ dropdown open/close
//   const boxRef = useRef(null);

//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");

//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState("");

//   // ✅ if already logged in, don't stay on login page
//   useEffect(() => {
//     api
//       .get("/me")
//       .then((res) => {
//         if (res.data?.logged_in) nav("/", { replace: true });
//       })
//       .catch(() => {});
//   }, [nav]);

//   // ✅ close dropdown when click outside
//   useEffect(() => {
//     const handler = (e) => {
//       if (boxRef.current && !boxRef.current.contains(e.target)) {
//         setOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, []);

//   const login = async (e) => {
//     e.preventDefault();
//     setErr("");
//     setLoading(true);

//     try {
//       await api.post("/login", { username, password });
//       nav("/", { replace: true });
//     } catch (e) {
//       console.error(e);
//       setErr("Invalid username or password");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//   <div
//     className="relative h-screen w-screen overflow-hidden bg-cover bg-center"
//     style={{
//       backgroundImage: "url('/bg1.jpg')",
//       filter: "brightness(1.15) contrast(1.05)", // ✅ makes image bright
//     }}
//   >
//     {/* ✅ lighter overlay so image looks bright */}
//     <div className="absolute inset-0 bg-black/20"></div>

//     {/* ✅ TOP BAR + LOGIN button */}
//     ...
//   </div>
// );

//   // return (
//   //   <div
//   //     className="relative min-h-screen bg-cover bg-center"
//   //     style={{
//   //       backgroundImage: "url('/bg1.jpg')",
//   //     }}
//   //   >
//   //     {/* dark overlay */}
//   //     <div className="absolute inset-0 bg-black/40"></div>

//       {/* ✅ TOP BAR (Facebook style) */}
//       <div className="relative z-10 flex items-start justify-end p-6">
//         <div className="relative" ref={boxRef}>
//           {/* Small Login Button */}
//           <button
//             onClick={() => setOpen(!open)}
//             className="text-white font-semibold px-5 py-2 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-md transition"
//           >
//             Login
//           </button>

//           {/* Dropdown Box */}
//           {open && (
//             <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-200 p-4 animate-[fadeIn_0.15s_ease-in-out]">
//               <h2 className="text-lg font-bold text-gray-900 mb-3">
//                 Admin Login
//               </h2>

//               <form onSubmit={login} className="grid gap-3">
//                 <input
//                   className="border rounded-xl p-2 bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
//                   placeholder="Username"
//                   value={username}
//                   onChange={(e) => setUsername(e.target.value)}
//                   autoFocus
//                 />

//                 <input
//                   className="border rounded-xl p-2 bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
//                   placeholder="Password"
//                   type="password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                 />

//                 {err && <p className="text-sm text-red-600">{err}</p>}

//                 <button
//                   disabled={loading}
//                   className="bg-black text-white rounded-xl py-2 font-bold hover:bg-gray-900 transition disabled:opacity-60"
//                 >
//                   {loading ? "Logging in..." : "Login"}
//                 </button>
//               </form>

//               {/* Optional: small note */}
//               <p className="text-xs text-gray-500 mt-3">
//                 Use admin credentials to access portal.
//               </p>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ✅ Animation keyframe (Tailwind doesn't include fadeIn by default) */}
//       <style>
//         {`
//           @keyframes fadeIn {
//             from { opacity: 0; transform: translateY(-8px); }
//             to { opacity: 1; transform: translateY(0); }
//           }
//         `}
//       </style>
//     </div>
//   );
// }


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

  // ✅ if already logged in, don't stay on login page
  useEffect(() => {
    api
      .get("/me")
      .then((res) => {
        if (res.data?.logged_in) nav("/", { replace: true });
      })
      .catch(() => {});
  }, [nav]);

  // ✅ close dropdown when click outside
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
        filter: "brightness(1.12) contrast(1.05)", // ✅ brighter image
      }}
    >
      {/* ✅ lighter overlay */}
      <div className="absolute inset-0 bg-black/20"></div>

      {/* ✅ TOP BAR */}
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
