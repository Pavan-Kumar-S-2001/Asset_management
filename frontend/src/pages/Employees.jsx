import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

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

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get("/employees");
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("LOAD EMPLOYEES ERROR:", err);
      alert("Backend not reachable ❌");
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
      alert("Employee Name and Employee ID required ❌");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/employees/${editingId}`, form);
        alert("Employee updated ✅");
      } else {
        await api.post("/employees", form);
        alert("Employee saved ✅");
      }

      resetForm();
      await loadEmployees();
    } catch (err) {
      console.error("SAVE EMPLOYEE ERROR:", err);
      alert("Save failed ❌ (emp_id maybe already exists)");
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
    if (!confirm("Delete this employee?")) return;

    setLoading(true);
    try {
      await api.delete(`/employees/${id}`);
      alert("Employee deleted ✅");
      await loadEmployees();
    } catch (err) {
      console.error("DELETE EMPLOYEE ERROR:", err);
      alert("Delete failed ❌");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    window.open("http://127.0.0.1:5000/api/export/employees.csv", "_blank");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT FORM */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-black">Employees</h1>
          <p className="text-gray-600 text-sm">Add and manage employee records</p>
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
            onChange={(e) => setForm({ ...form, department: e.target.value })}
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
      </div>

      {/* RIGHT LIST */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-black">Employee List</h2>

          <div className="flex gap-2">
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
                <th className="p-2">Name</th>
                <th className="p-2">Emp ID</th>
                <th className="p-2">Dept</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b">
                  <td className="p-2 font-semibold">{e.emp_name}</td>
                  <td className="p-2 font-mono">{e.emp_id}</td>
                  <td className="p-2">{e.department}</td>
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
                  <td colSpan={4} className="p-4 text-center text-gray-500">
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
