// import axios from "axios";

// const BASE =
//   import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";

// export const api = axios.create({
//   baseURL: BASE,
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

import axios from "axios";

// const BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";
const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";


export const api = axios.create({
  baseURL: BASE,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // ✅ MUST
});


