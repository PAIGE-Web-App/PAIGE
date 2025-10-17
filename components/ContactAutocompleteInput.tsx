import React, { useState, useEffect, useRef } from 'react';
import { Contact } from '@/types/contact';
import { Search, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContactAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onContactSelect: (contact: Contact | null) => void;
  placeholder?: string;
  disabled?: boolean;
  onAddNewContact?: () => void;
  onBlur?: () => void;
}

export default function ContactAutocompleteInput({
  value,
  onChange,
  onContactSelect,
  placeholder = "Search contacts...",
  disabled = false,
  onAddNewContact,
  onBlur
}: ContactAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch contacts on mount
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const { getAuth } = await import('firebase/auth');
        const { collection, getDocs, query, where, orderBy } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        const auth = getAuth();
        if (!auth.currentUser) return;

        const contactsSnapshot = await getDocs(
          query(
            collection(db, 'users', auth.currentUser.uid, 'contacts'),
            orderBy('name', 'asc')
          )
        );

        const fetchedContacts = contactsSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as Contact[];

        setAllContacts(fetchedContacts);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      }
    };

    fetchContacts();
  }, []);

  // Filter contacts based on input
  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    const filtered = allContacts.filter(contact =>
      contact.name.toLowerCase().includes(value.toLowerCase()) ||
      contact.email?.toLowerCase().includes(value.toLowerCase()) ||
      contact.phone?.includes(value)
    );

    setSuggestions(filtered.slice(0, 5)); // Limit to 5 suggestions
  }, [value, allContacts]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    console.log('🟡 [ContactAutocomplete] handleInputChange called with:', inputValue);
    
    // Always call onChange when user types
    console.log('🟡 [ContactAutocomplete] Calling onChange with:', inputValue);
    onChange(inputValue);
    
    setShowSuggestions(true);
  };

  const handleSelect = (contact: Contact) => {
    console.log('🔵 [ContactAutocomplete] handleSelect called with:', contact);
    
    // Update the input value immediately
    const contactInfo = `${contact.name}${contact.email ? ` - ${contact.email}` : ''}${contact.phone ? ` - ${contact.phone}` : ''}`;
    console.log('🔵 [ContactAutocomplete] Calling onChange with:', contactInfo);
    onChange(contactInfo);
    
    // Clear suggestions immediately
    setShowSuggestions(false);
    console.log('🔵 [ContactAutocomplete] Cleared suggestions');
    
    // Let the parent handle updating the input value through onContactSelect
    console.log('🔵 [ContactAutocomplete] Calling onContactSelect');
    onContactSelect(contact);
  };

  const handleAddNew = () => {
    if (onAddNewContact) {
      onAddNewContact();
    }
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        onBlur={(e) => {
          // Add a small delay to allow click on suggestion to complete first
          setTimeout(() => {
            if (onBlur) onBlur();
          }, 150);
        }}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded border-[#AB9C95] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] appearance-none ${
          disabled ? 'bg-[#F3F2F0] text-[#AB9C95] cursor-not-allowed' : 'bg-white text-[#332B42]'
        }`}
        style={{ fontFamily: 'Work Sans, sans-serif' }}
      />
      
      <AnimatePresence>
        {showSuggestions && (suggestions.length > 0 || (value.trim() && onAddNewContact)) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
          >
            {suggestions.map((contact) => (
              <div
                key={contact.id}
                onClick={() => handleSelect(contact)}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 text-sm" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                      {contact.name}
                    </div>
                    {contact.email && (
                      <div className="text-xs text-gray-500 mt-1">{contact.email}</div>
                    )}
                    {contact.phone && (
                      <div className="text-xs text-gray-500">{contact.phone}</div>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {value.trim() && onAddNewContact && (
              <div
                onClick={handleAddNew}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-t border-gray-200 bg-gray-50"
              >
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <UserPlus className="w-4 h-4" />
                  <span style={{ fontFamily: 'Work Sans, sans-serif' }}>
                    Add "{value}" as new contact
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
