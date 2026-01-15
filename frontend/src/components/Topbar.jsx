import { logout } from "../auth";

export default function Topbar({ onLogout }) {
  return (
    <header className="w-full bg-white border-b shadow-sm sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
        {/* Left Logo + Name */}
        <div className="flex items-center gap-3">
          <img
            src="/company-logo.png"
            alt="Company Logo"
            className="h-10 w-auto object-contain"
          />
          <div className="leading-tight">
            <div className="text-xl font-extrabold text-blue-900">
              DTC Infotech
            </div>
            <div className="text-xs text-gray-500 font-semibold">
              Data driven Intelligence
            </div>
          </div>
        </div>

        {/* Center Menu */}
        <nav className="hidden md:flex items-center gap-8 text-gray-800 font-medium">
          <span className="text-sm text-gray-600 font-semibold">
            IT ADMIN PORTAL
          </span>
        </nav>

        {/* Right Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              logout();
              onLogout();
            }}
            className="px-6 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
