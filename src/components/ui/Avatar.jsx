import React from "react";
import { User2 } from "lucide-react";

const Avatar = ({ src, alt = "avatar", size = 40, className = "" }) => {
  const s = typeof size === "number" ? `${size}px` : size;
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        style={{ width: s, height: s }}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: s, height: s }}
      className={`rounded-full flex items-center justify-center bg-slate-100 ${className}`}
    >
      <User2 className="w-5 h-5 text-slate-400" />
    </div>
  );
};

export default Avatar;
