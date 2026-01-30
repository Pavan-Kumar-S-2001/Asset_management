import { useEffect } from "react";

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(() => onClose?.(), 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg =
    type === "error"
      ? "bg-red-600"
      : type === "warning"
      ? "bg-yellow-600"
      : "bg-green-600";

  return (
    <div className="fixed top-5 right-5 z-50">
      <div
        className={`${bg} text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3`}
      >
        <span className="text-sm font-semibold">{message}</span>
        <button
          onClick={() => onClose?.()}
          className="ml-2 bg-white/20 hover:bg-white/30 transition rounded-lg px-2 py-1 text-xs font-bold"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
