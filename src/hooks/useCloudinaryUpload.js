import { useState, useCallback } from "react";
import uploadToCloudinary from "../services/cloudinary/upload";

export const useCloudinaryUpload = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const upload = useCallback(async (file, folder) => {
    setLoading(true);
    setError(null);
    try {
      const res = await uploadToCloudinary(file, folder);
      setLoading(false);
      return res;
    } catch (e) {
      setError(e);
      setLoading(false);
      throw e;
    }
  }, []);

  return { upload, loading, error };
};

export default useCloudinaryUpload;
