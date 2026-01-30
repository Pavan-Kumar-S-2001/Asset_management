import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../api";

const itemClass =
  "flex items-center gap-3 px-4 py-3 rounded-xl font-semibold hover:bg-gray-100 transition";

export default function Sidebar() {
  const nav = useNavigate();

  // ✅ Company details (change here)
  const companyName = "DTC INFOTECH PVT LTD";
  const companyTag = "IT DETAILS";

  // ✅ Logout Function (added)
  const doLogout = async () => {
  try {
    await api.post("/logout");
    nav("/login"); // ✅ redirect only
  } catch (e) {
    console.error(e);
  }
};


  return (
    <div className="w-120 bg-white shadow-xl rounded-2xl p-4 h-[calc(100vh-40px)] sticky top-5">
      {/* Company Header */}
      <div className="flex items-center gap-3 mb-6">
        <img
          src="/company-logo.png"
          alt="Company Logo"
          className="w-13 h-13 rounded-xl border object-contain bg-white"
        />
        <div>
          <h2 className="text-base font-extrabold text-blue-900 whitespace-nowrap">
            {companyName}
          </h2>
          <p className="text-l font-bold text-black-500">{companyTag}</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="space-y-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            itemClass + (isActive ? " bg-black text-white" : "")
          }
        >
          📊 Dashboard
        </NavLink>

        <NavLink
          to="/employees"
          className={({ isActive }) =>
            itemClass + (isActive ? " bg-black text-white" : "")
          }
        >
          👤 Employees
        </NavLink>

        <NavLink
          to="/assets"
          className={({ isActive }) =>
            itemClass + (isActive ? " bg-black text-white" : "")
          }
        >
          💻 Assets
        </NavLink>

        <NavLink
          to="/issue-return"
          className={({ isActive }) =>
            itemClass + (isActive ? " bg-black text-white" : "")
          }
        >
          🔁 Issued / Return
        </NavLink>

        <NavLink
          to="/history"
          className={({ isActive }) =>
            itemClass + (isActive ? " bg-black text-white" : "")
          }
        >
          🧾 History
        </NavLink>
      </nav>

      {/* Bottom */}
      <div className="mt-8 border-t pt-4 text-xs text-gray-500">
        <p>✅ Secure Company Asset Tracking</p>
        <p className="mt-1">Version 1.0</p>

        {/* ✅ Logout Button (added) */}
        <button
          onClick={doLogout}
          className="w-full mt-4 px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
