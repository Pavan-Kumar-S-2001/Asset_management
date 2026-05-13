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
      className="w-full rounded-xl border border-gray-300 bg-white p-2 text-black"
      {...props}
    />
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
      ? `Asset ${actionLabel}, but email failed`
      : `Asset ${actionLabel}, but email not sent`
  );
}

export default function IssuedAssets() {
  const [issuedAssignments, setIssuedAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterAssetType, setFilterAssetType] = useState("");
  const [filterIssuedType, setFilterIssuedType] = useState("");

  const loadIssuedAssets = async () => {
    setLoading(true);

    try {
      const response = await api.get("/issued-assets");
      setIssuedAssignments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      notifyError("Failed to load issued assets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  loadIssuedAssets();

  const interval = setInterval(() => {
    loadIssuedAssets();
  }, 10000);

  return () => clearInterval(interval);
}, []);

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
        remarks: `Returned from Issued Assets page`,
      });

      await loadIssuedAssets();
      handleMailToast(response.data, "returned");
    } catch (error) {
      console.error(error);
      notifyError(
        error?.response?.data?.error || "Failed to return asset"
      );
    }
  };

  const exportIssuedAssets = () => {
    const base =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

    window.open(`${base}/export/issued-assets.csv`, "_blank");
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-black">
            Issued Assets List
          </h2>

          <p className="text-sm text-gray-600">
            View and manage all issued assets
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportIssuedAssets}
            className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white"
          >
            Export CSV
          </button>

          <button
            onClick={loadIssuedAssets}
            className="rounded-xl bg-black px-4 py-2 text-white"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
        <Input
          placeholder="Filter by employee..."
          value={filterEmployee}
          onChange={(event) => setFilterEmployee(event.target.value)}
        />

        <Input
          placeholder="Filter by asset / serial..."
          value={filterAssetType}
          onChange={(event) => setFilterAssetType(event.target.value)}
        />

        <select
          className="rounded-xl border bg-white p-2 text-black"
          value={filterIssuedType}
          onChange={(event) => setFilterIssuedType(event.target.value)}
        >
          <option value="">All Issue Types</option>
          <option value="By Hand">By Hand</option>
          <option value="By DTDC Courier">By DTDC Courier</option>
        </select>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm text-black">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2">Employee</th>
              <th className="p-2">Asset</th>
              <th className="p-2">Source</th>
              <th className="p-2">Serial</th>
              <th className="p-2">Issue Type</th>
              <th className="p-2">Issue Date</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredIssuedAssignments.map((assignment) => (
              <tr key={assignment.assignment_id} className="border-b">
                <td className="p-2">
                  <div className="font-semibold">
                    {assignment.emp_name}
                  </div>

                  <div className="text-xs text-gray-500">
                    {assignment.emp_id}
                  </div>
                </td>

                <td className="p-2">
                  <div className="font-semibold">
                    {assignment.asset_type}
                  </div>

                  <div className="text-xs text-gray-500">
                    {assignment.brand_model || "-"}
                  </div>
                </td>

                <td className="p-2">
                  {sourceBadge(assignment.asset_source)}
                </td>

                <td className="p-2 font-mono">
                  {assignment.serial_number}
                </td>

                <td className="p-2">
                  {assignment.issued_type || "-"}
                </td>

                <td className="p-2">
                  {assignment.issue_date
                    ? new Date(
                        assignment.issue_date
                      ).toLocaleString()
                    : "-"}
                </td>

                <td className="p-2">
                  <button
                    onClick={() => quickReturn(assignment)}
                    className="rounded-lg bg-green-600 px-3 py-1 text-xs font-bold text-white"
                  >
                    Return
                  </button>
                </td>
              </tr>
            ))}

            {filteredIssuedAssignments.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="p-4 text-center text-gray-500"
                >
                  No issued assets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}