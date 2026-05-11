import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { notifyError, notifySuccess } from "../ui/alerts";

function sourceBadge(source) {
  if (source === "rental") {
    return (
      <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
        Rental
      </span>
    );
  }

  return (
    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-800">
      Company
    </span>
  );
}

function statusBadge(status) {
  if (status === "Issued") {
    return (
      <span className="rounded-lg bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-800">
        Issued
      </span>
    );
  }

  if (status === "Returned") {
    return (
      <span className="rounded-lg bg-green-100 px-2 py-1 text-xs font-bold text-green-800">
        Returned
      </span>
    );
  }

  return (
    <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-bold text-gray-800">
      {status || "-"}
    </span>
  );
}

export default function History() {
  const [history, setHistory] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get("/history");
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      notifyError("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const editHistory = async (record) => {
    const remarks = window.prompt("Enter remarks", record.remarks || "");
    const issuedType = window.prompt(
      "Enter issued type",
      record.issued_type || ""
    );

    if (remarks === null || issuedType === null) {
      return;
    }

    try {
      await api.put(`/history/${record.assignment_id}`, {
        remarks,
        issued_type: issuedType,
      });
      notifySuccess("History updated successfully");
      await loadHistory();
    } catch (error) {
      console.error(error);
      notifyError("Failed to update history");
    }
  };

  const deleteHistory = async (assignmentId) => {
    const confirmed = window.confirm(
      "Permanently delete this history record? This action is admin-only and cannot be undone."
    );
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/history/${assignmentId}`);
      notifySuccess("History deleted successfully");
      await loadHistory();
    } catch (error) {
      console.error(error);
      notifyError("Failed to delete history");
    }
  };

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) {
      return history;
    }

    return history.filter((record) => {
      return (
        (record.asset_source || "").toLowerCase().includes(search) ||
        (record.emp_name || "").toLowerCase().includes(search) ||
        (record.emp_id || "").toLowerCase().includes(search) ||
        (record.department || "").toLowerCase().includes(search) ||
        (record.asset_type || "").toLowerCase().includes(search) ||
        (record.brand_model || "").toLowerCase().includes(search) ||
        (record.serial_number || "").toLowerCase().includes(search) ||
        (record.status || "").toLowerCase().includes(search) ||
        (record.issued_type || "").toLowerCase().includes(search)
      );
    });
  }, [history, q]);

  const exportCSV = () => {
    const base =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
    window.open(`${base}/export/history.csv`, "_blank");
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">History Logs</h1>
          <p className="text-sm text-gray-600">
            Preserved issue and return history for company and rental assets
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadHistory}
            className="rounded-xl bg-black px-4 py-2 text-white"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          <button
            onClick={exportCSV}
            className="rounded-xl bg-blue-600 px-4 py-2 text-white"
          >
            Export CSV
          </button>
        </div>
      </div>

      <input
        className="w-full rounded-xl border border-gray-300 bg-white p-2 text-black"
        placeholder="Search source / employee / asset / serial / status / issue type..."
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />

      <p className="mt-2 text-xs text-gray-500">
        Showing <b>{filtered.length}</b> of <b>{history.length}</b> records
      </p>

      <div className="mt-4 overflow-auto">
        <table className="w-full text-sm text-black">
          <thead>
            <tr className="border-b bg-white text-black">
              <th className="p-2">Source</th>
              <th className="p-2">Employee</th>
              <th className="p-2">Asset</th>
              <th className="p-2">Serial</th>
              <th className="p-2">Issue Type</th>
              <th className="p-2">Issue Date</th>
              <th className="p-2">Return Date</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-4 text-center text-gray-500">
                  Loading history...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-4 text-center text-gray-500">
                  No history records found.
                </td>
              </tr>
            ) : (
              filtered.map((record) => (
                <tr
                  key={record.assignment_id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-2">{sourceBadge(record.asset_source)}</td>

                  <td className="p-2">
                    <div className="font-semibold">{record.emp_name}</div>
                    <div className="font-mono text-xs text-gray-500">
                      {record.emp_id}
                    </div>
                  </td>

                  <td className="p-2">
                    <div className="font-semibold">{record.asset_type}</div>
                    <div className="text-xs text-gray-500">
                      {record.brand_model}
                    </div>
                  </td>

                  <td className="p-2 font-mono">{record.serial_number}</td>
                  <td className="p-2">{record.issued_type || "-"}</td>
                  <td className="p-2">
                    {record.issue_date
                      ? new Date(record.issue_date).toLocaleString()
                      : "-"}
                  </td>
                  <td className="p-2">
                    {record.return_date
                      ? new Date(record.return_date).toLocaleString()
                      : "-"}
                  </td>
                  <td className="p-2">{statusBadge(record.status)}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => editHistory(record)}
                        className="rounded bg-blue-600 px-2 py-1 text-xs text-white"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteHistory(record.assignment_id)}
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                      >
                        Delete
                      </button>
                    </div>
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
