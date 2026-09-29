import React, { useState, useEffect, useContext } from "react";
import useProducts from "../../hooks/useProducts";
import { AuthContext } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  CheckSquare,
  Square,
  MoreVertical,
  Check,
  CheckCircle2,
} from "lucide-react";
import Button from "../../components/ui/Button";
import useCloudinaryUpload from "../../hooks/useCloudinaryUpload";
import { showConfirm, showModal } from "../../services/ui/modal";

export const Products = () => {
  const { user } = useContext(AuthContext);
  const {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    bulkUpdateOrderingFormat,
    categories,
  } = useProducts();
  const { upload: uploadImage, loading: uploadingImage } =
    useCloudinaryUpload();

  // Selection Mode State (hidden by default until admin clicks "Select")
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // 3-dot dropdown popover state
  const [openMenuId, setOpenMenuId] = useState(null);

  // Drawer Form State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Toiletries");
  const [orderFormatMode, setOrderFormatMode] = useState("both"); // "both" | "carton" | "pieces"
  const [cartonPrice, setCartonPrice] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [unitsPerCarton, setUnitsPerCarton] = useState(12);
  const [stock, setStock] = useState("");
  const [unitStock, setUnitStock] = useState(0);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");

  // Close 3-dot action dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest("[data-row-menu]")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const openAddDrawer = () => {
    setEditingId(null);
    setName("");
    setCategory("Toiletries");
    setOrderFormatMode("both");
    setCartonPrice("");
    setUnitPrice("");
    setUnitsPerCarton(12);
    setStock("");
    setUnitStock(0);
    setDescription("");
    setImage(
      "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=800&q=80"
    );
    setDrawerOpen(true);
  };

  const openEditDrawer = (product) => {
    setEditingId(product.id);
    setName(product.name || "");
    setCategory(product.category || "Toiletries");

    let mode = "both";
    if (product.allowCarton !== false && product.allowPieces === false) {
      mode = "carton";
    } else if (product.allowCarton === false && product.allowPieces !== false) {
      mode = "pieces";
    }
    setOrderFormatMode(mode);

    setCartonPrice(product.cartonPrice || "");
    setUnitPrice(product.unitPrice || "");
    setUnitsPerCarton(product.unitsPerCarton || 12);
    setStock(product.stock || 0);
    setUnitStock(product.unitStock || 0);
    setDescription(product.description || "");
    setImage(product.image || "");
    setDrawerOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const allowCarton = orderFormatMode !== "pieces";
    const allowPieces = orderFormatMode !== "carton";

    const numUnits = Number(unitsPerCarton) || 12;
    let numCarton = Number(cartonPrice) || 0;
    let numUnit = Number(unitPrice) || 0;

    // Cross-calculate prices smoothly if one format was left empty
    if (orderFormatMode === "carton") {
      if (numCarton > 0 && numUnit <= 0) {
        numUnit = Math.round(numCarton / numUnits);
      }
    } else if (orderFormatMode === "pieces") {
      if (numUnit > 0 && numCarton <= 0) {
        numCarton = numUnit * numUnits;
      }
    } else {
      if (!numCarton && numUnit) numCarton = numUnit * numUnits;
      if (!numUnit && numCarton) numUnit = Math.round(numCarton / numUnits);
    }

    if (numCarton <= 0 && numUnit <= 0) {
      await showModal({
        title: "Price Required",
        message: "Please enter a valid price for this wholesale product.",
        tone: "danger",
      });
      return;
    }

    const payload = {
      name: name.trim(),
      category: category.trim(),
      price: numUnit || numCarton,
      wholesalePrice: numCarton || numUnit,
      minimumQuantity: numUnits,
      stock: Number(stock) || 0,
      unitStock: Number(unitStock) || 0,
      unit: "carton",
      description: description.trim(),
      allowCarton,
      allowPieces,
      images: [
        {
          url: image || "https://res.cloudinary.com/demo/image/upload/sample.jpg",
          publicId: `prod_${Date.now()}`,
        },
      ],
      status: "active",
    };

    try {
      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        await addProduct(payload);
      }
      setDrawerOpen(false);
    } catch (err) {
      await showModal({
        title: "Save Error",
        message: "Error saving product: " + (err.message || err),
        tone: "danger",
      });
    }
  };

  const handleSetOrderingMode = async (product, targetMode) => {
    setOpenMenuId(null);
    const allowCarton = targetMode !== "pieces";
    const allowPieces = targetMode !== "carton";

    try {
      await updateProduct(product.id, {
        allowCarton,
        allowPieces,
      });
    } catch (err) {
      await showModal({
        title: "Update Error",
        message: err.message || "Failed to update ordering format",
        tone: "danger",
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const handleToggleSelectProduct = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkFormatChange = async ({ allowCarton, allowPieces, applyToAll = false }) => {
    if (!allowCarton && !allowPieces) return;
    setIsBulkUpdating(true);
    try {
      const res = await bulkUpdateOrderingFormat({
        productIds: applyToAll ? [] : selectedIds,
        allowCarton,
        allowPieces,
        applyToAll,
      });
      await showModal({
        title: "Ordering Formats Updated",
        message: res.message || "Ordering formats updated successfully.",
      });
      setSelectedIds([]);
    } catch (err) {
      await showModal({
        title: "Bulk Update Error",
        message: err.message || "Failed to bulk update ordering formats.",
        tone: "danger",
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: "Delete Product",
      message: "Are you sure you want to delete this product from the wholesale catalog?",
      confirmText: "Delete Product",
      okText: "Delete Product",
      cancelText: "Keep Product",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      await deleteProduct(id);
    } catch (err) {
      await showModal({
        title: "Delete Error",
        message: err.message,
        tone: "danger",
      });
    }
  };

  const handleProductImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadImage(file, "products");
      setImage(res.url);
    } catch (err) {
      console.error("Product image upload failed", err);
      await showModal({
        title: "Upload Error",
        message: "Failed to upload product image: " + (err.message || err),
      });
    }
  };

  return (
    <div className="space-y-5 relative h-full">
      {/* Title & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Wholesale Product Catalog
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage product specifications, purchase format availability, carton units, and stock.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isSelectMode ? (
            <Button
              variant="secondary"
              onClick={() => {
                setIsSelectMode(true);
                setSelectedIds([]);
              }}
              className="rounded-xl px-3.5 py-2 text-xs font-bold"
              icon={CheckSquare}
            >
              Select
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                setIsSelectMode(false);
                setSelectedIds([]);
              }}
              className="rounded-xl px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              icon={X}
            >
              Cancel Selection
            </Button>
          )}

          <Button
            variant="primary"
            onClick={openAddDrawer}
            className="rounded-xl px-4 py-2 text-xs font-bold"
            icon={Plus}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Sleek Professional Bulk Selection Toolbar (only visible in Select Mode) */}
      {isSelectMode && (
        <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-800">
              <span className="font-extrabold text-brand-green-700">{selectedIds.length}</span> of {products.length} selected
            </span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-bold text-brand-green-700 hover:underline transition"
            >
              {selectedIds.length === products.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              Set Ordering Format:
            </span>
            <button
              type="button"
              disabled={selectedIds.length === 0 || isBulkUpdating}
              onClick={() => handleBulkFormatChange({ allowCarton: true, allowPieces: false })}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition disabled:opacity-40"
            >
              Cartons Only
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0 || isBulkUpdating}
              onClick={() => handleBulkFormatChange({ allowCarton: false, allowPieces: true })}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold transition disabled:opacity-40"
            >
              Pieces Only
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0 || isBulkUpdating}
              onClick={() => handleBulkFormatChange({ allowCarton: true, allowPieces: true })}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition disabled:opacity-40"
            >
              Both Formats
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSelectMode(false);
                setSelectedIds([]);
              }}
              className="px-3 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold transition ml-1"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 animate-pulse text-xs font-semibold p-6 text-center">
          Syncing products database...
        </p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50/70">
                  {isSelectMode && (
                    <th className="py-3 px-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-slate-400 hover:text-slate-700 transition"
                        title={selectedIds.length === products.length ? "Deselect All" : "Select All"}
                      >
                        {products.length > 0 && selectedIds.length === products.length ? (
                          <CheckSquare className="w-4 h-4 text-brand-green-600" />
                        ) : selectedIds.length > 0 ? (
                          <div className="w-4 h-4 bg-brand-green-600 rounded flex items-center justify-center text-white text-[10px] font-black leading-none">
                            -
                          </div>
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-center">Ordering Mode</th>
                  <th className="py-3.5 px-4 text-right">Carton Price</th>
                  <th className="py-3.5 px-4 text-right">Unit Price</th>
                  <th className="py-3.5 px-4 text-center">Carton Stock</th>
                  <th className="py-3.5 px-4 text-center">Loose Units</th>
                  <th className="py-3.5 px-4 text-center w-14">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {products.map((p) => {
                  const isCartonOnly = p.allowCarton !== false && p.allowPieces === false;
                  const isPiecesOnly = p.allowCarton === false && p.allowPieces !== false;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/60 transition ${
                        selectedIds.includes(p.id) ? "bg-brand-green-50/30" : ""
                      }`}
                    >
                      {isSelectMode && (
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectProduct(p.id)}
                            className="text-slate-400 hover:text-slate-700 transition"
                          >
                            {selectedIds.includes(p.id) ? (
                              <CheckSquare className="w-4 h-4 text-brand-green-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 leading-tight">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                              Pack: {p.unitsPerCarton || 12} Units
                            </p>
                            {p.createdByAdmin && (
                              <p className="text-[9px] text-slate-400 font-medium">
                                Added by: <span className="font-bold text-slate-600">{p.createdByAdmin}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 font-medium">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isCartonOnly ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-900 border border-amber-200">
                            Cartons Only
                          </span>
                        ) : isPiecesOnly ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-900 border border-emerald-200">
                            Pieces Only
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Both Formats
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-900 font-bold">
                        {formatCurrency(p.cartonPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-900 font-bold">
                        {formatCurrency(p.unitPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-800">
                        {p.stock} ctns
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-800">
                        {p.unitStock || 0} units
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {/* 3-Dot Action Menu */}
                        <div className="relative inline-block text-left" data-row-menu>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === p.id ? null : p.id);
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition"
                            title="Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuId === p.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-40 text-left animate-fade-in text-xs font-semibold text-slate-700">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  openEditDrawer(p);
                                }}
                                className="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 transition"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                Edit Details
                              </button>

                              <div className="my-1 border-t border-slate-100 px-3 py-1">
                                <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">
                                  Ordering Format
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSetOrderingMode(p, "both")}
                                className="w-full px-3.5 py-1.5 hover:bg-slate-50 flex items-center justify-between text-[11px] transition"
                              >
                                <span>Both Formats</span>
                                {!isCartonOnly && !isPiecesOnly && (
                                  <Check className="w-3.5 h-3.5 text-brand-green-600" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetOrderingMode(p, "carton")}
                                className="w-full px-3.5 py-1.5 hover:bg-slate-50 flex items-center justify-between text-[11px] transition"
                              >
                                <span>Cartons Only</span>
                                {isCartonOnly && (
                                  <Check className="w-3.5 h-3.5 text-amber-600" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetOrderingMode(p, "pieces")}
                                className="w-full px-3.5 py-1.5 hover:bg-slate-50 flex items-center justify-between text-[11px] transition"
                              >
                                <span>Pieces Only</span>
                                {isPiecesOnly && (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                )}
                              </button>

                              <div className="my-1 border-t border-slate-100" />

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleDelete(p.id);
                                }}
                                className="w-full px-3.5 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Product
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Drawer Modal overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-slide-in">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-extrabold text-slate-800 text-sm">
                {editingId ? "EDIT WHOLESALE PRODUCT" : "ADD WHOLESALE PRODUCT"}
              </h3>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSave}
              className="space-y-4 text-xs font-semibold text-slate-700 flex-grow"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none"
                >
                  <option value="Toiletries">Toiletries</option>
                  <option value="Household Cleaners">Household Cleaners</option>
                  <option value="Laundry Care">Laundry Care</option>
                </select>
              </div>

              {/* Ordering Format Segmented Control */}
              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                  Customer Ordering Format
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-white border border-slate-200 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setOrderFormatMode("both")}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition text-center ${
                      orderFormatMode === "both"
                        ? "bg-brand-green-700 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Both Formats
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderFormatMode("carton")}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition text-center ${
                      orderFormatMode === "carton"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Cartons Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderFormatMode("pieces")}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition text-center ${
                      orderFormatMode === "pieces"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Pieces Only
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  {orderFormatMode === "both" && "Customers can order in wholesale carton bundles or single loose pieces."}
                  {orderFormatMode === "carton" && "Customers can ONLY order in wholesale carton bundles."}
                  {orderFormatMode === "pieces" && "Customers can ONLY order in single loose units."}
                </p>
              </div>

              {/* Pricing Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Carton Price (₦) {orderFormatMode !== "pieces" && "*"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cartonPrice}
                    onChange={(e) => setCartonPrice(e.target.value)}
                    placeholder={orderFormatMode === "pieces" ? "Auto-computed" : "0.00"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none"
                    required={orderFormatMode !== "pieces"}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Unit Price (₦) {orderFormatMode !== "carton" && "*"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder={orderFormatMode === "carton" ? "Auto-computed" : "0.00"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none"
                    required={orderFormatMode !== "carton"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Units Per Carton *
                  </label>
                  <input
                    type="number"
                    value={unitsPerCarton}
                    onChange={(e) => setUnitsPerCarton(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Carton Stock *
                  </label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Loose Unit Stock *
                </label>
                <input
                  type="number"
                  value={unitStock}
                  onChange={(e) => setUnitStock(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Description
                </label>
                <textarea
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Product Image *
                </label>
                <div className="flex items-center gap-3">
                  {image && (
                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
                      <img
                        src={image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 relative border border-dashed border-slate-200 hover:border-brand-green-400 rounded-xl p-3 text-center transition cursor-pointer bg-slate-50 group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProductImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploadingImage}
                    />
                    <p className="text-xs font-bold text-slate-700">
                      {uploadingImage ? "Uploading to Cloudinary..." : "Choose Image File"}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      PNG, JPG up to 5MB
                    </p>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Or paste image URL..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:bg-white focus:ring-1 focus:ring-brand-green-500 outline-none text-[11px]"
                />
              </div>

              <Button type="submit" className="w-full py-3.5 rounded-xl mt-4">
                Save Wholesale Product
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
