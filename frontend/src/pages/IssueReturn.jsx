import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

import {
  confirmPopup,
  notifyError,
  notifyInfo,
  notifySuccess,
} from "../ui/alerts";

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

  // pagination for rental list
  const [currentPage, setCurrentPage] = useState(1);
  const rentalsPerPage = 10; // you can change to 20 if needed

  // This is for Dropdown search
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [assetSearch, setAssetSearch] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterAssetType, setFilterAssetType] = useState("");
  const [filterIssuedType, setFilterIssuedType] = useState("");

  const [issuedType, setIssuedType] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  // this is rentals
  const [rentals, setRentals] = useState([]);
  const [rentalSearch, setRentalSearch] = useState("");
  // employee search for return rental
  const [rentalReturnEmployeeSearch, setRentalReturnEmployeeSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [rentalLoading, setRentalLoading] = useState(false);

  // this is issue/return for main asset
  const [issueForm, setIssueForm] = useState({
    employee_id: "",
    asset_id: "",
    remarks: "",
    issued_type: "",
    other_issue_type: "",
    tracking_number: "", // NEW
  });

  const [returnForm, setReturnForm] = useState({
    assignment_id: "",
    remarks: "",
  });

  // this is my rental add
  const [rentalAddForm, setRentalAddForm] = useState({
    laptop_name: "",
    serial_number: "",
    configuration: "",
    po_date: "",
    end_date: "",
  });

  // this is for the rental issue/return
  const [rentalIssueForm, setRentalIssueForm] = useState({
    rental_id: "",
    employee_id: "",
    remarks: "",
  });

  const [rentalReturnForm, setRentalReturnForm] = useState({
  rental_id: "",
  employee_id: "", // NEW (for search selection only)
  remarks: "",
  });

  // this is to rental edit modal
  const [editingRental, setEditingRental] = useState(null);
  const [editRentalForm, setEditRentalForm] = useState({
    laptop_name: "",
    serial_number: "",
    configuration: "",
    po_date: "",
    end_date: "",
    status: "In Stock",
  });

  // to load 
  const loadAll = async () => {
  setLoading(true);

  try {
    const [emp, ast, issued] = await Promise.all([
      api.get("/employees"),
      api.get("/assets"),
      api.get("/issued-assets") // ✅ FIXED
    ]);

    setEmployees(emp.data || []);
    setAssets(ast.data || []);
    setHistory(issued.data || []); // now only issued data
  } catch (e) {
    console.error(e);
    notifyError("Backend API error ❌");
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
      notifyError("Rental API not reachable ❌");
    } finally {
      setRentalLoading(false);
    }
  };

  useEffect(() => {
  loadAll();        
  loadRentals();   
}, []);

useEffect(() => {
  const handleClickOutside = () => {
    setShowDropdown(false);
  };

  window.addEventListener("click", handleClickOutside);
  return () => window.removeEventListener("click", handleClickOutside);
}, []);


  // for computed
  const availableAssets = useMemo(
    () => assets.filter((a) => a.status === "Available"),
    [assets]
  );

  const selectedEmployee = useMemo(
    () =>
      employees.find(
        (employee) => String(employee.id) === String(issueForm.employee_id)
      ) || null,
    [employees, issueForm.employee_id]
  );

  const selectedAsset = useMemo(
    () =>
      assets.find((asset) => String(asset.id) === String(issueForm.asset_id)) ||
      null,
    [assets, issueForm.asset_id]
  );

  const issuedAssignments = useMemo(() => {
  return history.filter((h) => {
    const empName = (h.emp_name || "").toLowerCase().trim();
    const assetType = (h.asset_type || "").toLowerCase().trim();
    const searchEmp = filterEmployee.toLowerCase().trim();
    const searchAsset = filterAssetType.toLowerCase().trim();

    if (searchEmp && !empName.includes(searchEmp)) return false;
    if (searchAsset && !assetType.includes(searchAsset)) return false;
    if (filterIssuedType && h.issued_type !== filterIssuedType) return false;

    return true;
  });
}, [history, filterEmployee, filterAssetType, filterIssuedType]);

  const filteredEmployees = useMemo(() => {
  const s = (employeeSearch || "").toLowerCase().trim();

  return (employees || []).filter((e) => {
    const name = String(e.emp_name || "").toLowerCase().trim();
    const id = String(e.emp_id || "").toLowerCase().trim();   // ✅ FIX
    const dept = String(e.department || "").toLowerCase().trim();

    if (!s) return true;

    return (
      name.includes(s) ||
      id.includes(s) ||
      dept.includes(s)
    );
  });
}, [employees, employeeSearch]);

useEffect(() => {
  if (!showDropdown) return;

  const handleKeyDown = (e) => {
    if (!Array.isArray(filteredEmployees)) return;

    if (e.key === "ArrowDown") {
      setHighlightIndex((prev) =>
        prev < filteredEmployees.length - 1 ? prev + 1 : prev
      );
    }

    if (e.key === "ArrowUp") {
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : 0));
    }

    if (e.key === "Enter" && highlightIndex >= 0) {
      const selected = filteredEmployees[highlightIndex];
      if (selected) {
        setIssueForm(prev => ({
          ...prev,
          employee_id: selected.id,
        }));
        setEmployeeSearch(selected.emp_name);
        setShowDropdown(false);
      }
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [showDropdown, highlightIndex, filteredEmployees]);

useEffect(() => {
  if (filteredEmployees.length === 1) {
    setIssueForm(prev => ({
      ...prev,
      employee_id: filteredEmployees[0].id
    }));
  }
}, [filteredEmployees]);

  //filtered employees for return rental search
const filteredReturnEmployees = useMemo(() => {
  const s = (rentalReturnEmployeeSearch || "").toLowerCase().trim();

  return (employees || []).filter((e) => {
    const name = String(e.emp_name || "").toLowerCase().trim();
    const id = String(e.emp_id || "").toLowerCase().trim();
    const dept = String(e.department || "").toLowerCase().trim();

    if (!s) return true;

    return (
      name.includes(s) ||
      id.includes(s) ||
      dept.includes(s)
    );
  });
}, [employees, rentalReturnEmployeeSearch]);

useEffect(() => {
  if (filteredReturnEmployees.length === 1) {
    setRentalReturnForm(prev => ({
      ...prev,
      employee_id: filteredReturnEmployees[0].id
    }));
  }
}, [filteredReturnEmployees]);

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

  // pagination logic (for 1000+ laptops performance)
  const paginatedRentals = useMemo(() => {
    const start = (currentPage - 1) * rentalsPerPage;
    const end = start + rentalsPerPage;
    return filteredRentals.slice(start, end);
  }, [filteredRentals, currentPage]);

  const totalPages = Math.ceil(filteredRentals.length / rentalsPerPage);

  // this is the main asset handlers
  const issueAsset = async (e) => {
    e.preventDefault();
    if (!issueForm.employee_id || !issueForm.asset_id) {
      notifyInfo("Select Employee and Available Asset");
      return;
    }

    const ok = await confirmPopup({
      title: "Issued Asset?",
      text: selectedEmployee?.email
        ? `Assign this asset and send the mail to ${selectedEmployee.email}?`
        : "Assign this asset now? The employee email is not available.",
      confirmButtonText: "Yes, Send Mail",
      cancelButtonText: "Cancel",
      icon: "question",
    });
    if (!ok) return;

    try {

      const response = await api.post("/issue", {
        employee_id: Number(issueForm.employee_id),
        asset_id: Number(issueForm.asset_id),
        remarks: issueForm.remarks,
        issued_type:
          issueForm.issued_type === "Others"
            ? issueForm.other_issue_type
            : issueForm.issued_type,
        tracking_number: issueForm.tracking_number || "",
      });
      
      setIssueForm({
        employee_id: "",
        asset_id: "",
        remarks: "",
        issued_type: "",
        other_issue_type: "",
        tracking_number: "",
      });
      await loadAll();
      if (response.data?.mail_sent) {
        notifySuccess(
          response.data?.mail_recipient
            ? `Asset issued and email sent to ${response.data.mail_recipient}`
            : "Asset issued and email sent successfully"
        );
        return;
      }
      notifyInfo(
        "Asset issued, but the email was not sent. Check the employee email and Outlook mail settings."
      );
      return;
      /*
      notifySuccess("Asset issued ✅");
      */
    } catch (e2) {
      console.error(e2);
      notifyError("Issue failed ❌");
    }
  };

  const returnAsset = async (e) => {
    e.preventDefault();
    if (!returnForm.assignment_id) {
      notifyInfo("Select issued assignment to return");
      return;
    }

    const ok = await confirmPopup({
      title: "Return Asset?",
      text: "Confirm asset return.",
      confirmButtonText: "Yes, Return",
      cancelButtonText: "Cancel",
      icon: "question",
    });
    if (!ok) return;

    try {
      await api.post("/return", {
        assignment_id: Number(returnForm.assignment_id),
        remarks: returnForm.remarks,
      });

      setReturnForm({ assignment_id: "", remarks: "" });
      await loadAll();
      notifySuccess("Asset returned ✅");
    } catch (e2) {
      console.error(e2);
      notifyError("Return failed ❌");
    }
  };

  // this is Quick Return
  const quickReturn = async (assignment_id) => {
    const ok = await confirmPopup({
      title: "Return this asset?",
      text: "Confirm quick return.",
      confirmButtonText: "Return",
      cancelButtonText: "Cancel",
      icon: "question",
    });
    if (!ok) return;

    try {
      await api.post("/return", {
        assignment_id: Number(assignment_id),
        remarks: "Returned via quick return",
      });

      notifySuccess("Asset returned ✅");
      await loadAll();
    } catch (e) {
      console.error(e);
      notifyError("Quick return failed ❌");
    }
  };

  // rentals handlers
  const addRentalLaptop = async (e) => {
    e.preventDefault();
    if (!rentalAddForm.laptop_name || !rentalAddForm.serial_number) {
      notifyInfo("Laptop name & serial number required");
      return;
    }

    try {
      await api.post("/rentals", rentalAddForm);
      notifySuccess("Rental laptop added ✅");
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
      notifyError("Failed to add rental ❌");
    }
  };

  // import rentals CSV
const importRentalsCSV = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    await api.post("/import/rentals", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    notifySuccess("Rental CSV imported successfully ✅");
    await loadRentals();
  } catch (err) {
    console.error(err);
    notifyError("Failed to import CSV ❌");
  }
};

  const issueRentalLaptop = async (e) => {
    e.preventDefault();
    if (!rentalIssueForm.rental_id || !rentalIssueForm.employee_id) {
      notifyInfo("Select Laptop and Employee");
      return;
    }

    const ok = await confirmPopup({
      title: "Issue Rental Laptop?",
      text: "Are you sure you want to issue this rental laptop?",
      confirmButtonText: "Yes, Issue",
      cancelButtonText: "Cancel",
      icon: "question",
    });
    if (!ok) return;

    try {
      await api.post("/rentals/issue", {
        rental_id: Number(rentalIssueForm.rental_id),
        employee_id: Number(rentalIssueForm.employee_id),
        remarks: rentalIssueForm.remarks,
      });

      notifySuccess("Rental issued ✅");
      setRentalIssueForm({ rental_id: "", employee_id: "", remarks: "" });
      await loadRentals();
    } catch (e) {
      console.error(e);
      notifyError("Failed to issue rental ❌");
    }
  };

  const returnRentalLaptop = async (e) => {
    e.preventDefault();
    if (!rentalReturnForm.rental_id) {
      notifyInfo("Select Issued Laptop");
      return;
    }

    const ok = await confirmPopup({
      title: "Return Rental Laptop?",
      text: "Confirm rental return.",
      confirmButtonText: "Yes, Return",
      cancelButtonText: "Cancel",
      icon: "question",
    });
    if (!ok) return;

    try {
      await api.post("/rentals/return", {
        rental_id: Number(rentalReturnForm.rental_id),
        remarks: rentalReturnForm.remarks,
      });

      notifySuccess("Rental returned ✅");
      // setRentalReturnForm({ rental_id: "", remarks: "" });
      setRentalReturnForm({ rental_id: "", employee_id: "", remarks: "" });
      await loadRentals();
    } catch (e) {
      console.error(e);
      notifyError("Failed to return rental ❌");
    }
  };

  // this is export rentals
  const exportRentals = () => {
    const base =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
    window.open(`${base}/export/rentals.csv`, "_blank");
  };

  const exportIssuedAssets = () => {
    const base =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
    window.open(`${base}/export/issued-assets.csv`, "_blank");
  };
  
  // this for edit or delete rental list
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
      notifySuccess("Rental updated ✅");
      setEditingRental(null);
      await loadRentals();
    } catch (e) {
      console.error(e);
      notifyError("Failed to update rental ❌");
    }
  };

  const deleteRental = async (id) => {
    const ok = await confirmPopup({
      title: "Delete this rental laptop?",
      text: "This cannot be undone.",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      icon: "warning",
    });
    if (!ok) return;

    try {
      await api.delete(`/rentals/${id}`);
      notifySuccess("Rental deleted ✅");
      await loadRentals();
    } catch (e) {
      console.error(e);
      notifyError("Failed to delete rental ❌");
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
      <div className="grid grid-cols-1 gap-6">
        {/* ISSUE */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-bold">Issued Asset</h1>
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

  {/* 🔥 EMPLOYEE SEARCH DROPDOWN */}
  <div className="relative">

    <div className="relative">
      <Input
        placeholder="Search Employee (name / id / dept)..."
        value={
          employeeSearch ||
          (issueForm.employee_id
            ? employees.find(e => e.id == issueForm.employee_id)?.emp_name || ""
            : "")
        }
        onFocus={() => setShowDropdown(true)}
        onChange={(e) => {
          setEmployeeSearch(e.target.value);
          setIssueForm(prev => ({ ...prev, employee_id: "" }));
          setShowDropdown(true);
          setHighlightIndex(-1);
        }}
      />

      {/* 🔽 Dropdown icon */}
      <span className="absolute right-10 top-2.5 text-gray-400">▾</span>

      {/* ❌ Clear button */}
      {(employeeSearch || issueForm.employee_id) && (
        <button
          type="button"
          onClick={() => {
            setEmployeeSearch("");
            setIssueForm(prev => ({ ...prev, employee_id: "" }));
            setShowDropdown(false);
          }}
          className="absolute right-2 top-1.5 text-gray-400 hover:text-black"
        >
          ✕
        </button>
      )}
    </div>

    {/* DROPDOWN */}
    {showDropdown && (
      <div className="absolute z-50 w-full bg-white border rounded-xl shadow-lg mt-1 max-h-60 overflow-y-auto">

        {filteredEmployees.length === 0 ? (
          <div className="p-2 text-gray-500 text-sm">No employees found</div>
        ) : (
          filteredEmployees.map((e, index) => (
            <div
              key={e.id}
              onClick={() => {
                setIssueForm(prev => ({
                  ...prev,
                  employee_id: e.id,
                }));
                setEmployeeSearch(e.emp_name);
                setShowDropdown(false);
              }}
              onMouseEnter={() => setHighlightIndex(index)}
              className={`p-2 cursor-pointer ${
                highlightIndex === index ? "bg-blue-100" : ""
              }`}
            >
              <div className="font-medium">{e.emp_name}</div>
              <div className="text-xs text-gray-500">
                {e.emp_id} • {e.department}
              </div>
            </div>
          ))
        )}

      </div>
    )}

  </div>

  {selectedEmployee && (
    <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
      Mail will be sent to <b>{selectedEmployee.email || "No registered email"}</b>
      {" "}for {selectedEmployee.emp_name}.
    </div>
  )}

  {/* 🔥 Issued Type */}
  <select
    className="border rounded-xl p-2 w-full bg-white text-black"
    value={issueForm.issued_type}
    onChange={(e) =>
      setIssueForm({ ...issueForm, issued_type: e.target.value })
    }
  >
    <option value="">Select Issued Type</option>
    <option value="By Hand">By Hand</option>
    <option value="By DTDC Courier">By DTDC Courier</option>
    <option value="Others">Others</option>
  </select>

  {/* COURIER */}
  {issueForm.issued_type === "By DTDC Courier" && (
    <Input
      placeholder="Enter DTDC Tracking Number..."
      value={issueForm.tracking_number}
      onChange={(e) =>
        setIssueForm({
          ...issueForm,
          tracking_number: e.target.value,
        })
      }
    />
  )}

  {/* OTHER TYPE */}
  {issueForm.issued_type === "Others" && (
    <Input
      placeholder="Enter custom issued type..."
      value={issueForm.other_issue_type}
      onChange={(e) =>
        setIssueForm({
          ...issueForm,
          other_issue_type: e.target.value,
        })
      }
    />
  )}

  {/* 🔍 ASSET SEARCH */}
  <Input
    placeholder="Search Available Asset (type / serial / brand)..."
    value={assetSearch}
    onChange={(e) => setAssetSearch(e.target.value)}
  />

  {/* ASSET SELECT */}
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

  {selectedAsset && (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
      Selected asset: <b>{selectedAsset.asset_type}</b> | Configuration:{" "}
      <b>{selectedAsset.brand_model || "-"}</b> | Serial:{" "}
      <b>{selectedAsset.serial_number || "-"}</b>
    </div>
  )}

  {/* REMARKS */}
  <Input
    placeholder="Remarks (optional)"
    value={issueForm.remarks}
    onChange={(e) =>
      setIssueForm({ ...issueForm, remarks: e.target.value })
    }
  />

  {/* SUBMIT */}
  <button className="bg-blue-600 text-white rounded-xl px-4 py-2 font-bold">
    <span>Send Mail &amp; Issue Asset</span>
    {/*
    Issue Now ✅
    */}
  </button>

  <p className="text-xs text-gray-500">
    Available assets: <b>{availableAssets.length}</b>
  </p>

</form>
        </div>

        {/* ---------------- main issue return ---------------- */}
      </div>

      {/* Issued Assets Table */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-black">Issued Assets List</h2>
            {/* 🔎 Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 mb-3">

              <Input
                placeholder="Filter by Employee..."
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
              />

              <Input
                placeholder="Filter by Asset Type..."
                value={filterAssetType}
                onChange={(e) => setFilterAssetType(e.target.value)}
              />

              <select
                className="border rounded-xl p-2 bg-white text-black"
                value={filterIssuedType}
                onChange={(e) => setFilterIssuedType(e.target.value)}
              >
                <option value="">All Issue Types</option>
                <option value="By Hand">By Hand</option>
                <option value="By DTDC Courier">By DTDC Courier</option>
              </select>

            </div>
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
                <th className="p-2">Issued Type</th>
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

                  {/* 🔥 ADD THIS NEW COLUMN */}
                  <td className="p-2">
                    {h.issued_type || "-"}
                  </td>

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
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    No issued assets found ✅
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* rentals section */}
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

        {/* Rental Laptop List */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">Rental Laptop List</h4>
            <p className="text-xs text-gray-500">
              Showing {paginatedRentals.length} of {filteredRentals.length}
            </p>
          </div>

          <div className="max-h-72 overflow-auto border rounded-xl">
            <table className="w-full text-sm text-black">
              <thead className="bg-gray-100 sticky top-0">
                <tr className="text-left">
                  <th className="p-2">Laptop</th>
                  <th className="p-2">Serial</th>
                  <th className="p-2">Configuration</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Employee</th>
                  <th className="p-2 text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedRentals.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-semibold">
                      {r.laptop_name || "-"}
                    </td>

                    <td className="p-2 font-mono">
                      {r.serial_number || "-"}
                    </td>

                    <td className="p-2">
                      {r.configuration || "-"}
                    </td>

                    {/* ✅ STATUS BADGE (uses your existing badge function) */}
                    <td className="p-2">
                      {badge(r.status)}
                    </td>

                    <td className="p-2">
                      {r.employee_name || "—"}
                    </td>

                    {/* ✅ EDIT + DELETE BUTTONS */}
                    <td className="p-2">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => openEditRental(r)}
                          className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold"
                        >
                          Edit ✏️
                        </button>

                        <button
                          onClick={() => deleteRental(r.id)}
                          className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold"
                        >
                          Delete 🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredRentals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      No rental laptops found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ✅ PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg bg-gray-200 text-black text-xs font-bold disabled:opacity-50"
              >
                ◀ Prev
              </button>

              <span className="text-xs font-semibold">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg bg-gray-200 text-black text-xs font-bold disabled:opacity-50"
              >
                Next ▶
              </button>
            </div>
          )}
        </div>

        {/* ✅ rest of your JSX stays same */}
        {/* I am not changing UI layout further */}

                {/* (Keeping your full layout same) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-5">

          {/* add rental */}
          <div className="border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Add Rental Laptop</h3>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={exportRentals}
                  className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold"
                >
                  Export CSV
                </button>

                <label className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer">
                  Import CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={importRentalsCSV}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

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
              <Input
                placeholder="Search Employee (name / id / dept)..."
                value={rentalReturnEmployeeSearch}
                onChange={(e) =>
                  setRentalReturnEmployeeSearch(e.target.value)
                }
              />

              <select
                className="border rounded-xl p-2 w-full bg-white text-black"
                value={rentalReturnForm.employee_id}
                onChange={(e) =>
                  setRentalReturnForm({
                    ...rentalReturnForm,
                    employee_id: e.target.value,
                  })
                }
              >
                <option value="">Select Employee (optional)</option>
                {filteredReturnEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.emp_name} ({e.emp_id}) - {e.department}
                  </option>
                ))}
              </select>

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
                    {r.laptop_name} ({r.serial_number}) - {r.employee_name || "No Employee"}
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
        </div> {/* ✅ FIX 1: Close grid */}

      </div> {/* ✅ FIX 2: Close rentals section card */}

      {/* EDIT MODAL (your modal already graphical, no changes needed) */}
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
