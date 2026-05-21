import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import {
  confirmPopup,
  notifyError,
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

function statusBadge(status) {
  if (status === "Assigned") {
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

export default function RentalAssets() {
   const [showRentalAssets, setShowRentalAssets] = useState(false);
   const [rentals, setRentals] = useState([]);
   const [rentalLoading, setRentalLoading] = useState(false);
   

   const [rentalSearch, setRentalSearch] = useState("");
   const [currentPage, setCurrentPage] = useState(1);

   const rentalsPerPage = 10;

const loadAll = async () => {
  setRentalLoading(true);

  try {
    const rentalRes = await api.get("/rentals");

    setRentals(Array.isArray(rentalRes.data) ? rentalRes.data : []);
  } catch (error) {
    console.error(error);
    notifyError("Backend API error");
  } finally {
    setRentalLoading(false);
  }
};

useEffect(() => {
  loadAll();
}, []);

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

const paginatedRentals = useMemo(() => {
  const start = (currentPage - 1) * rentalsPerPage;

  return filteredRentals.slice(start, start + rentalsPerPage);
}, [currentPage, filteredRentals]);

const totalPages = Math.max(
  1,
  Math.ceil(filteredRentals.length / rentalsPerPage)
);

const exportRentals = () => {
  const base =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

  window.open(`${base}/export/rentals.csv`, "_blank");
};

const openEditRental = (rental) => {
  console.log("Edit rental", rental);
};

const deleteRental = async (rentalId) => {
  try {
    await api.delete(`/rentals/${rentalId}`);

    notifySuccess("Rental deleted successfully");

    await loadAll();
  } catch (error) {
    console.error(error);

    notifyError(
      error?.response?.data?.error || "Failed to delete rental"
    );
  }
};

const returnRentalToVendor = async (rentalId) => {
  try {
    await api.post("/return-rental-to-vendor", {
      rental_id: rentalId,
    });

    notifySuccess("Rental asset returned to vendor");

    await loadAll();
  } catch (error) {
    console.error(error);

    notifyError(
      error?.response?.data?.error ||
        "Failed to return asset to vendor"
    );
  }
};
  
  return (
    <div className="grid gap-6">
        

      <div className="rounded-2xl bg-white p-6 shadow">

  <div className="mb-4 flex items-start justify-between gap-3">

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
<>
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
                      <button
                      onClick={() => returnRentalToVendor(rental.id)}
                      className="rounded-lg bg-orange-600 px-3 py-1 text-xs font-bold text-white"
                    >
                      Return To Vendor
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
</>
</div>
    </div>
  );
}