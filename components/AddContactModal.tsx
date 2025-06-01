import { getAllCategories, saveCategoryIfNew } from "../lib/firebaseCategories";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { saveContactToFirestore } from "../lib/saveContactToFirestore";
import FormField from "./FormField";
import SelectField from "./SelectField";
import { X } from "lucide-react";
import { getCategoryStyle } from "../utils/categoryStyle";
import { getAuth } from "firebase/auth";
import toast from "react-hot-toast";
import CategoryPill from "./CategoryPill";
import CategorySelectField from "./CategorySelectField";


// Moved outside the component
const adaColors = [
  "#1565C0", // Darker Blue
  "#2E7D32", // Darker Green
  "#6A1B9A", // Darker Purple
  "#EF6C00", // Darker Orange
  "#303F9F", // Darker Indigo
  "#00838F", // Darker Cyan
  "#AD1457", // Darker Pink
  "#558B2F", // Darker Light Green
  "#4E342E", // Darker Brown
  "#00695C"  // Darker Teal
];

// Moved outside the component
function cleanFirestoreData(data: Record<string, any>) {
  return Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
}


export default function AddContactModal({ onClose, onSave, userId }: any) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    channel: "",
    category: "",
    website: "",
  });

  const [avatarColor, setAvatarColor] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [customCategory, setCustomCategory] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});


  useEffect(() => {
    setIsMounted(true);

    const hash = Math.floor(Math.random() * 100000);
    const index = hash % adaColors.length;
    setAvatarColor(adaColors[index]);

    const fetchCategories = async () => {
      if (userId) {
        const categories = await getAllCategories(userId);
        setCategoryOptions(categories);
      }
    };
    fetchCategories();
  }, [userId]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCustomCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomCategory(e.target.value);
    if (errors.customCategory) {
      setErrors((prev) => ({ ...prev, customCategory: "" }));
    }
  };


  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required.";
    }

    if (!formData.category || formData.category === "") {
      newErrors.category = "Category is required.";
    } else if (formData.category === "Other" && !customCategory.trim()) {
      newErrors.customCategory = "Custom category name is required when 'Other' is selected.";
    }

    if (formData.email && formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format.";
    }

    if (formData.phone && formData.phone.trim() && !/^\+?[0-9\s\-()]{7,20}$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number format.";
    }

    if (!formData.phone.trim() && !formData.email.trim()) {
      newErrors.phone = "Either phone or email must be provided.";
      newErrors.email = "Either phone or email must be provided.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please correct the errors in the form.");
      return;
    }

    let finalCategory = formData.category;
    if (formData.category === "Other") {
      finalCategory = customCategory.trim();
      await saveCategoryIfNew(userId, finalCategory);
    }

    const randomAvatarColor = adaColors[Math.floor(Math.random() * adaColors.length)];

    const newContact = {
      id: uuidv4(),
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      channel: formData.channel.trim() || null,
      category: finalCategory,
      website: formData.website.trim() || null,
      avatarColor: avatarColor,
      orderIndex: Date.now(),
      userId: userId,
    };

    try {
      await saveContactToFirestore(newContact);
      onSave(newContact);
      toast.success("Contact added successfully!");
      onClose();
    } catch (error) {
      console.error("Error adding contact:", error);
      toast.error("Failed to add contact. Please try again.");
    }
  };

  return (
    <div className="bg-white rounded-[5px] p-6 w-full max-w-md md:w-[400px] relative max-h-[90vh] overflow-y-auto"> {/* Adjusted width and added max-height/overflow */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        title="Close"
      >
        <X size={20} />
      </button>
      <h2 className="text-lg font-playfair text-[#332B42] mb-4">Add New Contact</h2>


      <div className="flex flex-col items-center mb-4">
        <div
          className="w-12 h-12 flex items-center justify-center rounded-full text-white text-sm font-normal"
          style={{ backgroundColor: isMounted && avatarColor ? avatarColor : "#364257" }}
        >
          {formData.name.trim()
            ? formData.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : "🙂"}
        </div>

        {formData.category && formData.category !== "" && (
          <CategoryPill category={formData.category === "Other" ? customCategory.trim() : formData.category} />
        )}
      </div>


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
          className="mt-4"
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

      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={onClose}
          className="btn-primaryinverse"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="btn-primary"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
