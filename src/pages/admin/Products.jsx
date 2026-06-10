import React, { useState } from "react";
import useProducts from "../../hooks/useProducts";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  ShoppingBag,
  Layers,
  AlertCircle,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import useCloudinaryUpload from "../../hooks/useCloudinaryUpload";
import { showConfirm, showModal } from "../../services/ui/modal";

export const Products = () => {
  const {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    categories,
  } = useProducts();
  const { upload: uploadImage, loading: uploadingImage } =
    useCloudinaryUpload();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form Fields State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Toiletries");
  const [cartonPrice, setCartonPrice] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [unitsPerCarton, setUnitsPerCarton] = useState(12);
  const [stock, setStock] = useState("");
  const [unitStock, setUnitStock] = useState(0);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");

  const openAddDrawer = () => {
    setEditingId(null);
    setName("");
    setCategory("Toiletries");
    setCartonPrice("");
    setUnitPrice("");
    setUnitsPerCarton(12);
    setStock("");
    setUnitStock(0);
    setDescription("");
    setImage(
      "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=800&q=80",
    );
    setDrawerOpen(true);
  };

  const openEditDrawer = (product) => {
    setEditingId(product.id);
    setName(product.name);
    setCategory(product.category);
    setCartonPrice(product.cartonPrice);
    setUnitPrice(product.unitPrice);
    setUnitsPerCarton(product.unitsPerCarton || 12);
    setStock(product.stock);
    setUnitStock(product.unitStock || 0);
    setDescription(product.description);
    setImage(product.image);
    setDrawerOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      name,
      category,
      cartonPrice: Number(cartonPrice),
      unitPrice: Number(unitPrice),
      unitsPerCarton: Number(unitsPerCarton),
      stock: Number(stock),
      unitStock: Number(unitStock),
      description,
      image,
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
        message: "Error saving: " + err.message,
      });
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
    <div className="space-y-6 relative h-full">
      {/* Title block */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Wholesale Product Catalog
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Update products details, units sizes, carton prices, and restock
            limits.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={openAddDrawer}
          className="rounded-xl px-4 py-2"
          icon={Plus}
        >
          Add Product
        </Button>
      </div>

      {loading ? (
        <p className="text-slate-500 animate-pulse text-xs font-semibold">
          Syncing products database...
        </p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50">
                  <th className="py-3 px-4">Product Info</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Carton Price</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-center">In Stock</th>
                  <th className="py-3 px-4 text-center">Loose Units</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
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
                            Pack Size: {p.unitsPerCarton || 12} Units
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-900 font-bold">
                      {formatCurrency(p.cartonPrice)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-900 font-bold">
                      {formatCurrency(p.unitPrice)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-900">
                      {p.stock} ctns
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-900">
                      {p.unitStock || 0} units
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditDrawer(p)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-brand-green-700 rounded-lg transition"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-red-500 rounded-lg transition"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Carton Price (₦) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cartonPrice}
                    onChange={(e) => setCartonPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Unit Price (₦) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none"
                    required
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
                    Stock (Cartons) *
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
