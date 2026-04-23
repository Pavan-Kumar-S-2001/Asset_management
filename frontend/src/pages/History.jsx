import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { notifyError, notifySuccess } from "../ui/alerts";

export default function History() {
  const [history, setHistory] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Fetch both asset history and rental list
      const [assetHistoryRes, rentalRes] = await Promise.all([
        api.get("/history"),   // asset issue/return history
        api.get("/rentals"),   // rental laptops
      ]);

      // Asset history (mark as Asset type)
      const assetHistory = Array.isArray(assetHistoryRes.data)
        ? assetHistoryRes.data.map((h) => ({
            ...h,
            type: "Asset",
          }))
        : [];

      // Convert rentals into history logs
      const rentalHistory = Array.isArray(rentalRes.data)
        ? rentalRes.data
            .filter((r) => r.status === "Issued" || r.status === "Returned")
            .map((r) => ({
              assignment_id: `rental-${r.id}`, // unique key (IMPORTANT)
              emp_name: r.employee_name || "-",
              emp_id: r.employee_id || "-",
              department: r.department || "-",
              asset_type: "Rental Laptop",
              brand_model: r.laptop_name || "-",
              serial_number: r.serial_number || "-",
              issue_date: r.issue_date || null,
              return_date: r.return_date || null,
              status: r.status || "In Stock",
              type: "Rental",
            }))
        : [];

      // Merge asset + rental history
      const merged = [...assetHistory, ...rentalHistory];

      // Sort latest first
      merged.sort((a, b) => {
        const d1 = new Date(b.issue_date || 0);
        const d2 = new Date(a.issue_date || 0);
        return d1 - d2;
      });

      setHistory(merged);
    } catch (e) {
      console.error(e);
      notifyError("Backend not reachable ❌ (Check Flask API)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // ✅ ADD THIS ABOVE useMemo (IMPORTANT)

const editHistory = async (h) => {
  const remarks = prompt("Enter remarks", h.remarks || "");
  const issued_type = prompt("Enter issued type", h.issued_type || "");

  if (remarks === null || issued_type === null) return;

  try {
    await api.put(`/history/${h.assignment_id}`, {
      remarks: remarks,
      issued_type: issued_type
    });

    notifySuccess("History updated successfully ✅");
    loadHistory();
  } catch (err) {
    console.error(err);
    notifyError("Failed to update history ❌");
  }
};

const deleteHistory = async (id) => {
  const confirmDelete = window.confirm("Are you sure you want to delete this history record?");
  if (!confirmDelete) return;

  try {
    await api.delete(`/history/${id}`);
    notifySuccess("History deleted successfully 🗑️");
    loadHistory();
  } catch (err) {
    console.error(err);
    notifyError("Failed to delete history ❌");
  }
};

const filtered = useMemo(() => {
  const s = q.trim().toLowerCase();
  if (!s) return history;

  return history.filter((h) => {
    return (
      (h.type || "").toLowerCase().includes(s) ||
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
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  window.open(`${base}/export/issued-assets.csv`, "_blank");
};

  const statusBadge = (status) => {
    if (status === "Issued") {
      return (
        <span className="px-2 py-1 rounded-lg text-xs font-bold bg-yellow-100 text-yellow-800">
          Issued
        </span>
      );
    }
    if (status === "Returned") {
      return (
        <span className="px-2 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-800">
          Returned
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-800">
        {status || "-"}
      </span>
    );
  };

  const typeBadge = (type) => {
    if (type === "Rental") {
      return (
        <span className="px-2 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-800">
          Rental
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800">
        Asset
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">History Logs</h1>
          <p className="text-gray-600 text-sm">
            Complete Asset + Rental issue/return history
          </p>
        </div>

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
        className="bg-white text-black border border-gray-300 rounded-xl p-2 w-full"
        placeholder="Search type / employee / emp id / serial / status..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <p className="text-xs text-gray-500 mt-2">
        Showing <b>{filtered.length}</b> of <b>{history.length}</b> records
      </p>

      <div className="overflow-auto mt-4">
        <table className="w-full text-sm text-black">
          <thead>
            <tr className="bg-white text-black border-b">
              <th className="p-2">Type</th>
              <th className="p-2">Employee</th>
              <th className="p-2">Asset</th>
              <th className="p-2">Serial</th>
              <th className="p-2">Issue Date</th>
              <th className="p-2">Return Date</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  Loading history...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  No history records found.
                </td>
              </tr>
            ) : (
              filtered.map((h) => (
                <tr key={h.assignment_id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{typeBadge(h.type)}</td>

                  <td className="p-2">
                    <div className="font-semibold">{h.emp_name}</div>
                    <div className="text-xs text-gray-500 font-mono">
                      {h.emp_id}
                    </div>
                  </td>

                  <td className="p-2">
                    <div className="font-semibold">{h.asset_type}</div>
                    <div className="text-xs text-gray-500">
                      {h.brand_model}
                    </div>
                  </td>

                  <td className="p-2 font-mono">{h.serial_number}</td>

                  <td className="p-2">
                    {h.issue_date
                      ? new Date(h.issue_date).toLocaleString()
                      : "-"}
                  </td>

                  <td className="p-2">
                    {h.return_date
                      ? new Date(h.return_date).toLocaleString()
                      : "-"}
                  </td>

                  <td className="p-2">{statusBadge(h.status)}</td>
                  <td className="p-2 flex gap-2">
                  <button
                    onClick={() => editHistory(h)}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteHistory(h.assignment_id)}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                  >
                    Delete
                  </button>
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