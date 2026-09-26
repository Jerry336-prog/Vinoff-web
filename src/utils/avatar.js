const mediaUrl = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value !== "object") return null;

  return (
    mediaUrl(value.url) ||
    mediaUrl(value.secure_url) ||
    mediaUrl(value.src) ||
    mediaUrl(value.path) ||
    mediaUrl(value.thumbnail) ||
    mediaUrl(value.preview) ||
    null
  );
};

export const getAvatarUrl = (entity) => {
  if (!entity) return null;

  return (
    mediaUrl(entity.profile?.avatar) ||
    mediaUrl(entity.profile?.profileImage) ||
    mediaUrl(entity.profile?.image) ||
    mediaUrl(entity.avatar) ||
    mediaUrl(entity.avatarUrl) ||
    mediaUrl(entity.customerAvatar) ||
    mediaUrl(entity.photoURL) ||
    mediaUrl(entity.profileImage) ||
    mediaUrl(entity.image) ||
    mediaUrl(entity.picture) ||
    mediaUrl(entity.senderAvatar) ||
    null
  );
};

export const getInitials = (entity, fallback = "U") => {
  if (!entity) return fallback;

  const firstName = entity.firstName || entity.firstname || "";
  const lastName = entity.lastName || entity.lastname || "";
  const name =
    entity.name ||
    entity.customerName ||
    entity.businessName ||
    entity.senderName ||
    "";

  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.trim() ||
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("");

  return (initials || fallback).toUpperCase();
};
