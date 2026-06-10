/**
 * Performs a real file upload to Cloudinary.
 * @param {File} file - The file object to upload
 * @param {function} onProgress - Progress callback function (percent => void)
 * @returns {Promise<string>} The uploaded file URL
 */
export const uploadMedia = async (file, onProgress = () => {}) => {
  if (!file) {
    throw new Error("No file provided for upload");
  }

  onProgress(20);
  try {
    const res = await uploadToCloudinary(file);
    onProgress(100);
    return res.url;
  } catch (err) {
    console.error("Cloudinary upload failed inside uploadMedia:", err);
    throw err;
  }
};

// Helper to read environment variables safely in different runtimes
const getEnv = (key) => {
  if (typeof process !== "undefined" && process?.env && process.env[key])
    return process.env[key];
  if (
    typeof import.meta !== "undefined" &&
    import.meta?.env &&
    import.meta.env[key]
  )
    return import.meta.env[key];
  if (typeof window !== "undefined" && window.__env && window.__env[key])
    return window.__env[key];
  return undefined;
};

export const uploadToCloudinary = async (file, folder = "") => {
  if (!file) throw new Error("No file provided");
  // Try multiple fallbacks so env vars work in CRA, Vite or runtime-injected envs
  const cloudName =
    // Vite-first
    getEnv("VITE_CLOUDINARY_CLOUD_NAME") ||
    (typeof import.meta !== "undefined" &&
      import.meta?.env &&
      import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) ||
    // CRA compatibility
    getEnv("VITE_CLOUDINARY_CLOUD_NAME") ||
    (typeof process !== "undefined" &&
      process?.env &&
      process.env.VITE_CLOUDINARY_CLOUD_NAME) ||
    // runtime injection
    (typeof import.meta !== "undefined" &&
      import.meta?.env &&
      import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) ||
    (typeof window !== "undefined" &&
      window.__env &&
      window.__env.VITE_CLOUDINARY_CLOUD_NAME) ||
    undefined;

  const preset =
    // Vite-first
    getEnv("VITE_CLOUDINARY_UPLOAD_PRESET") ||
    (typeof import.meta !== "undefined" &&
      import.meta?.env &&
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET) ||
    // CRA compatibility
    getEnv("VITE_CLOUDINARY_UPLOAD_PRESET") ||
    (typeof process !== "undefined" &&
      process?.env &&
      process.env.VITE_CLOUDINARY_UPLOAD_PRESET) ||
    // runtime injection
    (typeof import.meta !== "undefined" &&
      import.meta?.env &&
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET) ||
    (typeof window !== "undefined" &&
      window.__env &&
      window.__env.VITE_CLOUDINARY_UPLOAD_PRESET) ||
    undefined;

  if (!cloudName || !preset) {
    console.error("Cloudinary env missing. Fallback checks:", {
      getEnv: {
        vite_cloud: getEnv("VITE_CLOUDINARY_CLOUD_NAME"),
        vite_preset: getEnv("VITE_CLOUDINARY_UPLOAD_PRESET"),
      },
      processEnv:
        typeof process !== "undefined" && process?.env
          ? {
              vite_cloud: process.env.VITE_CLOUDINARY_CLOUD_NAME,
              vite_preset: process.env.VITE_CLOUDINARY_UPLOAD_PRESET,
            }
          : null,
      importMeta:
        typeof import.meta !== "undefined" && import.meta?.env
          ? import.meta.env
          : null,
      windowEnv:
        typeof window !== "undefined" && window.__env ? window.__env : null,
    });
    throw new Error(
      "Cloudinary configuration missing. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET and restart the dev server.",
    );
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", preset);
  if (folder) form.append("folder", folder);

  const res = await fetch(url, {
    method: "POST",
    body: form,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Cloudinary upload failed");
  }

  return { url: data.secure_url, raw: data };
};

export default uploadToCloudinary;
