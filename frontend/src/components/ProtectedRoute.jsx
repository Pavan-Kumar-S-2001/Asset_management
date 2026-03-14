import { useEffect, useState } from "react";
import { api } from "../api";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const [ok, setOk] = useState(null);

  useEffect(() => {
    api
      .get("/me")
      .then(() => setOk(true))
      .catch(() => setOk(false));
  }, []);

  if (ok === null) return <div className="p-10">Loading...</div>;
  if (!ok) return <Navigate to="/login" replace />;
  return children;
}
