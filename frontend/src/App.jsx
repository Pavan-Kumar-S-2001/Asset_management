// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Sidebar from "./components/Sidebar";

// import Dashboard from "./pages/Dashboard";
// import Employees from "./pages/Employees";
// import Assets from "./pages/Assets";
// import IssueReturn from "./pages/IssueReturn";
// import History from "./pages/History";

// export default function App() {
//   return (
//     <BrowserRouter>
//       {/* ✅ Full Background Image */}
//       <div
//         className="min-h-screen bg-cover bg-center bg-no-repeat p-5"
//         style={{
//           backgroundImage: "url('/bg.jpg')", // ✅ image must be inside frontend/public
//         }}
//       >
//         <div className="flex gap-5">
//           <Sidebar />

//           {/* ✅ Right Side Routes */}
//           <div className="flex-1">
//             <Routes>
//               <Route path="/" element={<Dashboard />} />
//               <Route path="/employees" element={<Employees />} />
//               <Route path="/assets" element={<Assets />} />
//               <Route path="/issue-return" element={<IssueReturn />} />
//               <Route path="/history" element={<History />} />
//             </Routes>
//           </div>
//         </div>
//       </div>
//     </BrowserRouter>
//   );
// }

import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Assets from "./pages/Assets";
import IssueReturn from "./pages/IssueReturn";
import History from "./pages/History";

function AppLayout() {
  const location = useLocation();

  // ✅ Hide sidebar on login page
  const isLoginPage = location.pathname === "/login";

  return (
    // ✅ Full Background Image (same as your code)
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat p-5"
      style={{
        backgroundImage: "url('/bg.jpg')", // ✅ image must be inside frontend/public
      }}
    >
      <div className="flex gap-5">
        {/* ✅ Sidebar only for logged-in pages */}
        {!isLoginPage && <Sidebar />}

        {/* ✅ Routes */}
        <div className="flex-1">
          <Routes>
            {/* ✅ Public Route */}
            <Route path="/login" element={<Login />} />

            {/* ✅ Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute>
                  <Employees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assets"
              element={
                <ProtectedRoute>
                  <Assets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/issue-return"
              element={
                <ProtectedRoute>
                  <IssueReturn />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
