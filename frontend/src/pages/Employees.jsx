import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

import {
  confirmPopup,
  inputPopup,
  notifyError,
  notifyInfo,
  notifySuccess,
} from "../ui/alerts";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    emp_name: "",
    emp_id: "",
    department: "",
    email: "",
    phone: "",
  });

  const [editingId, setEditingId] = useState(null);

  // ✅ Bulk Upload states (added)
  const [bulkLoading, setBulkLoading] = useState(false);

  // ✅ selection states
  const [selectedIds, setSelectedIds] = useState([]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get("/employees");
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("LOAD EMPLOYEES ERROR:", err);
      notifyError("Backend not reachable ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return employees;

    return employees.filter((e) => {
      return (
        (e.emp_name || "").toLowerCase().includes(s) ||
        (e.emp_id || "").toLowerCase().includes(s) ||
        (e.department || "").toLowerCase().includes(s) ||
        (e.email || "").toLowerCase().includes(s) ||
        (e.phone || "").toLowerCase().includes(s)
      );
    });
  }, [employees, q]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      emp_name: "",
      emp_id: "",
      department: "",
      email: "",
      phone: "",
    });
  };

  const saveEmployee = async (e) => {
    e.preventDefault();

    if (!form.emp_name || !form.emp_id) {
      notifyError("Employee Name and Employee ID required ❌");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/employees/${editingId}`, form);
        notifySuccess("Employee updated ✅");
      } else {
        try {
          await api.post("/employees", form);
          notifySuccess("Employee saved ✅");
        } catch (err) {
          if (err.response?.data?.error === "DUPLICATE_EMP_ID") {
            const ok = await confirmPopup({
              title: "Duplicate Employee ID",
              text: "Employee ID already exists. Do you want to add anyway?",
              confirmButtonText: "Yes, Add",
              cancelButtonText: "No",
              icon: "warning",
            });

            if (!ok) {
              setLoading(false);
              notifyInfo("Cancelled ❌");
              return;
            }

            await api.post("/employees?force=1", form);
            notifySuccess("Employee saved (duplicate allowed) ✅");
          } else {
            throw err;
          }
        }
      }

      resetForm();
      await loadEmployees();
    } catch (err) {
      console.error("SAVE EMPLOYEE ERROR:", err);

      const msg =
        err.response?.data?.error ||
        err.response?.statusText ||
        err.message ||
        "Unknown error";

      if (editingId) {
        notifyError("Update failed ❌");
      } else {
        notifyError("Save failed ❌");
      }

      console.log("Detailed Error:", msg);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (emp) => {
    setEditingId(emp.id);
    setForm({
      emp_name: emp.emp_name || "",
      emp_id: emp.emp_id || "",
      department: emp.department || "",
      email: emp.email || "",
      phone: emp.phone || "",
    });
  };

  const deleteEmployee = async (id) => {
    const ok = await confirmPopup({
      title: "Delete employee?",
      text: "This cannot be undone.",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      icon: "warning",
    });
    if (!ok) return;

    setLoading(true);
    try {
      await api.delete(`/employees/${id}`);
      notifySuccess("Employee deleted ✅");
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      await loadEmployees();
    } catch (err) {
      console.error("DELETE EMPLOYEE ERROR:", err);
      notifyError("Delete failed ❌");
    } finally {
      setLoading(false);
    }
  };

  // const exportCSV = () => {
  //   const base =
  //     import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";
  //   window.open(`${base}/export/employees.csv`, "_blank");
  // };

  // // ✅ CSV parser helper
  const exportCSV = async () => {
  try {
    const res = await api.get("/export/employees.csv", { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees.csv";
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
    notifyError("Export failed ❌");
  }
};

  const parseCSV = async (file) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim());

    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = values[i] || "";
      });
      return obj;
    });
  };


  // ✅ Bulk upload handler
  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      notifyError("Upload only .csv file ❌");
      return;
    }

    setBulkLoading(true);

    try {
      const rows = await parseCSV(file);

      if (!rows.length) {
        notifyError("CSV is empty ❌");
        return;
      }

      let success = 0;
      let failed = 0;

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];

        const payload = {
          emp_name: (r.emp_name || "").trim(),
          emp_id: (r.emp_id || "").trim(),
          department: (r.department || "").trim(),
          email: (r.email || "").trim(),
          phone: (r.phone || "").trim(),
        };

        if (!payload.emp_name || !payload.emp_id) {
          failed++;
          continue;
        }

        try {
          await api.post("/employees", payload);
          success++;
        } catch (err) {
          failed++;
          console.error("Bulk row failed:", payload, err);
        }
      }

      await loadEmployees();
      notifySuccess(`Bulk upload finished ✅ Saved: ${success}, Failed: ${failed}`);
    } catch (err) {
      console.error(err);
      notifyError("Bulk upload failed ❌");
    } finally {
      setBulkLoading(false);
      e.target.value = "";
    }
  };

  // ✅ checkbox helpers
  const toggleOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const isAllFilteredSelected =
    filtered.length > 0 && filtered.every((e) => selectedIds.includes(e.id));

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIds = filtered.map((e) => e.id);
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      const filteredIds = filtered.map((e) => e.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // ✅ delete selected
  const deleteSelected = async () => {
    if (!selectedIds.length) {
      notifyInfo("No employees selected ❌");
      return;
    }

    const ok = await confirmPopup({
      title: `Delete ${selectedIds.length} employees?`,
      text: "This cannot be undone.",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      icon: "warning",
    });
    if (!ok) return;

    setLoading(true);
    try {
      await api.post("/employees/bulk-delete", { ids: selectedIds });
      notifySuccess(`Deleted ${selectedIds.length} employees ✅`);
      setSelectedIds([]);
      await loadEmployees();
    } catch (err) {
      console.error("DELETE SELECTED ERROR:", err);
      notifyError("Delete selected failed ❌");
    } finally {
      setLoading(false);
    }
  };

  // ✅ delete all
  const deleteAllEmployees = async () => {
    if (!employees.length) {
      notifyInfo("No employees to delete ❌");
      return;
    }

    const ok = await confirmPopup({
      title: "Delete ALL employees?",
      text: "This will remove all employee records. This cannot be undone.",
      confirmButtonText: "Continue",
      cancelButtonText: "Cancel",
      icon: "warning",
    });
    if (!ok) return;

    const text = await inputPopup({
      title: "Final Confirmation",
      text: 'Type DELETE to confirm',
      inputPlaceholder: "Type DELETE",
      confirmButtonText: "Delete All",
    });

    if (text !== "DELETE") {
      notifyInfo("Cancelled ❌");
      return;
    }

    setLoading(true);
    try {
      await api.delete("/employees/delete-all");
      notifySuccess("All employees deleted ✅");
      setSelectedIds([]);
      await loadEmployees();
    } catch (err) {
      console.error("DELETE ALL ERROR:", err);
      notifyError("Delete all failed ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* TOP FORM */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-black">Employees</h1>
          <p className="text-gray-600 text-sm">
            Add and manage employee records
          </p>
        </div>

        <form
          onSubmit={saveEmployee}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <Input
            placeholder="Employee Name"
            value={form.emp_name}
            onChange={(e) => setForm({ ...form, emp_name: e.target.value })}
          />

          <Input
            placeholder="Employee ID"
            value={form.emp_id}
            onChange={(e) => setForm({ ...form, emp_id: e.target.value })}
          />

          <Input
            placeholder="Department"
            value={form.department}
            onChange={(e) =>
              setForm({ ...form, department: e.target.value })
            }
          />

          <Input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <Input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <button className="bg-black text-white rounded-xl px-4 py-2 font-bold col-span-1 md:col-span-2">
            {editingId ? "Update Employee" : "Save Employee"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-200 text-black rounded-xl px-4 py-2 font-bold col-span-1 md:col-span-2"
            >
              Cancel Edit
            </button>
          )}
        </form>

        {/* ✅ BULK UPLOAD */}
        <div className="mt-5 border-t pt-4">
          <h3 className="font-bold text-black mb-2">Bulk Upload Employees</h3>
          <p className="text-xs text-gray-600 mb-2">
            Upload CSV with columns: emp_name, emp_id, department, email, phone
          </p>

          <label className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold cursor-pointer">
            {bulkLoading ? "Uploading..." : "Upload CSV"}
            <input
              type="file"
              accept=".csv"
              onChange={handleBulkUpload}
              className="hidden"
              disabled={bulkLoading}
            />
          </label>
        </div>
      </div>

      {/* LIST BELOW */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-black">Employee List</h2>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadEmployees}
              className="px-4 py-2 rounded-xl bg-black text-white"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>

            <button
              onClick={exportCSV}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
            >
              Export CSV
            </button>

            <button
              onClick={deleteSelected}
              className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold"
              disabled={loading || selectedIds.length === 0}
              title={
                selectedIds.length === 0
                  ? "Select employees to delete"
                  : `Delete ${selectedIds.length} selected`
              }
            >
              Delete Selected ({selectedIds.length})
            </button>

            <button
              onClick={deleteAllEmployees}
              className="px-4 py-2 rounded-xl bg-red-900 text-white font-bold"
              disabled={loading || employees.length === 0}
              title="Delete all employees"
            >
              Delete All
            </button>
          </div>
        </div>

        <Input
          placeholder="Search name / emp id / department..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <p className="text-xs text-gray-500 mt-2">
          Showing {filtered.length} of {employees.length}
        </p>

        <div className="overflow-auto mt-4">
          <table className="w-full text-sm text-black">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 w-[50px]">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    title="Select all shown"
                  />
                </th>

                <th className="p-2">Name</th>
                <th className="p-2">Emp ID</th>
                <th className="p-2">Dept</th>
                <th className="p-2">Phone</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(e.id)}
                      onChange={() => toggleOne(e.id)}
                    />
                  </td>

                  <td className="p-2 font-semibold">{e.emp_name}</td>
                  <td className="p-2 font-mono">{e.emp_id}</td>
                  <td className="p-2">{e.department}</td>
                  <td className="p-2 font-mono">{e.phone || "-"}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(e)}
                        className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteEmployee(e.id)}
                        className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Input(props) {
  return (
    <input
      className="w-full rounded-xl p-2 bg-white text-black placeholder:text-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
      {...props}
    />
  );
}