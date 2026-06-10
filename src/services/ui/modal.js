const tones = {
  default: {
    accent: "#16a34a",
    accentDark: "#15803d",
    soft: "#f0fdf4",
    border: "#bbf7d0",
    text: "#166534",
    mark: "i",
  },
  success: {
    accent: "#16a34a",
    accentDark: "#15803d",
    soft: "#f0fdf4",
    border: "#bbf7d0",
    text: "#166534",
    mark: "OK",
  },
  warning: {
    accent: "#ca8a04",
    accentDark: "#a16207",
    soft: "#fefce8",
    border: "#fef08a",
    text: "#854d0e",
    mark: "!",
  },
  danger: {
    accent: "#dc2626",
    accentDark: "#b91c1c",
    soft: "#fef2f2",
    border: "#fecaca",
    text: "#991b1b",
    mark: "!",
  },
};

const createElement = (tag, styles = {}, text = "") => {
  const element = document.createElement(tag);
  Object.assign(element.style, styles);
  if (text) element.textContent = text;
  return element;
};

const primaryButtonStyles = (tone) => ({
  background: tone.accent,
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "800",
  fontSize: "12px",
  boxShadow: "0 10px 18px rgba(22, 163, 74, 0.18)",
});

const secondaryButtonStyles = {
  background: "#f8fafc",
  color: "#475569",
  border: "1px solid #e2e8f0",
  padding: "10px 14px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "800",
  fontSize: "12px",
};

const removeModal = (overlay, onKeyDown) => {
  document.removeEventListener("keydown", onKeyDown);
  if (overlay.parentNode) {
    document.body.removeChild(overlay);
  }
};

const openModal = ({
  title = "Notice",
  message = "",
  okText = "OK",
  cancelText = "Cancel",
  tone = "default",
  mode = "notice",
  defaultValue = "",
  placeholder = "",
  inputLabel = "",
  inputType = "text",
  validate,
} = {}) => {
  return new Promise((resolve) => {
    const theme = tones[tone] || tones.default;

    const overlay = createElement("div", {
      position: "fixed",
      inset: "0",
      background: "rgba(2, 6, 23, 0.62)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: "9999",
      padding: "20px",
    });

    const box = createElement("div", {
      width: "min(460px, 94vw)",
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: "24px",
      boxShadow: "0 24px 60px rgba(15, 23, 42, 0.26)",
      padding: "22px",
      transform: "translateY(0)",
      color: "#0f172a",
      fontFamily:
        "'Plus Jakarta Sans', Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    });

    const header = createElement("div", {
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      marginBottom: "14px",
    });

    const icon = createElement("div", {
      width: "38px",
      height: "38px",
      borderRadius: "14px",
      background: theme.soft,
      border: `1px solid ${theme.border}`,
      color: theme.text,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "900",
      fontSize: theme.mark.length > 1 ? "10px" : "16px",
      flexShrink: "0",
    }, theme.mark);

    const titleWrap = createElement("div", { minWidth: "0" });
    const titleEl = createElement("div", {
      fontWeight: "900",
      color: "#0f172a",
      fontSize: "15px",
      letterSpacing: "0",
      lineHeight: "1.25",
    }, title);

    const msgEl = createElement("div", {
      fontSize: "12px",
      color: "#64748b",
      lineHeight: "1.55",
      marginTop: "5px",
      whiteSpace: "pre-wrap",
      fontWeight: "600",
    }, message);

    titleWrap.appendChild(titleEl);
    if (message) titleWrap.appendChild(msgEl);
    header.appendChild(icon);
    header.appendChild(titleWrap);

    const inputArea = createElement("div", {
      margin: "14px 0 4px",
      display: mode === "prompt" ? "block" : "none",
    });

    if (inputLabel) {
      const label = createElement("label", {
        display: "block",
        marginBottom: "7px",
        color: "#64748b",
        fontSize: "10px",
        fontWeight: "900",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }, inputLabel);
      inputArea.appendChild(label);
    }

    const input = createElement("input", {
      width: "100%",
      boxSizing: "border-box",
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: "14px",
      padding: "12px 13px",
      color: "#0f172a",
      fontSize: "13px",
      fontWeight: "800",
      outline: "none",
    });
    input.type = inputType;
    input.value = defaultValue;
    input.placeholder = placeholder;

    const errorEl = createElement("div", {
      display: "none",
      color: "#b91c1c",
      background: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: "12px",
      padding: "8px 10px",
      marginTop: "8px",
      fontSize: "11px",
      fontWeight: "800",
    });

    input.addEventListener("focus", () => {
      input.style.background = "#fff";
      input.style.borderColor = theme.accent;
      input.style.boxShadow = `0 0 0 3px ${theme.soft}`;
    });
    input.addEventListener("blur", () => {
      input.style.background = "#f8fafc";
      input.style.borderColor = "#e2e8f0";
      input.style.boxShadow = "none";
    });

    inputArea.appendChild(input);
    inputArea.appendChild(errorEl);

    const actions = createElement("div", {
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: "10px",
      marginTop: "18px",
      flexWrap: "wrap-reverse",
    });

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        removeModal(overlay, onKeyDown);
        resolve(mode === "notice" ? false : null);
      }
    };

    const cancelBtn = createElement("button", secondaryButtonStyles, cancelText);
    cancelBtn.type = "button";
    cancelBtn.style.display = mode === "notice" ? "none" : "inline-flex";
    cancelBtn.addEventListener("click", () => {
      removeModal(overlay, onKeyDown);
      resolve(mode === "confirm" ? false : null);
    });

    const okBtn = createElement("button", primaryButtonStyles(theme), okText);
    okBtn.type = "button";
    okBtn.addEventListener("mouseenter", () => {
      okBtn.style.background = theme.accentDark;
    });
    okBtn.addEventListener("mouseleave", () => {
      okBtn.style.background = theme.accent;
    });
    okBtn.addEventListener("click", () => {
      if (mode === "prompt") {
        const value = input.value.trim();
        const validationMessage = validate?.(value);
        if (validationMessage) {
          errorEl.textContent = validationMessage;
          errorEl.style.display = "block";
          input.focus();
          return;
        }
        removeModal(overlay, onKeyDown);
        resolve(value);
        return;
      }

      removeModal(overlay, onKeyDown);
      resolve(true);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        okBtn.click();
      }
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    box.appendChild(header);
    box.appendChild(inputArea);
    box.appendChild(actions);
    overlay.appendChild(box);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        removeModal(overlay, onKeyDown);
        resolve(mode === "confirm" ? false : mode === "prompt" ? null : false);
      }
    });

    document.addEventListener("keydown", onKeyDown);
    document.body.appendChild(overlay);

    if (mode === "prompt") {
      input.focus();
      input.select();
    } else {
      okBtn.focus();
    }
  });
};

export const showModal = (options = {}) => openModal(options);

export const showConfirm = ({ confirmText, ...options } = {}) =>
  openModal({
    okText: confirmText || "Confirm",
    tone: "warning",
    ...options,
    mode: "confirm",
  });

export const showPrompt = (options = {}) =>
  openModal({
    okText: "Continue",
    tone: "default",
    ...options,
    mode: "prompt",
  });

export default showModal;
