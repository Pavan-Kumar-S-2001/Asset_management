import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

function Input(props) {
  return (
    <input
      className="w-full rounded-xl p-2 bg-white text-black placeholder:text-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
      {...props}
    />
  );
}

export default function IssueReturn() {
  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState([]);
  const [history, setHistory] = useState([]);

  // ✅ Dropdown search (added - safe)
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [assetSearch, setAssetSearch] = useState("");

  // rentals
  const [rentals, setRentals] = useState([]);
  const [rentalSearch, setRentalSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [rentalLoading, setRentalLoading] = useState(false);

  // issue/return main asset
  const [issueForm, setIssueForm] = useState({
    employee_id: "",
    asset_id: "",
    remarks: "",
  });

  const [returnForm, setReturnForm] = useState({
    assignment_id: "",
    remarks: "",
  });

  // rental add
  const [rentalAddForm, setRentalAddForm] = useState({
    laptop_name: "",
    serial_number: "",
    configuration: "",
    po_date: "",
    end_date: "",
  });

  // rental issue/return
  const [rentalIssueForm, setRentalIssueForm] = useState({
    rental_id: "",
    employee_id: "",
    remarks: "",
  });

  const [rentalReturnForm, setRentalReturnForm] = useState({
    rental_id: "",
    remarks: "",
  });

  // rental edit modal
  const [editingRental, setEditingRental] = useState(null);
  const [editRentalForm, setEditRentalForm] = useState({
    laptop_name: "",
    serial_number: "",
    configuration: "",
    po_date: "",
    end_date: "",
    status: "In Stock",
  });

  // ---------------- load ----------------
  const loadAll = async () => {
    setLoading(true);
    try {
      const [emp, ast, his] = await Promise.all([
        api.get("/employees"),
        api.get("/assets"),
        api.get("/history"),
      ]);

      setEmployees(Array.isArray(emp.data) ? emp.data : []);
      setAssets(Array.isArray(ast.data) ? ast.data : []);
      setHistory(Array.isArray(his.data) ? his.data : []);
    } catch (e) {
      console.error(e);
      alert("Backend not reachable ❌");
    } finally {
      setLoading(false);
    }
  };

  const loadRentals = async () => {
    setRentalLoading(true);
    try {
      const res = await api.get("/rentals");
      setRentals(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      alert("Rental API not reachable ❌");
    } finally {
      setRentalLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    loadRentals();
  }, []);

  // ---------------- computed ----------------
  const availableAssets = useMemo(
    () => assets.filter((a) => a.status === "Available"),
    [assets]
  );

  const issuedAssignments = useMemo(
    () => history.filter((h) => h.status === "Issued"),
    [history]
  );

  // ✅ filteredEmployees (added)
  const filteredEmployees = useMemo(() => {
    const s = employeeSearch.toLowerCase().trim();
    if (!s) return employees;

    return employees.filter((e) => {
      return (
        (e.emp_name || "").toLowerCase().includes(s) ||
        (e.emp_id || "").toLowerCase().includes(s) ||
        (e.department || "").toLowerCase().includes(s)
      );
    });
  }, [employees, employeeSearch]);

  // ✅ filteredAvailableAssets (added)
  const filteredAvailableAssets = useMemo(() => {
    const s = assetSearch.toLowerCase().trim();
    if (!s) return availableAssets;

    return availableAssets.filter((a) => {
      return (
        (a.asset_type || "").toLowerCase().includes(s) ||
        (a.serial_number || "").toLowerCase().includes(s) ||
        (a.brand_model || "").toLowerCase().includes(s)
      );
    });
  }, [availableAssets, assetSearch]);

  const inStockRentals = useMemo(
    () => rentals.filter((r) => r.status === "In Stock"),
    [rentals]
  );

  const issuedRentals = useMemo(
    () => rentals.filter((r) => r.status === "Issued"),
    [rentals]
  );

  const filteredRentals = useMemo(() => {
    const q = rentalSearch.toLowerCase().trim();
    if (!q) return rentals;

    return rentals.filter((r) => {
      const laptop = (r.laptop_name || "").toLowerCase();
      const serial = (r.serial_number || "").toLowerCase();
      const status = (r.status || "").toLowerCase();
      const emp = (r.employee_name || "").toLowerCase();
      return (
        laptop.includes(q) ||
        serial.includes(q) ||
        status.includes(q) ||
        emp.includes(q)
      );
    });
  }, [rentals, rentalSearch]);

  // ---------------- main asset handlers ----------------
  const issueAsset = async (e) => {
    e.preventDefault();
    if (!issueForm.employee_id || !issueForm.asset_id) {
      alert("Select Employee and Available Asset");
      return;
    }

    await api.post("/issue", {
      employee_id: Number(issueForm.employee_id),
      asset_id: Number(issueForm.asset_id),
      remarks: issueForm.remarks,
    });

    setIssueForm({ employee_id: "", asset_id: "", remarks: "" });
    await loadAll();
    alert("Asset issued ✅");
  };

  const returnAsset = async (e) => {
    e.preventDefault();
    if (!returnForm.assignment_id) {
      alert("Select issued assignment to return");
      return;
    }

    await api.post("/return", {
      assignment_id: Number(returnForm.assignment_id),
      remarks: returnForm.remarks,
    });

    setReturnForm({ assignment_id: "", remarks: "" });
    await loadAll();
    alert("Asset returned ✅");
  };

  // ✅ Quick Return (added)
  const quickReturn = async (assignment_id) => {
    if (!confirm("Return this asset?")) return;

    try {
      await api.post("/return", {
        assignment_id: Number(assignment_id),
        remarks: "Returned via quick return",
      });

      alert("Asset returned ✅");
      await loadAll();
    } catch (e) {
      console.error(e);
      alert("Quick return failed ❌");
    }
  };

  // ---------------- rentals handlers ----------------
  const addRentalLaptop = async (e) => {
    e.preventDefault();
    if (!rentalAddForm.laptop_name || !rentalAddForm.serial_number) {
      alert("Laptop name & serial number required");
      return;
    }

    try {
      await api.post("/rentals", rentalAddForm);
      alert("Rental laptop added ✅");
      setRentalAddForm({
        laptop_name: "",
        serial_number: "",
        configuration: "",
        po_date: "",
        end_date: "",
      });
      await loadRentals();
    } catch (e) {
      console.error(e);
      alert("Failed to add rental ❌");
    }
  };

  const issueRentalLaptop = async (e) => {
    e.preventDefault();
    if (!rentalIssueForm.rental_id || !rentalIssueForm.employee_id) {
      alert("Select Laptop and Employee");
      return;
    }

    try {
      await api.post("/rentals/issue", {
        rental_id: Number(rentalIssueForm.rental_id),
        employee_id: Number(rentalIssueForm.employee_id),
        remarks: rentalIssueForm.remarks,
      });

      alert("Rental issued ✅");
      setRentalIssueForm({ rental_id: "", employee_id: "", remarks: "" });
      await loadRentals();
    } catch (e) {
      console.error(e);
      alert("Failed to issue rental ❌");
    }
  };

  const returnRentalLaptop = async (e) => {
    e.preventDefault();
    if (!rentalReturnForm.rental_id) {
      alert("Select Issued Laptop");
      return;
    }

    try {
      await api.post("/rentals/return", {
        rental_id: Number(rentalReturnForm.rental_id),
        remarks: rentalReturnForm.remarks,
      });

      alert("Rental returned ✅");
      setRentalReturnForm({ rental_id: "", remarks: "" });
      await loadRentals();
    } catch (e) {
      console.error(e);
      alert("Failed to return rental ❌");
    }
  };

  const exportRentals = () => {
    window.open("http://127.0.0.1:5000/api/export/rentals.csv", "_blank");
  };

  // ✅ Export Issued Assets (added)
  const exportIssuedAssets = () => {
    window.open("http://127.0.0.1:5000/api/export/issued_assets.csv", "_blank");
  };

  // edit/delete rental
  const openEditRental = (r) => {
    setEditingRental(r);
    setEditRentalForm({
      laptop_name: r.laptop_name || "",
      serial_number: r.serial_number || "",
      configuration: r.configuration || "",
      po_date: r.po_date || "",
      end_date: r.end_date || "",
      status: r.status || "In Stock",
    });
  };

  const saveEditRental = async () => {
    try {
      await api.put(`/rentals/${editingRental.id}`, editRentalForm);
      alert("Rental updated ✅");
      setEditingRental(null);
      await loadRentals();
    } catch (e) {
      console.error(e);
      alert("Failed to update rental ❌");
    }
  };

  const deleteRental = async (id) => {
    if (!confirm("Delete this rental laptop?")) return;

    try {
      await api.delete(`/rentals/${id}`);
      alert("Rental deleted ✅");
      await loadRentals();
    } catch (e) {
      console.error(e);
      alert("Failed to delete rental ❌");
    }
  };

  const badge = (s) => {
    if (s === "Issued")
      return (
        <span className="px-2 py-1 rounded-lg text-xs font-bold bg-yellow-200 text-yellow-900">
          Issued
        </span>
      );
    if (s === "Returned")
      return (
        <span className="px-2 py-1 rounded-lg text-xs font-bold bg-blue-200 text-blue-900">
          Returned
        </span>
      );
    return (
      <span className="px-2 py-1 rounded-lg text-xs font-bold bg-green-200 text-green-900">
        In Stock
      </span>
    );
  };

  return (
    <div className="grid gap-6">
      {/* ---------------- main issue return ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ISSUE */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-bold">Issue Asset</h1>
              <p className="text-gray-600 text-sm">
                Issue available asset to employee
              </p>
            </div>

            <button
              onClick={loadAll}
              className="px-4 py-2 rounded-xl bg-black text-white"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <form onSubmit={issueAsset} className="grid gap-3">
            {/* ✅ Employee Search */}
            <Input
              placeholder="Search Employee (name / id / dept)..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
            />

            <select
              className="border rounded-xl p-2 w-full bg-white text-black"
              value={issueForm.employee_id}
              onChange={(e) =>
                setIssueForm({ ...issueForm, employee_id: e.target.value })
              }
            >
              <option value="">Select Employee</option>
              {filteredEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.emp_name} ({e.emp_id}) - {e.department}
                </option>
              ))}
            </select>

            {/* ✅ Asset Search */}
            <Input
              placeholder="Search Available Asset (type / serial / brand)..."
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
            />

            <select
              className="border rounded-xl p-2 w-full bg-white text-black"
              value={issueForm.asset_id}
              onChange={(e) =>
                setIssueForm({ ...issueForm, asset_id: e.target.value })
              }
            >
              <option value="">Select Available Asset</option>
              {filteredAvailableAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.asset_type} - {a.serial_number} ({a.brand_model})
                </option>
              ))}
            </select>

            <Input
              placeholder="Remarks (optional)"
              value={issueForm.remarks}
              onChange={(e) =>
                setIssueForm({ ...issueForm, remarks: e.target.value })
              }
            />

            <button className="bg-blue-600 text-white rounded-xl px-4 py-2 font-bold">
              Issue Now ✅
            </button>

            <p className="text-xs text-gray-500">
              Available assets: <b>{availableAssets.length}</b>
            </p>
          </form>
        </div>

        {/* RETURN */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold mb-1">Return Asset</h1>
          <p className="text-gray-600 text-sm mb-4">Return issued asset back</p>

          <form onSubmit={returnAsset} className="grid gap-3">
            <select
              className="border rounded-xl p-2 w-full bg-white text-black"
              value={returnForm.assignment_id}
              onChange={(e) =>
                setReturnForm({ ...returnForm, assignment_id: e.target.value })
              }
            >
              <option value="">Select Issued Asset</option>
              {issuedAssignments.map((h) => (
                <option key={h.assignment_id} value={h.assignment_id}>
                  {h.emp_name} → {h.asset_type} ({h.serial_number})
                </option>
              ))}
            </select>

            <Input
              placeholder="Return remarks (optional)"
              value={returnForm.remarks}
              onChange={(e) =>
                setReturnForm({ ...returnForm, remarks: e.target.value })
              }
            />

            <button className="bg-green-600 text-white rounded-xl px-4 py-2 font-bold">
              Return Now ✅
            </button>

            <p className="text-xs text-gray-500">
              Currently issued: <b>{issuedAssignments.length}</b>
            </p>
          </form>
        </div>
      </div>

      {/* ✅ Issued Assets Table (added) */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-black">Issued Assets List</h2>
            <p className="text-gray-600 text-sm">
              Return assets directly from this table
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={exportIssuedAssets}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
            >
              Export CSV
            </button>

            <button
              onClick={loadAll}
              className="px-4 py-2 rounded-xl bg-black text-white"
            >
              Refresh
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          Showing <b>{issuedAssignments.length}</b> issued assets
        </p>

        <div className="overflow-auto">
          <table className="w-full text-sm text-black">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Employee</th>
                <th className="p-2">Asset</th>
                <th className="p-2">Serial</th>
                <th className="p-2">Issue Date</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>

            <tbody>
              {issuedAssignments.map((h) => (
                <tr key={h.assignment_id} className="border-b">
                  <td className="p-2">
                    <div className="font-semibold">{h.emp_name}</div>
                    <div className="text-xs text-gray-500">{h.emp_id}</div>
                  </td>

                  <td className="p-2">{h.asset_type}</td>

                  <td className="p-2 font-mono">{h.serial_number}</td>

                  <td className="p-2">
                    {h.issue_date
                      ? new Date(h.issue_date).toLocaleString()
                      : "-"}
                  </td>

                  <td className="p-2">
                    <button
                      onClick={() => quickReturn(h.assignment_id)}
                      className="px-3 py-1 rounded-lg bg-green-600 text-white text-xs font-bold"
                    >
                      Return ✅
                    </button>
                  </td>
                </tr>
              ))}

              {issuedAssignments.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    No issued assets found ✅
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- rentals section ---------------- */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Rental Asset List</h1>
            <p className="text-gray-600 text-sm">
              Add rental laptops, issue/return, track end date
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={exportRentals}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
            >
              Export CSV
            </button>
            <button
              onClick={loadRentals}
              className="px-4 py-2 rounded-xl bg-black text-white font-bold"
            >
              {rentalLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <Input
            placeholder="Search rental by laptop / serial / status / employee..."
            value={rentalSearch}
            onChange={(e) => setRentalSearch(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Showing {filteredRentals.length} of {rentals.length}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-5">
          {/* add rental */}
          <div className="border rounded-2xl p-4">
            <h3 className="font-bold mb-3">Add Rental Laptop</h3>

            <form onSubmit={addRentalLaptop} className="grid gap-3">
              <Input
                placeholder="Laptop Name (example: Dell 5420)"
                value={rentalAddForm.laptop_name}
                onChange={(e) =>
                  setRentalAddForm({
                    ...rentalAddForm,
                    laptop_name: e.target.value,
                  })
                }
              />
              <Input
                placeholder="Serial Number (Ex: DTC-LAP-001)"
                value={rentalAddForm.serial_number}
                onChange={(e) =>
                  setRentalAddForm({
                    ...rentalAddForm,
                    serial_number: e.target.value,
                  })
                }
              />
              <Input
                placeholder="Configuration (i5/16GB/512GB)"
                value={rentalAddForm.configuration}
                onChange={(e) =>
                  setRentalAddForm({
                    ...rentalAddForm,
                    configuration: e.target.value,
                  })
                }
              />
              <Input
                placeholder="PO Date (YYYY-MM-DD)"
                value={rentalAddForm.po_date}
                onChange={(e) =>
                  setRentalAddForm({
                    ...rentalAddForm,
                    po_date: e.target.value,
                  })
                }
              />
              <Input
                placeholder="End Date (YYYY-MM-DD)"
                value={rentalAddForm.end_date}
                onChange={(e) =>
                  setRentalAddForm({
                    ...rentalAddForm,
                    end_date: e.target.value,
                  })
                }
              />

              <button className="bg-blue-600 text-white rounded-xl px-4 py-2 font-bold">
                Add Rental ✅
              </button>
            </form>
          </div>

          {/* issue rental */}
          <div className="border rounded-2xl p-4">
            <h3 className="font-bold mb-3">Issue Rental Laptop</h3>

            <form onSubmit={issueRentalLaptop} className="grid gap-3">
              <select
                className="border rounded-xl p-2 w-full bg-white text-black"
                value={rentalIssueForm.rental_id}
                onChange={(e) =>
                  setRentalIssueForm({
                    ...rentalIssueForm,
                    rental_id: e.target.value,
                  })
                }
              >
                <option value="">Select In Stock Laptop</option>
                {inStockRentals.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.laptop_name} ({r.serial_number})
                  </option>
                ))}
              </select>

              <select
                className="border rounded-xl p-2 w-full bg-white text-black"
                value={rentalIssueForm.employee_id}
                onChange={(e) =>
                  setRentalIssueForm({
                    ...rentalIssueForm,
                    employee_id: e.target.value,
                  })
                }
              >
                <option value="">Select Employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.emp_name} ({e.emp_id})
                  </option>
                ))}
              </select>

              <Input
                placeholder="Remarks (optional)"
                value={rentalIssueForm.remarks}
                onChange={(e) =>
                  setRentalIssueForm({
                    ...rentalIssueForm,
                    remarks: e.target.value,
                  })
                }
              />

              <button className="bg-green-600 text-white rounded-xl px-4 py-2 font-bold">
                Issue Rental ✅
              </button>

              <p className="text-xs text-gray-500">
                In Stock: <b>{inStockRentals.length}</b>
              </p>
            </form>
          </div>

          {/* return rental */}
          <div className="border rounded-2xl p-4">
            <h3 className="font-bold mb-3">Return Rental Laptop</h3>

            <form onSubmit={returnRentalLaptop} className="grid gap-3">
              <select
                className="border rounded-xl p-2 w-full bg-white text-black"
                value={rentalReturnForm.rental_id}
                onChange={(e) =>
                  setRentalReturnForm({
                    ...rentalReturnForm,
                    rental_id: e.target.value,
                  })
                }
              >
                <option value="">Select Issued Laptop</option>
                {issuedRentals.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.laptop_name} ({r.serial_number})
                  </option>
                ))}
              </select>

              <Input
                placeholder="Return remarks (optional)"
                value={rentalReturnForm.remarks}
                onChange={(e) =>
                  setRentalReturnForm({
                    ...rentalReturnForm,
                    remarks: e.target.value,
                  })
                }
              />

              <button className="bg-yellow-600 text-white rounded-xl px-4 py-2 font-bold">
                Return Rental ✅
              </button>

              <p className="text-xs text-gray-500">
                Issued: <b>{issuedRentals.length}</b>
              </p>
            </form>
          </div>
        </div>

        {/* rental table */}
        <div className="mt-6">
          <h2 className="font-bold text-lg mb-2">Rental Laptops</h2>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2">Laptop</th>
                  <th className="p-2">Serial</th>
                  <th className="p-2">PO Date</th>
                  <th className="p-2">End Date</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Employee</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRentals.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-2">
                      <div className="font-bold">{r.laptop_name}</div>
                      <div className="text-xs text-gray-500">
                        {r.configuration}
                      </div>
                    </td>
                    <td className="p-2 font-mono">{r.serial_number}</td>
                    <td className="p-2">{r.po_date || "-"}</td>
                    <td className="p-2">{r.end_date || "-"}</td>
                    <td className="p-2">{badge(r.status)}</td>
                    <td className="p-2">{r.employee_name || "-"}</td>

                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditRental(r)}
                          className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteRental(r.id)}
                          className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredRentals.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-gray-500">
                      No rentals found ✅
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingRental && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Edit Rental Laptop</h2>

            <div className="grid gap-3">
              <Input
                placeholder="Laptop Name"
                value={editRentalForm.laptop_name}
                onChange={(e) =>
                  setEditRentalForm({
                    ...editRentalForm,
                    laptop_name: e.target.value,
                  })
                }
              />
              <Input
                placeholder="Serial Number"
                value={editRentalForm.serial_number}
                onChange={(e) =>
                  setEditRentalForm({
                    ...editRentalForm,
                    serial_number: e.target.value,
                  })
                }
              />
              <Input
                placeholder="Configuration"
                value={editRentalForm.configuration}
                onChange={(e) =>
                  setEditRentalForm({
                    ...editRentalForm,
                    configuration: e.target.value,
                  })
                }
              />
              <Input
                placeholder="PO Date (YYYY-MM-DD)"
                value={editRentalForm.po_date}
                onChange={(e) =>
                  setEditRentalForm({
                    ...editRentalForm,
                    po_date: e.target.value,
                  })
                }
              />
              <Input
                placeholder="End Date (YYYY-MM-DD)"
                value={editRentalForm.end_date}
                onChange={(e) =>
                  setEditRentalForm({
                    ...editRentalForm,
                    end_date: e.target.value,
                  })
                }
              />

              <select
                className="border rounded-xl p-2 w-full bg-white text-black"
                value={editRentalForm.status}
                onChange={(e) =>
                  setEditRentalForm({
                    ...editRentalForm,
                    status: e.target.value,
                  })
                }
              >
                <option value="In Stock">In Stock</option>
                <option value="Issued">Issued</option>
                <option value="Returned">Returned</option>
              </select>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={saveEditRental}
                  className="flex-1 bg-green-600 text-white rounded-xl px-4 py-2 font-bold"
                >
                  Save ✅
                </button>
                <button
                  onClick={() => setEditingRental(null)}
                  className="flex-1 bg-gray-200 text-black rounded-xl px-4 py-2 font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
