import Swal from "sweetalert2";

export const toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true,
});

export const notifySuccess = (title) =>
  toast.fire({ icon: "success", title });

export const notifyError = (title) =>
  toast.fire({ icon: "error", title });

export const notifyInfo = (title) =>
  toast.fire({ icon: "info", title });

export const confirmPopup = async ({
  title = "Are you sure?",
  text = "",
  confirmButtonText = "Yes",
  cancelButtonText = "Cancel",
  icon = "warning",
}) => {
  const res = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor: "#111827", // black
    cancelButtonColor: "#6B7280", // gray
  });

  return res.isConfirmed;
};

export const inputPopup = async ({
  title = "Confirm",
  text = "",
  inputPlaceholder = "",
  confirmButtonText = "Confirm",
}) => {
  const res = await Swal.fire({
    title,
    text,
    input: "text",
    inputPlaceholder,
    showCancelButton: true,
    confirmButtonText,
    confirmButtonColor: "#111827",
    cancelButtonColor: "#6B7280",
  });

  if (!res.isConfirmed) return null;
  return res.value;
};
