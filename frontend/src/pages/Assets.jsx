import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useLocation } from "react-router-dom";

import {
  confirmPopup,
  notifyError,
  notifyInfo,
  notifySuccess,
} from "../ui/alerts";

/* Asset type options */
const ASSET_TYPES = [
  "Laptop",
  "Keyboard",
  "Mouse",
  "TP Link Router",
  "Hard Disk",
  "Other",
];

export default function Assets() {
  const location = useLocation();

  const [assets, setAssets] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  /* NEW: asset type filter */
  const [typeFilter, setTypeFilter] = useState("");

  const [form, setForm] = useState({
  asset_type: "",
  brand_model: "",
  serial_number: "",
  configuration: "",
  condition: "Good",
});

  const [customAssetType, setCustomAssetType] = useState("");
  const [editingId, setEditingId] = useState(null);

  const statusFilter = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("status") || "";
  }, [location.search]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const res = await api.get("/assets");
      setAssets(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      notifyError("Backend not reachable ❌ (Check Flask running on 5000)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const filtered = useMemo(() => {
    let list = assets;

    /* status filter */
    if (statusFilter) {
      list = list.filter((a) => (a.status || "") === statusFilter);
    }

    /* ✅ asset type dropdown filter */
    if (typeFilter) {
      list = list.filter((a) => (a.asset_type || "") === typeFilter);
    }

    const s = q.trim().toLowerCase();
    if (!s) return list;

    return list.filter((a) => {
      return (
        (a.asset_type || "").toLowerCase().includes(s) ||
        (a.brand_model || "").toLowerCase().includes(s) ||
        (a.serial_number || "").toLowerCase().includes(s) ||
        (a.status || "").toLowerCase().includes(s)
      );
    });
  }, [assets, q, statusFilter, typeFilter]);

  const saveAsset = async (e) => {
    e.preventDefault();

    const finalAssetType =
      form.asset_type === "Other" ? customAssetType : form.asset_type;

    if (!finalAssetType || !form.serial_number) {
      notifyError("Asset Type and Serial Number required ❌");
      return;
    }

    const payload = {
      ...form,
      asset_type: finalAssetType,
    };

    try {
      if (editingId) {
        await api.put(`/assets/${editingId}`, payload);
        notifySuccess("Asset updated ✅");
      } else {
        await api.post("/assets", payload);
        notifySuccess("Asset saved ✅");
      }

      setForm({
  asset_type: "",
  brand_model: "",
  serial_number: "",
  configuration: "",
  condition: "Good",
});
      setCustomAssetType("");
      setEditingId(null);
      await loadAssets();
    } catch (err) {
      console.error(err);
      notifyError("Error saving asset ❌ (serial number may already exist)");
    }
  };

  const startEdit = (a) => {
    setEditingId(a.id);

    if (ASSET_TYPES.includes(a.asset_type)) {

  setForm({
    asset_type: a.asset_type || "",
    brand_model: a.brand_model || "",
    serial_number: a.serial_number || "",
    configuration: a.configuration || "",
    condition: a.condition || "Good",
  });

  setCustomAssetType("");

} else {

  setForm({
    asset_type: "Other",
    brand_model: a.brand_model || "",
    serial_number: a.serial_number || "",
    configuration: a.configuration || "",
    condition: a.condition || "Good",
  });

  setCustomAssetType(a.asset_type || "");
    }

  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
  asset_type: "",
  brand_model: "",
  serial_number: "",
  configuration: "",
  condition: "Good",
});
    setCustomAssetType("");
    notifyInfo("Edit cancelled ❌");
  };

  const deleteAsset = async (id) => {
    const ok = await confirmPopup({
      title: "Delete this asset?",
      text: "This cannot be undone.",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      icon: "warning",
    });
    if (!ok) return;

    try {
      await api.delete(`/assets/${id}`);
      notifySuccess("Asset deleted ✅");
      await loadAssets();
    } catch (e) {
      console.error(e);
      notifyError("Delete failed ❌");
    }
  };

  const exportCSV = async () => {
    try {
      const res = await api.get("/export/assets.csv", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "assets.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      notifyError("Export failed ❌");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT FORM */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold text-black">Assets</h1>
        <p className="text-gray-600 text-sm mb-4">
          Add and manage company assets
        </p>

        <form
          onSubmit={saveAsset}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {/* Asset Type dropdown */}
          <select
            className="w-full rounded-xl p-2 bg-white text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.asset_type}
            onChange={(e) => {
              setForm({ ...form, asset_type: e.target.value });
              if (e.target.value !== "Other") setCustomAssetType("");
            }}
          >
            <option value="">Select Asset Type</option>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {form.asset_type === "Laptop" && (
  <textarea
    placeholder={`Configuration Details

Example:
Processor:
RAM:
Storage:`}
    value={form.configuration}
    onChange={(e) =>
      setForm({
        ...form,
        configuration: e.target.value,
      })
    }
    rows={6}
    className="w-full rounded-xl p-3 bg-white text-black placeholder:text-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 md:col-span-2"
  />
)}
          {form.asset_type === "Other" && (
            <Input
              placeholder="Enter Asset Type"
              value={customAssetType}
              onChange={(e) => setCustomAssetType(e.target.value)}
            />
          )}

          <Input
            placeholder="Brand / Model"
            value={form.brand_model}
            onChange={(e) =>
              setForm({ ...form, brand_model: e.target.value })
            }
          />

          <Input
            placeholder="Serial Number"
            value={form.serial_number}
            onChange={(e) =>
              setForm({ ...form, serial_number: e.target.value })
            }
          />

          <Input
            placeholder="Condition (Good/Fair/Damaged)"
            value={form.condition}
            onChange={(e) =>
              setForm({ ...form, condition: e.target.value })
            }
          />

          <button className="bg-black text-white rounded-xl px-4 py-2 font-bold col-span-1 md:col-span-2">
            {editingId ? "Update Asset" : "Save Asset"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="bg-gray-200 text-black rounded-xl px-4 py-2 font-bold col-span-1 md:col-span-2"
            >
              Cancel Edit
            </button>
          )}
        </form>
      </div>

      {/* RIGHT LIST */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-xl font-bold text-black">Assets List</h2>

          <div className="flex gap-2">
            <button
              onClick={loadAssets}
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

        {/* ✅ Asset Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full rounded-xl p-2 mb-2 bg-white text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Asset Types</option>
          <option value="Laptop">Laptop</option>
          <option value="Keyboard">Keyboard</option>
          <option value="Mouse">Mouse</option>
          <option value="TP Link Router">TP Link Router</option>
        </select>

        <Input
          placeholder="Search asset type / serial / status..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <p className="text-xs text-gray-500 mt-2">
          Showing {filtered.length} of {assets.length}
        </p>

        <div className="overflow-auto mt-4">
          <table className="w-full text-sm text-black">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Type</th>
                <th className="p-2">Configuration</th>
                <th className="p-2">Serial</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="p-2">
                    <div className="font-semibold">{a.asset_type}</div>
                    <div className="text-xs text-gray-500">{a.brand_model}</div>
                  </td>
                  <td className="p-2 text-xs whitespace-pre-wrap">
  {a.configuration || "-"}
</td>
                  <td className="p-2 font-mono">{a.serial_number}</td>
                  <td className="p-2">{a.status}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(a)}
                        className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteAsset(a.id)}
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
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    No assets found.
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