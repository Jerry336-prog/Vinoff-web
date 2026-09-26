import React, { useEffect, useState } from "react";
import { User2 } from "lucide-react";

const Avatar = ({
  src,
  alt = "avatar",
  size = 40,
  className = "",
  fallback = "",
  fallbackClassName = "",
}) => {
  const [failed, setFailed] = useState(false);
  const s = typeof size === "number" ? `${size}px` : size;
  const imageSrc = typeof src === "string" && src.trim() ? src.trim() : "";

  useEffect(() => {
    setFailed(false);
  }, [imageSrc]);

  if (imageSrc && !failed) {
    return (
      <img
        src={imageSrc}
        alt={alt}
        style={{ width: s, height: s }}
        className={`rounded-full object-cover ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      style={{ width: s, height: s }}
      className={`rounded-full flex items-center justify-center bg-slate-100 text-slate-500 font-black ${className}`}
    >
      {fallback ? (
        <span className={`text-[10px] leading-none ${fallbackClassName}`}>
          {fallback}
        </span>
      ) : (
        <User2 className="w-5 h-5 text-slate-400" />
      )}
    </div>
  );
};

export default Avatar;
