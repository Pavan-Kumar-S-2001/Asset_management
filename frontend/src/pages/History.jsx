import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function History() {
  const [history, setHistory] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get("/history");
      const data = Array.isArray(res.data) ? res.data : [];
      setHistory(data);
    } catch (e) {
      console.error(e);
      alert("Backend not reachable ❌ (Check Flask is running on port 5000)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return history;

    return history.filter((h) => {
      return (
        (h.emp_name || "").toLowerCase().includes(s) ||
        (h.emp_id || "").toLowerCase().includes(s) ||
        (h.department || "").toLowerCase().includes(s) ||
        (h.asset_type || "").toLowerCase().includes(s) ||
        (h.brand_model || "").toLowerCase().includes(s) ||
        (h.serial_number || "").toLowerCase().includes(s) ||
        (h.status || "").toLowerCase().includes(s)
      );
    });
  }, [history, q]);

  const exportCSV = () => {
    // if using .env this will work
    const base =
      import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";

    window.open(`${base}/export/history.csv`, "_blank");
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">History Logs</h1>
          <p className="text-gray-600 text-sm">Complete issue/return history</p>
        </div>

        {/* ✅ Buttons */}
        <div className="flex gap-2">
          <button
            onClick={loadHistory}
            className="px-4 py-2 rounded-xl bg-black text-white"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          <button
            onClick={exportCSV}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white"
          >
            Export CSV
          </button>
        </div>
      </div>

      <input
        className="border rounded-xl p-2 w-full"
        placeholder="Search employee / emp id / serial / status..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <p className="text-xs text-gray-500 mt-2">
        Showing {filtered.length} of {history.length}
      </p>

      <div className="overflow-auto mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2">Employee</th>
              <th className="p-2">Asset</th>
              <th className="p-2">Serial</th>
              <th className="p-2">Issue</th>
              <th className="p-2">Return</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  Loading history...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  No history records found.
                </td>
              </tr>
            ) : (
              filtered.map((h) => (
                <tr key={h.assignment_id} className="border-b">
                  <td className="p-2">
                    <div className="font-semibold">{h.emp_name}</div>
                    <div className="text-xs text-gray-500 font-mono">
                      {h.emp_id}
                    </div>
                  </td>

                  <td className="p-2">
                    <div className="font-semibold">{h.asset_type}</div>
                    <div className="text-xs text-gray-500">{h.brand_model}</div>
                  </td>

                  <td className="p-2 font-mono">{h.serial_number}</td>
                  <td className="p-2">{h.issue_date}</td>
                  <td className="p-2">{h.return_date || "-"}</td>

                  <td className="p-2">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        h.status === "Issued"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
