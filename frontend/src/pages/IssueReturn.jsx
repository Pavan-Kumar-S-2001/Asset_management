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
      className="w-full rounded-xl border border-gray-300 bg-white p-2 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
      {...props}
    />
  );
}

function statusBadge(status) {
  if (status === "Assigned" || status === "Issued") {
    return (
      <span className="rounded-lg bg-yellow-200 px-2 py-1 text-xs font-bold text-yellow-900">
        Assigned
      </span>
    );
  }

  if (status === "Returned") {
    return (
      <span className="rounded-lg bg-blue-200 px-2 py-1 text-xs font-bold text-blue-900">
        Returned
      </span>
    );
  }

  return (
    <span className="rounded-lg bg-green-200 px-2 py-1 text-xs font-bold text-green-900">
      Available
    </span>
  );
}

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

function handleMailToast(data, actionLabel) {
  if (data?.mail_sent) {
    notifySuccess(
      data?.mail_recipient
        ? `Asset ${actionLabel} and email sent to ${data.mail_recipient}`
        : `Asset ${actionLabel} and email sent successfully`
    );
    return;
  }

  notifyInfo(
    data?.mail_error
      ? `Asset ${actionLabel}, but email failed: ${data.mail_error}`
      : `Asset ${actionLabel}, but the email was not sent.`
  );
}

export default function IssueReturn() {
  const [employees, setEmployees] = useState([]);
  const [companyAssets, setCompanyAssets] = useState([]);
  const [showRentalAssets, setShowRentalAssets] = useState(false);
  const [rentals, setRentals] = useState([]);
  const [issuedAssignments, setIssuedAssignments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [rentalLoading, setRentalLoading] = useState(false);

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [assetSearch, setAssetSearch] = useState("");

  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterAssetType, setFilterAssetType] = useState("");
  const [filterIssuedType, setFilterIssuedType] = useState("");

  const [rentalSearch, setRentalSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rentalsPerPage = 10;

  const [issueForm, setIssueForm] = useState({
    employee_id: "",
    asset_key: "",
    remarks: "",
    issued_type: "",
    other_issue_type: "",
    tracking_number: "",
  });

  const [rentalAddForm, setRentalAddForm] = useState({
    laptop_name: "",
    serial_number: "",
    configuration: "",
    po_date: "",
    end_date: "",
  });

  const [editingRental, setEditingRental] = useState(null);
  const [editRentalForm, setEditRentalForm] = useState({
    laptop_name: "",
    serial_number: "",
    configuration: "",
    po_date: "",
    end_date: "",
    status: "Available",
  });

  const loadAll = async () => {
    setLoading(true);
    setRentalLoading(true);

    try {
      const [empRes, assetRes, issuedRes, rentalRes] = await Promise.all([
        api.get("/employees"),
        api.get("/assets"),
        api.get("/issued-assets"),
        api.get("/rentals"),
      ]);

      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      setCompanyAssets(Array.isArray(assetRes.data) ? assetRes.data : []);
      setIssuedAssignments(Array.isArray(issuedRes.data) ? issuedRes.data : []);
      setRentals(Array.isArray(rentalRes.data) ? rentalRes.data : []);
    } catch (error) {
      console.error(error);
      notifyError("Backend API error");
    } finally {
      setLoading(false);
      setRentalLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const closeDropdown = () => setShowDropdown(false);
    window.addEventListener("click", closeDropdown);
    return () => window.removeEventListener("click", closeDropdown);
  }, []);

  const filteredEmployees = useMemo(() => {
    const search = employeeSearch.trim().toLowerCase();
    return employees.filter((employee) => {
      if (!search) {
        return true;
      }

      return (
        (employee.emp_name || "").toLowerCase().includes(search) ||
        (employee.emp_id || "").toLowerCase().includes(search) ||
        (employee.department || "").toLowerCase().includes(search)
      );
    });
  }, [employees, employeeSearch]);

  useEffect(() => {
    if (!showDropdown) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightIndex((current) =>
          Math.min(current + 1, Math.max(filteredEmployees.length - 1, 0))
        );
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightIndex((current) => Math.max(current - 1, 0));
      }

      if (event.key === "Enter" && highlightIndex >= 0) {
        event.preventDefault();
        const employee = filteredEmployees[highlightIndex];
        if (!employee) {
          return;
        }

        setIssueForm((current) => ({
          ...current,
          employee_id: String(employee.id),
        }));
        setEmployeeSearch(employee.emp_name || "");
        setShowDropdown(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredEmployees, highlightIndex, showDropdown]);

  const availableCompanyAssets = useMemo(
    () => companyAssets.filter((asset) => asset.status === "Available"),
    [companyAssets]
  );

  const issueableRentals = useMemo(
    () =>
      rentals.filter((rental) =>
        ["Available", "Returned"].includes(rental.status || "")
      ),
    [rentals]
  );

  const combinedAvailableAssets = useMemo(() => {
    const companyOptions = availableCompanyAssets.map((asset) => ({
      key: `company-${asset.id}`,
      id: asset.id,
      asset_source: "company",
      asset_type: asset.asset_type || "Asset",
      brand_model: asset.brand_model || "",
      serial_number: asset.serial_number || "",
      configuration: asset.brand_model || "",
      ownership_label: "Company",
      end_date: "",
    }));

    const rentalOptions = issueableRentals.map((rental) => ({
      key: `rental-${rental.id}`,
      id: rental.id,
      asset_source: "rental",
      asset_type: "Rental Asset",
      brand_model: rental.laptop_name || "",
      serial_number: rental.serial_number || "",
      configuration: rental.configuration || "",
      ownership_label: "Rental",
      end_date: rental.end_date || "",
    }));

    return [...companyOptions, ...rentalOptions];
  }, [availableCompanyAssets, issueableRentals]);

  const filteredAvailableAssets = useMemo(() => {
    const search = assetSearch.trim().toLowerCase();
    if (!search) {
      return combinedAvailableAssets;
    }

    return combinedAvailableAssets.filter((asset) => {
      return (
        (asset.asset_type || "").toLowerCase().includes(search) ||
        (asset.brand_model || "").toLowerCase().includes(search) ||
        (asset.serial_number || "").toLowerCase().includes(search) ||
        (asset.configuration || "").toLowerCase().includes(search) ||
        (asset.ownership_label || "").toLowerCase().includes(search)
      );
    });
  }, [assetSearch, combinedAvailableAssets]);

  const selectedEmployee = useMemo(
    () =>
      employees.find(
        (employee) => String(employee.id) === String(issueForm.employee_id)
      ) || null,
    [employees, issueForm.employee_id]
  );

  const selectedAsset = useMemo(
    () =>
      combinedAvailableAssets.find((asset) => asset.key === issueForm.asset_key) ||
      null,
    [combinedAvailableAssets, issueForm.asset_key]
  );

  const filteredIssuedAssignments = useMemo(() => {
    return issuedAssignments.filter((assignment) => {
      const employeeName = (assignment.emp_name || "").toLowerCase();
      const assetType = (assignment.asset_type || "").toLowerCase();
      const brandModel = (assignment.brand_model || "").toLowerCase();
      const serial = (assignment.serial_number || "").toLowerCase();
      const employeeFilter = filterEmployee.trim().toLowerCase();
      const assetFilter = filterAssetType.trim().toLowerCase();

      if (
        employeeFilter &&
        !employeeName.includes(employeeFilter) &&
        !(assignment.emp_id || "").toLowerCase().includes(employeeFilter)
      ) {
        return false;
      }

      if (
        assetFilter &&
        !assetType.includes(assetFilter) &&
        !brandModel.includes(assetFilter) &&
        !serial.includes(assetFilter)
      ) {
        return false;
      }

      if (
        filterIssuedType &&
        (assignment.issued_type || "").trim() !== filterIssuedType
      ) {
        return false;
      }

      return true;
    });
  }, [
    filterAssetType,
    filterEmployee,
    filterIssuedType,
    issuedAssignments,
  ]);

  const filteredRentals = useMemo(() => {
    const search = rentalSearch.trim().toLowerCase();
    if (!search) {
      return rentals;
    }

    return rentals.filter((rental) => {
      return (
        (rental.laptop_name || "").toLowerCase().includes(search) ||
        (rental.serial_number || "").toLowerCase().includes(search) ||
        (rental.configuration || "").toLowerCase().includes(search) ||
        (rental.status || "").toLowerCase().includes(search) ||
        (rental.employee_name || "").toLowerCase().includes(search)
      );
    });
  }, [rentalSearch, rentals]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredRentals.length / rentalsPerPage)
    );
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredRentals.length]);

  const paginatedRentals = useMemo(() => {
    const start = (currentPage - 1) * rentalsPerPage;
    return filteredRentals.slice(start, start + rentalsPerPage);
  }, [currentPage, filteredRentals]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRentals.length / rentalsPerPage)
  );

  const finalIssuedType = useMemo(() => {
    return issueForm.issued_type === "Others"
      ? issueForm.other_issue_type.trim()
      : issueForm.issued_type.trim();
  }, [issueForm.issued_type, issueForm.other_issue_type]);

  const issueAsset = async (event) => {
    event.preventDefault();

    if (!issueForm.employee_id || !selectedAsset) {
      notifyInfo("Select an employee and an available asset");
      return;
    }

    if (!finalIssuedType) {
      notifyInfo("Select the issue type");
      return;
    }

    const confirmed = await confirmPopup({
      title: "Issue Asset?",
      text: selectedEmployee?.email
        ? `Assign this asset and send the mail to ${selectedEmployee.email}?`
        : "Assign this asset now? The employee email is not available.",
      confirmButtonText: "Yes, Issue",
      cancelButtonText: "Cancel",
      icon: "question",
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await api.post("/issue", {
        employee_id: Number(issueForm.employee_id),
        asset_id: Number(selectedAsset.id),
        asset_source: selectedAsset.asset_source,
        remarks: issueForm.remarks,
        issued_type: finalIssuedType,
        tracking_number: issueForm.tracking_number.trim(),
      });

      setIssueForm({
        employee_id: "",
        asset_key: "",
        remarks: "",
        issued_type: "",
        other_issue_type: "",
        tracking_number: "",
      });
      setEmployeeSearch("");
      setAssetSearch("");

      await loadAll();
      handleMailToast(response.data, "issued");
    } catch (error) {
      console.error(error);
      notifyError(
        error?.response?.data?.error || "Failed to issue the selected asset"
      );
    }
  };

  const quickReturn = async (assignment) => {
    const confirmed = await confirmPopup({
      title: "Return Asset?",
      text: "Confirm asset return.",
      confirmButtonText: "Return",
      cancelButtonText: "Cancel",
      icon: "question",
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await api.post("/return", {
        assignment_id: Number(assignment.assignment_id),
        remarks: `Returned from Issue Laptop by admin`,
      });

      await loadAll();
      handleMailToast(response.data, "returned");
    } catch (error) {
      console.error(error);
      notifyError(
        error?.response?.data?.error || "Failed to return the selected asset"
      );
    }
  };

  const addRentalAsset = async (event) => {
    event.preventDefault();

    if (!rentalAddForm.laptop_name || !rentalAddForm.serial_number) {
      notifyInfo("Rental name and serial number are required");
      return;
    }

    try {
      await api.post("/rentals", rentalAddForm);
      notifySuccess("Rental asset added successfully");
      setRentalAddForm({
        laptop_name: "",
        serial_number: "",
        configuration: "",
        po_date: "",
        end_date: "",
      });
      await loadAll();
    } catch (error) {
      console.error(error);
      notifyError(
        error?.response?.data?.error || "Failed to add rental asset"
      );
    }
  };

  const importRentalsCSV = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post("/import/rentals", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      notifySuccess("Rental CSV imported successfully");
      await loadAll();
    } catch (error) {
      console.error(error);
      notifyError(
        error?.response?.data?.error || "Failed to import rental CSV"
      );
    } finally {
      event.target.value = "";
    }
  };

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

  const openEditRental = (rental) => {
    setEditingRental(rental);
    setEditRentalForm({
      laptop_name: rental.laptop_name || "",
      serial_number: rental.serial_number || "",
      configuration: rental.configuration || "",
      po_date: rental.po_date || "",
      end_date: rental.end_date || "",
      status: rental.status || "Available",
    });
  };

  const saveEditRental = async () => {
    if (!editingRental) {
      return;
    }

    try {
      await api.put(`/rentals/${editingRental.id}`, editRentalForm);
      notifySuccess("Rental updated successfully");
      setEditingRental(null);
      await loadAll();
    } catch (error) {
      console.error(error);
      notifyError(error?.response?.data?.error || "Failed to update rental");
    }
  };

  const deleteRental = async (rentalId) => {
    const confirmed = await confirmPopup({
      title: "Delete this rental asset?",
      text: "The active rental list entry will be removed. History will remain.",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      icon: "warning",
    });

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/rentals/${rentalId}`);
      notifySuccess("Rental deleted successfully");
      await loadAll();
    } catch (error) {
      console.error(error);
      notifyError(error?.response?.data?.error || "Failed to delete rental");
    }
  };

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr,1fr]">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-black">Issue Laptop</h1>
            <p className="text-sm text-gray-600">
              Assign both company and rental assets from one flow
            </p>
          </div>

          <form onSubmit={issueAsset} className="grid gap-3">
            <div
              className="relative"
              onClick={(event) => event.stopPropagation()}
            >
              <Input
                placeholder="Search Employee (name / id / dept)..."
                value={
                  employeeSearch ||
                  (issueForm.employee_id
                    ? selectedEmployee?.emp_name || ""
                    : "")
                }
                onFocus={() => setShowDropdown(true)}
                onChange={(event) => {
                  setEmployeeSearch(event.target.value);
                  setIssueForm((current) => ({
                    ...current,
                    employee_id: "",
                  }));
                  setShowDropdown(true);
                  setHighlightIndex(-1);
                }}
              />

              {(employeeSearch || issueForm.employee_id) && (
                <button
                  type="button"
                  className="absolute right-2 top-1.5 text-gray-400 hover:text-black"
                  onClick={() => {
                    setEmployeeSearch("");
                    setIssueForm((current) => ({
                      ...current,
                      employee_id: "",
                    }));
                    setShowDropdown(false);
                  }}
                >
                  x
                </button>
              )}

              {showDropdown && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border bg-white shadow-lg">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">
                      No employees found
                    </div>
                  ) : (
                    filteredEmployees.map((employee, index) => (
                      <div
                        key={employee.id}
                        className={`cursor-pointer p-2 ${
                          highlightIndex === index ? "bg-blue-100" : ""
                        }`}
                        onClick={() => {
                          setIssueForm((current) => ({
                            ...current,
                            employee_id: String(employee.id),
                          }));
                          setEmployeeSearch(employee.emp_name || "");
                          setShowDropdown(false);
                        }}
                        onMouseEnter={() => setHighlightIndex(index)}
                      >
                        <div className="font-medium">{employee.emp_name}</div>
                        <div className="text-xs text-gray-500">
                          {employee.emp_id} | {employee.department || "-"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedEmployee && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                Mail will be sent to{" "}
                <b>{selectedEmployee.email || "No registered email"}</b> for{" "}
                {selectedEmployee.emp_name}.
              </div>
            )}

            <select
              className="w-full rounded-xl border bg-white p-2 text-black"
              value={issueForm.issued_type}
              onChange={(event) =>
                setIssueForm((current) => ({
                  ...current,
                  issued_type: event.target.value,
                }))
              }
            >
              <option value="">Select Issue Type</option>
              <option value="By Hand">By Hand</option>
              <option value="By DTDC Courier">By DTDC Courier</option>
              <option value="Others">Others</option>
            </select>

            {issueForm.issued_type === "By DTDC Courier" && (
              <Input
                placeholder="Enter courier tracking number..."
                value={issueForm.tracking_number}
                onChange={(event) =>
                  setIssueForm((current) => ({
                    ...current,
                    tracking_number: event.target.value,
                  }))
                }
              />
            )}

            {issueForm.issued_type === "Others" && (
              <Input
                placeholder="Enter custom issue type..."
                value={issueForm.other_issue_type}
                onChange={(event) =>
                  setIssueForm((current) => ({
                    ...current,
                    other_issue_type: event.target.value,
                  }))
                }
              />
            )}

            <Input
            
              placeholder="Search available asset (type / name / serial / source)..."
              value={assetSearch}
              onChange={(event) => setAssetSearch(event.target.value)}
            />
           {assetSearch.trim() && (
  <p className="mt-1 text-xs text-gray-500">
    Matching assets: <b>{filteredAvailableAssets.length}</b>
  </p>
)}

            <select
              className="w-full rounded-xl border bg-white p-2 text-black"
              value={issueForm.asset_key}
              onChange={(event) =>
                setIssueForm((current) => ({
                  ...current,
                  asset_key: event.target.value,
                }))
              }
            >
              <option value="">Select Available Asset</option>

{filteredAvailableAssets.length === 0 ? (
  <option disabled>
    No matching assets found
  </option>
) : (
  filteredAvailableAssets.map((asset) => (
    <option key={asset.key} value={asset.key}>
      {asset.asset_type} | {asset.serial_number} | {asset.brand_model} | {asset.ownership_label}
    </option>
  ))
)}
            </select>

            {selectedAsset && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <div>
                  Selected asset: <b>{selectedAsset.asset_type}</b>
                </div>
                <div>
                  Name / Model: <b>{selectedAsset.brand_model || "-"}</b>
                </div>
                <div>
                  Serial: <b>{selectedAsset.serial_number || "-"}</b>
                </div>
                <div>
                  Source: <b>{selectedAsset.ownership_label}</b>
                </div>
                {selectedAsset.configuration && (
                  <div>
                    Configuration: <b>{selectedAsset.configuration}</b>
                  </div>
                )}
                {selectedAsset.end_date && (
                  <div>
                    Rental End Date: <b>{selectedAsset.end_date}</b>
                  </div>
                )}
              </div>
            )}

            <Input
              placeholder="Remarks (optional)"
              value={issueForm.remarks}
              onChange={(event) =>
                setIssueForm((current) => ({
                  ...current,
                  remarks: event.target.value,
                }))
              }
            />

            <button className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">
              Send Mail and Issue Asset
            </button>

            <p className="text-xs text-gray-500">
              Available now: <b>{combinedAvailableAssets.length}</b> | Company:{" "}
              <b>{availableCompanyAssets.length}</b> | Rental:{" "}
              <b>{issueableRentals.length}</b>
            </p>
          </form>
        </div>

        

      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="flex items-start justify-between gap-3">
  <div>
    
    <h2 className="text-2xl font-bold text-black">
      Rental Asset List
    </h2>

    <p className="text-sm text-gray-600">
      Upload, review, edit, and track rental assets.
    </p>
  </div>

  <div className="flex gap-3">
    <button
      onClick={() => setShowRentalAssets(!showRentalAssets)}
      className="rounded-xl bg-black px-4 py-2 font-bold text-white"
    >
      {showRentalAssets
        ? "Hide Rental Assets"
        : "Show Rental Assets"}
    </button>

    <button
      onClick={exportRentals}
      className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white"
    >
      Export CSV
    </button>

    <button
      onClick={loadAll}
      className="rounded-xl bg-black px-4 py-2 font-bold text-white"
    >
      {rentalLoading ? "Loading..." : "Refresh"}
    </button>
  </div>
</div>
{showRentalAssets && (
  <> 
        <div className="mt-4">
          <Input
            placeholder="Search rental by name / serial / status / employee..."
            value={rentalSearch}
            onChange={(event) => setRentalSearch(event.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">
            Showing {filteredRentals.length} of {rentals.length}
          </p>
        </div>

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="w-full text-sm text-black">
            <thead className="sticky top-0 bg-gray-100">
              <tr className="text-left">
                <th className="p-2">Laptop</th>
                <th className="p-2">Serial</th>
                <th className="p-2">Configuration</th>
                <th className="p-2">Status</th>
                <th className="p-2">Employee</th>
                <th className="p-2">Dates</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRentals.map((rental) => (
                <tr key={rental.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-semibold">
                    {rental.laptop_name || "-"}
                  </td>
                  <td className="p-2 font-mono">
                    {rental.serial_number || "-"}
                  </td>
                  <td className="p-2">{rental.configuration || "-"}</td>
                  <td className="p-2">{statusBadge(rental.status)}</td>
                  <td className="p-2">
                    <div>{rental.employee_name || "-"}</div>
                    <div className="text-xs text-gray-500">
                      {rental.employee_code || ""}
                    </div>
                  </td>
                  <td className="p-2 text-xs text-gray-600">
                    <div>
                      Issue:{" "}
                      {rental.issue_date
                        ? new Date(rental.issue_date).toLocaleString()
                        : "-"}
                    </div>
                    <div>
                      Return:{" "}
                      {rental.return_date
                        ? new Date(rental.return_date).toLocaleString()
                        : "-"}
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => openEditRental(rental)}
                        className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteRental(rental.id)}
                        className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white"
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
                    No rental assets found
                  </td>
                </tr>
                
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <button
              className="rounded-lg bg-gray-200 px-3 py-1 text-xs font-bold text-black disabled:opacity-50"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            >
              Prev
            </button>
            <span className="text-xs font-semibold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="rounded-lg bg-gray-200 px-3 py-1 text-xs font-bold text-black disabled:opacity-50"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(page + 1, totalPages))
              }
            >
              Next
            </button>
          </div>
      )}
  </>
)}
</div>
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Add Rental Asset</h3>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={exportRentals}
                  className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white"
                >
                  Export CSV
                </button>
                <label className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                  Import CSV
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={importRentalsCSV}
                  />
                </label>
              </div>
            </div>

            <form
              onSubmit={addRentalAsset}
              className="grid grid-cols-1 gap-3 md:grid-cols-2"
            >
              <Input
                placeholder="Laptop Name (example: Dell 5420)"
                value={rentalAddForm.laptop_name}
                onChange={(event) =>
                  setRentalAddForm((current) => ({
                    ...current,
                    laptop_name: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Serial Number"
                value={rentalAddForm.serial_number}
                onChange={(event) =>
                  setRentalAddForm((current) => ({
                    ...current,
                    serial_number: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Configuration"
                value={rentalAddForm.configuration}
                onChange={(event) =>
                  setRentalAddForm((current) => ({
                    ...current,
                    configuration: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="PO Date (YYYY-MM-DD)"
                value={rentalAddForm.po_date}
                onChange={(event) =>
                  setRentalAddForm((current) => ({
                    ...current,
                    po_date: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="End Date (YYYY-MM-DD)"
                value={rentalAddForm.end_date}
                onChange={(event) =>
                  setRentalAddForm((current) => ({
                    ...current,
                    end_date: event.target.value,
                  }))
                }
              />
              <button className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white md:col-span-2">
                Add Rental Asset
              </button>
            </form>
          </div>

          <div className="rounded-2xl border p-4">
            <h3 className="mb-3 font-bold">Status Summary</h3>
            <div className="grid gap-3 text-sm text-gray-700">
              <div className="rounded-xl bg-green-50 px-3 py-2">
                Available: <b>{rentals.filter((r) => r.status === "Available").length}</b>
              </div>
              <div className="rounded-xl bg-yellow-50 px-3 py-2">
                Assigned: <b>{rentals.filter((r) => r.status === "Assigned").length}</b>
              </div>
              <div className="rounded-xl bg-blue-50 px-3 py-2">
                Returned: <b>{rentals.filter((r) => r.status === "Returned").length}</b>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                Ready to issue from main flow: <b>{issueableRentals.length}</b>
              </div>
            </div>
          </div>
        </div>


      {editingRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">Edit Rental Asset</h2>

            <div className="grid gap-3">
              <Input
                placeholder="Laptop Name"
                value={editRentalForm.laptop_name}
                onChange={(event) =>
                  setEditRentalForm((current) => ({
                    ...current,
                    laptop_name: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Serial Number"
                value={editRentalForm.serial_number}
                onChange={(event) =>
                  setEditRentalForm((current) => ({
                    ...current,
                    serial_number: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Configuration"
                value={editRentalForm.configuration}
                onChange={(event) =>
                  setEditRentalForm((current) => ({
                    ...current,
                    configuration: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="PO Date (YYYY-MM-DD)"
                value={editRentalForm.po_date}
                onChange={(event) =>
                  setEditRentalForm((current) => ({
                    ...current,
                    po_date: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="End Date (YYYY-MM-DD)"
                value={editRentalForm.end_date}
                onChange={(event) =>
                  setEditRentalForm((current) => ({
                    ...current,
                    end_date: event.target.value,
                  }))
                }
              />

              <select
                className="w-full rounded-xl border bg-white p-2 text-black"
                value={editRentalForm.status}
                onChange={(event) =>
                  setEditRentalForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
              >
                <option value="Available">Available</option>
                <option value="Assigned">Assigned</option>
                <option value="Returned">Returned</option>
              </select>

              <div className="mt-2 flex gap-3">
                <button
                  onClick={saveEditRental}
                  className="flex-1 rounded-xl bg-green-600 px-4 py-2 font-bold text-white"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingRental(null)}
                  className="flex-1 rounded-xl bg-gray-200 px-4 py-2 font-bold text-black"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
  }