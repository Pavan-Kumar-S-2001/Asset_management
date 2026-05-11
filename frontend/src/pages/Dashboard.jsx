import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom"; // ✅ added

export default function Dashboard() {
  const navigate = useNavigate(); // ✅ added

  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState([]);
  const [history, setHistory] = useState([]);

  const loadAll = async () => {
    const [emp, ast, his] = await Promise.all([
      api.get("/employees"),
      api.get("/assets"),
      api.get("/history"),
    ]);
    setEmployees(emp.data || []);
    setAssets(ast.data || []);
    setHistory(his.data || []);
  };

  useEffect(() => {
    loadAll();
  }, []);

 const stats = useMemo(() => {

  const totalEmployees = employees.length;

  const ownAssets = assets.length;

  const availableAssets = assets.filter(
    (a) => a.status === "Available"
  ).length;

  const issuedAssets = assets.filter(
    (a) => a.status === "Issued"
  ).length;

  const rentalAssets = history.filter(
    (h) => h.asset_source === "rental"
  ).length;

  const cameraAssets = assets.filter(
    (a) =>
      a.asset_type?.toLowerCase().includes("camera")
  );

  const hardDiskAssets = assets.filter(
    (a) =>
      a.asset_type?.toLowerCase().includes("hard")
  );

  const nvrAssets = assets.filter(
    (a) =>
      a.asset_type?.toLowerCase().includes("nvr")
  );

  const pendriveAssets = assets.filter(
    (a) =>
      a.asset_type?.toLowerCase().includes("pendrive")
  );

  return {
    totalEmployees,
    ownAssets,
    availableAssets,
    issuedAssets,
    rentalAssets,

    cameraTotal: cameraAssets.length,
    cameraAvailable: cameraAssets.filter(
      (a) => a.status === "Available"
    ).length,

    hardDiskTotal: hardDiskAssets.length,
    hardDiskAvailable: hardDiskAssets.filter(
      (a) => a.status === "Available"
    ).length,

    nvrTotal: nvrAssets.length,
    nvrAvailable: nvrAssets.filter(
      (a) => a.status === "Available"
    ).length,

    pendriveTotal: pendriveAssets.length,
    pendriveAvailable: pendriveAssets.filter(
      (a) => a.status === "Available"
    ).length,
  };

}, [employees, assets, history]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-blue-900">
            DTC INFOTECH ASSET TRACKER
          </h1>
          <p className="text-m font-bold text-black-500">By S Pavan Kumar</p>
        </div>

        <button
          onClick={loadAll}
          className="px-5 py-2 rounded-xl bg-black text-white font-semibold hover:opacity-90"
        >
          Refresh
        </button>
      </div>

      {/* MAIN DASHBOARD CARDS */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">

  <StatCard
    title="Employees"
    value={stats.totalEmployees}
    sub="Total Employees"
    icon="👤"
    onClick={() => navigate("/employees")}
  />

  <StatCard
    title="Own Assets"
    value={stats.ownAssets}
    sub="Company Assets"
    icon="💻"
    onClick={() => navigate("/assets")}
  />

  <StatCard
    title="Rental Assets"
    value={stats.rentalAssets}
    sub="Rental Asset Count"
    icon="🏢"
    onClick={() => navigate("/issue-return")}
  />

  <StatCard
    title="Available Assets"
    value={stats.availableAssets}
    sub="Ready to Issue"
    icon="✅"
    onClick={() => navigate("/assets")}
  />

  <StatCard
    title="Issued Assets"
    value={stats.issuedAssets}
    sub="Currently Assigned"
    icon="📌"
    onClick={() => navigate("/issue-return")}
  />

</div>

      {/* Recent history */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Recent Activity</h2>
          <span className="text-xs text-gray-500">
            Latest {Math.min(8, history.length)} records
          </span>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Employee</th>
                <th className="p-2">Serial</th>
                <th className="p-2">Issue Date</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 8).map((h) => (
                <tr key={h.assignment_id} className="border-b">
                  <td className="p-2 font-semibold">{h.emp_name}</td>
                  <td className="p-2 font-mono">{h.serial_number}</td>
                  <td className="p-2">{h.issue_date}</td>
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
              ))}

              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">
                    No activity yet. Issue an asset to see history ✅
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

function StatCard({
  title,
  value,
  sub,
  icon,
  onClick,
}) {
  return (
    <div
      onClick={onClick} // ✅ added
      className="bg-white rounded-2xl shadow p-5 hover:shadow-xl transition cursor-pointer select-none" // ✅ added cursor-pointer
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-semibold">
  {title}
</p>
          <p className="text-4xl font-extrabold mt-1 text-black">{value}</p>
          <p className="text-sm text-gray-500 mt-2">
  {sub}
</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

function CategoryCard({
  title,
  total,
  available,
  icon,
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 hover:shadow-xl transition">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-gray-500 text-sm font-semibold">
            {title}
          </p>

          <h2 className="text-3xl font-extrabold text-black mt-2">
            {total}
          </h2>

          <p className="text-sm text-green-600 font-bold mt-2">
            Available: {available}
          </p>

        </div>

        <div className="text-5xl">
          {icon}
        </div>

      </div>

    </div>
  );
}
