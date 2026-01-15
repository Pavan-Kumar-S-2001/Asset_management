import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    asset_type: "",
    brand_model: "",
    serial_number: "",
    condition: "Good",
  });

  const [editingId, setEditingId] = useState(null);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const res = await api.get("/assets");
      setAssets(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      alert("Backend not reachable ❌ (Check Flask running on 5000)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return assets;

    return assets.filter((a) => {
      return (
        (a.asset_type || "").toLowerCase().includes(s) ||
        (a.brand_model || "").toLowerCase().includes(s) ||
        (a.serial_number || "").toLowerCase().includes(s) ||
        (a.status || "").toLowerCase().includes(s)
      );
    });
  }, [assets, q]);

  const saveAsset = async (e) => {
    e.preventDefault();

    if (!form.asset_type || !form.serial_number) {
      alert("Asset Type and Serial Number required ❌");
      return;
    }

    try {
      if (editingId) {
        await api.put(`/assets/${editingId}`, form);
        alert("Asset updated ✅");
      } else {
        await api.post("/assets", form);
        alert("Asset saved ✅");
      }

      setForm({
        asset_type: "",
        brand_model: "",
        serial_number: "",
        condition: "Good",
      });
      setEditingId(null);
      await loadAssets();
    } catch (err) {
      console.error(err);
      alert("Error saving asset ❌ (serial number may already exist)");
    }
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setForm({
      asset_type: a.asset_type || "",
      brand_model: a.brand_model || "",
      serial_number: a.serial_number || "",
      condition: a.condition || "Good",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      asset_type: "",
      brand_model: "",
      serial_number: "",
      condition: "Good",
    });
  };

  const deleteAsset = async (id) => {
    if (!confirm("Delete this asset?")) return;
    try {
      await api.delete(`/assets/${id}`);
      alert("Asset deleted ✅");
      await loadAssets();
    } catch (e) {
      console.error(e);
      alert("Delete failed ❌");
    }
  };

  const exportCSV = () => {
    const base =
      import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";
    window.open(`${base}/export/assets.csv`, "_blank");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT FORM */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-black">Assets</h1>
            <p className="text-gray-600 text-sm">
              Add and manage company assets
            </p>
          </div>
        </div>

        <form onSubmit={saveAsset} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            placeholder="Asset Type (Laptop/Mouse)"
            value={form.asset_type}
            onChange={(e) => setForm({ ...form, asset_type: e.target.value })}
          />
          <Input
            placeholder="Brand / Model"
            value={form.brand_model}
            onChange={(e) => setForm({ ...form, brand_model: e.target.value })}
          />
          <Input
            placeholder="Serial Number"
            value={form.serial_number}
            onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
          />
          <Input
            placeholder="Condition (Good/Fair/Damaged)"
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
          />

          <button
            className="bg-black text-white rounded-xl px-4 py-2 font-bold col-span-1 md:col-span-2"
          >
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
                  <td className="p-2 font-mono">{a.serial_number}</td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        a.status === "Issued"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
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
                  <td colSpan={4} className="p-4 text-center text-gray-500">
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

/* ✅ White input + black text */
function Input(props) {
  return (
    <input
      className="w-full rounded-xl p-2 bg-white text-black placeholder:text-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
      {...props}
    />
  );
}
