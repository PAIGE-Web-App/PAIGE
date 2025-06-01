// components/EditContactModal.tsx
import React, { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getCategoryStyle } from "../utils/categoryStyle";
import SelectField from "./SelectField";
import toast from "react-hot-toast";
import FormField from "./FormField";
import { getAllCategories, saveCategoryIfNew } from "../lib/firebaseCategories";
import CategorySelectField from "./CategorySelectField";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  category: string;
  website?: string;
  avatarColor?: string;
  userId: string;
  orderIndex?: number;
}

interface EditContactModalProps {
  contact: Contact;
  userId: string;
  onClose: () => void;
  onSave: (updatedContact: Contact) => void;
  onDelete: (deletedId: string) => void;
}

// Moved outside the component
function getRandomAvatarColor() {
  const avatarColors = [
    "#4B3E6E", "#3C5A99", "#264653", "#2A9D8F", "#1D3557", "#6D597A",
    "#7D4F50", "#5D3A00", "#3A405A", "#4A5759", "#2E4057", "#3E3E3E"
  ];
  return avatarColors[Math.floor(Math.random() * avatarColors.length)];
}

export default function EditContactModal({
  contact,
  userId,
  onClose,
  onSave,
  onDelete,
}: EditContactModalProps) {
  const [formData, setFormData] = useState({
    name: contact.name || "",
    email: contact.email || "",
    phone: contact.phone || "",
    category: contact.category || "",
    website: contact.website || "",
    avatarColor: contact.avatarColor || getRandomAvatarColor(),
    userId: userId,
    orderIndex: contact.orderIndex !== undefined ? contact.orderIndex : 0,
  });

  const [customCategory, setCustomCategory] = useState(
    contact.category && !["Photographer", "Caterer", "Florist", "DJ", "Venue"].includes(contact.category)
      ? contact.category
      : ""
  );
  const [errors, setErrors] = useState<{ email?: string; phone?: string; name?: string; category?: string; customCategory?: string }>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setFormData({
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      category: contact.category || "",
      website: contact.website || "",
      avatarColor: contact.avatarColor || getRandomAvatarColor(),
      userId: userId,
      orderIndex: contact.orderIndex !== undefined ? contact.orderIndex : 0,
    });
    setCustomCategory(
      contact.category && !["Photographer", "Caterer", "Florist", "DJ", "Venue"].includes(contact.category)
        ? contact.category
        : ""
    );
    setErrors({});
    setConfirmDelete(false);
  }, [contact, userId]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      if (newErrors[name as keyof typeof newErrors]) {
        delete newErrors[name as keyof typeof newErrors];
      }
      return newErrors;
    });
  };

  const handleCustomCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomCategory(e.target.value);
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      if (newErrors.customCategory) {
        delete newErrors.customCategory;
      }
      return newErrors;
    });
  };

  const validate = () => {
    const newErrors: { email?: string; phone?: string; name?: string; category?: string; customCategory?: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = "Name is required.";
    }
    if (!formData.category.trim()) {
      newErrors.category = "Category is required.";
    }
    if (formData.category === "Other" && !customCategory.trim()) {
      newErrors.customCategory = "Custom category is required.";
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format.";
    }
    if (formData.phone && !/^\+?[0-9\s\-()]{7,20}$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number format.";
    }
    if (!formData.phone.trim() && !formData.email.trim()) {
      newErrors.phone = "Either phone or email must be provided";
      newErrors.email = "Either phone or email must be provided";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Please correct the errors in the form.");
      return;
    }

    let categoryToSave = formData.category;
    if (formData.category === "Other" && customCategory.trim()) {
      categoryToSave = customCategory.trim();
      await saveCategoryIfNew(categoryToSave, userId);
    }

    const categoryStyle = getCategoryStyle(categoryToSave);
    const finalAvatarColor = categoryStyle?.backgroundColor || null;


    const updatedContact: Contact = {
      ...contact,
      name: formData.name,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      category: categoryToSave,
      website: formData.website.trim() || null,
      avatarColor: finalAvatarColor,
      orderIndex: formData.orderIndex,
      userId: formData.userId,
    };

    try {
      const contactRef = doc(db, "contacts", contact.id);
      await updateDoc(contactRef, updatedContact);
      onSave(updatedContact);
      toast.success("Contact updated successfully!");
      onClose();
    } catch (error) {
      console.error("Error updating contact:", error);
      toast.error("Failed to update contact. Please try again.");
    }
  };

  const handleDelete = async () => {
    try {
      if (contact.id && userId) {
        await deleteDoc(doc(db, "contacts", contact.id));
        onDelete(contact.id);
        toast.success("Contact deleted!");
        onClose();
      } else {
        toast.error("Contact ID or User ID is missing. Cannot delete.");
      }
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      toast.error(`Failed to delete contact: ${error.message}`);
    }
  };

  return (
    <div className="bg-white rounded-[5px] p-6 w-full max-w-md md:w-[400px] relative max-h-[90vh] overflow-y-auto font-work"> {/* Adjusted width and added max-height/overflow */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        title="Close"
      >
        <X size={20} />
      </button>
      <h2 className="text-lg font-playfair text-[#332B42] mb-2">Edit Contact</h2>
      <div className="flex flex-col items-center mb-4">
        <div
          className="h-8 w-8 flex items-center justify-center rounded-full text-white text-[14px] font-normal font-work-sans"
          style={{ backgroundColor: formData.avatarColor || '#364257' }}
        >
          {formData.name
            ? formData.name.split(" ").map((n) => n[0]).join("").toUpperCase()
            : "?"}
        </div>

        {(formData.category !== "Other" || customCategory.trim() !== "") && (
          <div
            className={`inline-block text-xs font-medium px-3 py-1 rounded-full mt-2 ${getCategoryStyle(
              formData.category === "Other" ? customCategory.trim() : formData.category
            )}`}
          >
            {formData.category === "Other" ? customCategory.trim() : formData.category}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Are you sure? </strong>
          <span className="block sm:inline">All chat history will be lost :(</span>
        </div>
      )}

      <div className="space-y-2">
        <FormField
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter name"
          error={errors.name}
        />

        <FormField
          label="Email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter email"
          error={errors.email}
        />

        <FormField
          label="Phone Number"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Enter phone number"
          error={errors.phone}
        />
        <FormField
          label="Website"
          name="website"
          value={formData.website}
          onChange={handleChange}
          placeholder="Enter website"
        />

        <FormField
          label="Channel"
          name="channel"
          value={formData.channel}
          onChange={handleChange}
          placeholder="e.g., Instagram"
        />

        <CategorySelectField
          userId={userId}
          value={formData.category}
          customCategoryValue={customCategory}
          onChange={handleChange}
          onCustomCategoryChange={handleCustomCategoryChange}
          error={errors.category}
          customCategoryError={errors.customCategory}
          label="Category"
          placeholder="Select a Category"
        />
      </div>

      <div className="flex justify-between items-center gap-2 mt-4">
        <button
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
            } else {
              handleDelete();
            }
          }}
          className={`px-4 py-2 text-sm rounded-[5px] border ${
            confirmDelete
              ? "bg-red-600 text-white"
              : "border-red-600 text-red-600 bg-white"
          }`}
        >
          {confirmDelete ? "Confirm Deletion" : "Delete"}
        </button>

        <button
          onClick={handleSubmit}
          className="btn-primary"
        >
          Save
        </button>
      </div>
    </div>
  );
}
