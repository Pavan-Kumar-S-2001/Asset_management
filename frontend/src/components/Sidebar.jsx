import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { api } from "../api";

const menuItem =
  "flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition";

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

const navItemClick = () => {
  setMobileOpen(false);
};
  const nav = useNavigate();

  const companyName = "DTC INFOTECH PVT LTD";
  const companyTag = "IT DETAILS";

  const doLogout = async () => {
    try {
      await api.post("/logout");
      nav("/login");
    } catch (e) {
      console.error(e);
    }
  };

  return (
  <>

    {/* MOBILE TOP BAR */}
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white px-4 py-3 shadow md:hidden">

      <div className="flex items-center gap-2">

        <img
          src="/company-logo.png"
          alt="logo"
          className="h-10 w-10 rounded-lg border bg-white"
        />

        <div>
          <h2 className="text-sm font-extrabold text-blue-900">
            DTC INFOTECH
          </h2>

          <p className="text-xs text-gray-500">
            IT DETAILS
          </p>
        </div>

      </div>

      <button
        onClick={() => setMobileOpen(true)}
        className="rounded-lg border p-2"
      >
        <Menu size={20} />
      </button>

    </div>

    {/* OVERLAY */}
    {mobileOpen && (
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={() => setMobileOpen(false)}
      />
    )}

    {/* SIDEBAR */}
    <aside
      className={`
        fixed left-0 top-0 z-50
        h-screen w-80
        bg-white shadow-xl
        flex flex-col
        transition-transform duration-300
        md:sticky md:translate-x-0
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >

      {/* HEADER */}
      <div className="border-b p-5">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-4">

            <img
              src="/company-logo.png"
              alt="Company Logo"
              className="h-16 w-16 rounded-xl border bg-white object-contain"
            />

            <div className="overflow-hidden">

              <h2 className="whitespace-nowrap text-sm font-extrabold text-blue-900">
                {companyName}
              </h2>

              <p className="text-xs font-semibold text-gray-600">
                {companyTag}
              </p>

            </div>

          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden"
          >
            <X size={20} />
          </button>

        </div>

      </div>

      {/* MENU */}
      <nav className="flex-1 space-y-2 overflow-y-auto p-4">

        <NavLink
          to="/"
          end
          onClick={navItemClick}
          className={({ isActive }) =>
            menuItem + (isActive ? " bg-black text-white" : "")
          }
        >
          📊 Dashboard
        </NavLink>

        <NavLink
          to="/employees"
          onClick={navItemClick}
          className={({ isActive }) =>
            menuItem + (isActive ? " bg-black text-white" : "")
          }
        >
          👤 Employees
        </NavLink>

        <NavLink
          to="/assets"
          onClick={navItemClick}
          className={({ isActive }) =>
            menuItem + (isActive ? " bg-black text-white" : "")
          }
        >
          💻 Add Own Assets
        </NavLink>
        <NavLink
  to="/own-assets"
  onClick={navItemClick}
  className={({ isActive }) =>
    menuItem + (isActive ? " bg-black text-white" : "")
  }
>
  🧾 Own Assets List
</NavLink>
        <NavLink
          to="/issue-return"
          onClick={navItemClick}
          className={({ isActive }) =>
            menuItem + (isActive ? " bg-black text-white" : "")
          }
        >
          🔁 Assign Assets
        </NavLink>

        <NavLink
          to="/issued-assets"
          onClick={navItemClick}
          className={({ isActive }) =>
            menuItem + (isActive ? " bg-black text-white" : "")
          }
        >
          📦 Issued Assets
        </NavLink>

          <NavLink
            to="/rental-assets"
            onClick={navItemClick}
            className={({ isActive }) =>
              menuItem + (isActive ? " bg-black text-white" : "")
            }
          >
            🧾 Rental Assets List
          </NavLink>

        <NavLink
          to="/history"
          onClick={navItemClick}
          className={({ isActive }) =>
            menuItem + (isActive ? " bg-black text-white" : "")
          }
        >
          
          🧾 History
        </NavLink>

      </nav>

      {/* FOOTER */}
      <div className="border-t p-4 text-xs text-gray-500">

        <p>✅ Secure Company Asset Tracking</p>

        <p className="mt-1">
          Version 1.0
        </p>

        <button
          onClick={doLogout}
          className="mt-4 w-full rounded-xl bg-red-600 py-2 font-bold text-white transition hover:bg-red-700"
        >
          Logout
        </button>

      </div>

    </aside>

  </>
);
}