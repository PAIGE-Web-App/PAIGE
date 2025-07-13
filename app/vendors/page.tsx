"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getAllContacts } from '@/lib/getContacts';
import { saveContactToFirestore } from '@/lib/saveContactToFirestore';
import type { Contact } from '@/types/contact';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ListFilter, Search } from 'lucide-react';
import CategoryPill from '@/components/CategoryPill';
import { useRouter } from 'next/navigation';
import EditContactModal from '@/components/EditContactModal';
import { toast } from 'react-hot-toast';
import WeddingBanner from '@/components/WeddingBanner';
import { useWeddingBanner } from '@/hooks/useWeddingBanner';
import SectionHeaderBar from '@/components/SectionHeaderBar';
import BadgeCount from '@/components/BadgeCount';
import Banner from '@/components/Banner';
import VendorSkeleton from '@/components/VendorSkeleton';
import { Mail, Phone } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import FilterButtonPopover from '@/components/FilterButtonPopover';
import { highlightText } from '@/utils/searchHighlight';

function ConfirmOfficialModal({ open, onClose, onConfirm, vendorName, category, action }: { open: boolean; onClose: () => void; onConfirm: () => void; vendorName: string; category: string; action: 'star' | 'unstar'; }) {
  if (!open) return null;
  
  const isStarring = action === 'star';
  const title = isStarring ? 'Set as Official Vendor?' : 'Unmark as Official Vendor?';
  const message = isStarring 
    ? `Are you sure you want to set ${vendorName} as your official ${category}? This will unmark any other vendor in this category.`
    : `Are you sure you want to unmark ${vendorName} as your official ${category}?`;
  const confirmText = isStarring ? 'Confirm' : 'Unmark';
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full max-w-sm p-6 relative flex flex-col items-center"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>
          <h3 className="font-playfair text-xl font-semibold text-[#332B42] mb-4 text-center">{title}</h3>
          <p className="text-sm text-gray-600 mb-6 text-center">
            {message}
          </p>
          <div className="flex justify-center w-full gap-2">
            <button
              onClick={onClose}
              className="btn-primaryinverse px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="btn-primary px-4 py-2 text-sm"
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function VendorsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; contact: Contact | null; action: 'star' | 'unstar' }>({ open: false, contact: null, action: 'star' });
  const [isSaving, setIsSaving] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; contact: Contact | null }>({ open: false, contact: null });
  const [isLoading, setIsLoading] = useState(true);
  // Use centralized WeddingBanner hook
  const { daysLeft, userName, isLoading: bannerLoading, handleSetWeddingDate } = useWeddingBanner(router);
  const [showFilters, setShowFilters] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');
  // Ensure searchOpen is false by default
  const [searchOpen, setSearchOpen] = useState(false);

  // Filtered and searched contacts
  const filteredContacts = contacts.filter((c) => {
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(c.category);
    const matchesSearch = vendorSearch.trim() === '' || c.name.toLowerCase().includes(vendorSearch.toLowerCase()) || (c.email && c.email.toLowerCase().includes(vendorSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    if (user?.uid) {
      setIsLoading(true);
      getAllContacts(user.uid).then((data) => {
        setContacts(data);
        // Count categories
        const counts: Record<string, number> = {};
        data.forEach((contact) => {
          if (contact.category) {
            counts[contact.category] = (counts[contact.category] || 0) + 1;
          }
        });
        setCategoryCounts(counts);
        setIsLoading(false);
      }).catch((error) => {
        console.error('Error loading contacts:', error);
        setIsLoading(false);
      });
    }
  }, [user, isSaving]);

  // Get unique categories, sorted alphabetically
  const categories = Object.keys(categoryCounts).sort((a, b) => a.localeCompare(b));
  const allCount = contacts.length;

  // Find official vendor for each category
  const officialByCategory: Record<string, string> = {};
  contacts.forEach((c) => {
    if (c.isOfficial && c.category) officialByCategory[c.category] = c.id;
  });

  // Handler to set a vendor as official
  const handleSetOfficial = async (contact: Contact) => {
    setIsSaving(true);
    try {
      // Unmark all in this category, then mark this one
      const updates = contacts
        .filter((c) => c.category === contact.category)
        .map((c) =>
          saveContactToFirestore({ ...c, isOfficial: c.id === contact.id })
        );
      await Promise.all(updates);
      // Update local state
      setContacts((prev) => 
        prev.map((c) => ({ ...c, isOfficial: c.category === contact.category ? c.id === contact.id : false }))
      );
      toast.success(`${contact.name} marked as official ${contact.category}`);
    } catch (error) {
      console.error('Error setting official vendor:', error);
      toast.error('Failed to mark vendor as official');
    }
    setIsSaving(false);
    setConfirmModal({ open: false, contact: null, action: 'star' });
  };

  // Handler to unset a vendor as official (unstar)
  const handleUnsetOfficial = async (contact: Contact) => {
    setIsSaving(true);
    try {
      await saveContactToFirestore({ ...contact, isOfficial: false });
      // Update local state
      setContacts((prev) => 
        prev.map((c) => c.id === contact.id ? { ...c, isOfficial: false } : c)
      );
      toast.success(`${contact.name} unmarked as official ${contact.category}`);
    } catch (error) {
      console.error('Error unsetting official vendor:', error);
      toast.error('Failed to unmark vendor as official');
    }
    setIsSaving(false);
    setConfirmModal({ open: false, contact: null, action: 'unstar' });
  };

  return (
    <div className="flex flex-col h-screen bg-linen">
      <WeddingBanner
        daysLeft={daysLeft}
        userName={userName}
        isLoading={bannerLoading}
        onSetWeddingDate={handleSetWeddingDate}
      />
      <div className="app-content-container flex h-full gap-4 md:flex-row flex-col">
        {/* Main Vendors Area */}
        <main className="flex flex-1 flex-col bg-white border border-[#AB9C95] rounded-[5px] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b border-[#AB9C95] bg-[#F3F2F0]">
            <h4 className="text-lg font-playfair font-medium text-[#332B42]">Vendors</h4>
            <div className="flex gap-2">
              <button className="btn-primaryinverse">Browse all</button>
              <button className="btn-primary">Add Vendor</button>
            </div>
          </div>
          
          <div className="flex flex-row flex-1 min-h-0">
            {/* Sidebar Categories */}
            <aside className="w-[320px] border-r border-[#AB9C95] bg-[#F3F2F0] flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 pt-0">
                  <div className="space-y-1">
                    {/* All Vendors */}
                    <div
                      className={`flex items-center px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer mt-4 mb-2 transition-colors ${selectedCategories.length === 0 ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'}`}
                      onClick={() => setSelectedCategories([])}
                    >
                      <span>All Vendors</span>
                      <BadgeCount count={allCount} className="ml-auto" />
                    </div>
                    {/* Dynamic categories */}
                    {categories.map((cat) => (
                      <div
                        key={cat}
                        className={`flex items-center px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer transition-colors ${selectedCategories.includes(cat) ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'}`}
                        onClick={() => {
                          setSelectedCategories(prev => {
                            const newSelected = [...prev];
                            const index = newSelected.indexOf(cat);
                            if (index > -1) {
                              newSelected.splice(index, 1);
                            } else {
                              newSelected.push(cat);
                            }
                            return newSelected;
                          });
                        }}
                      >
                        <span>{cat}</span>
                        <BadgeCount count={categoryCounts[cat]} className="ml-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button className="border-t border-[#AB9C95] py-3 text-xs text-[#A85C36] hover:bg-[#F3F2F0] transition-colors">+ New Category</button>
            </aside>
            
            {/* Vendor List */}
            <section className="flex-1 flex flex-col min-h-0">
              {/* Standardized Header with Filter and Search */}
              <SectionHeaderBar
                title={
                  <div className="flex items-center gap-2">
                    Your Vendors
                    <BadgeCount count={filteredContacts.length} />
                  </div>
                }
              >
                <div className="flex items-center gap-3 flex-grow min-w-0" style={{ height: '32px' }}>
                  <FilterButtonPopover
                    categories={categories}
                    selectedCategories={selectedCategories}
                    onSelectCategories={setSelectedCategories}
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                  />
                  <SearchBar
                    value={vendorSearch}
                    onChange={setVendorSearch}
                    placeholder="Search vendors by name"
                    isOpen={searchOpen}
                    setIsOpen={setSearchOpen}
                  />
                </div>
              </SectionHeaderBar>

              {/* Vendor List */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {isLoading ? (
                  // Show skeleton loading states
                  Array.from({ length: 5 }).map((_, index) => (
                    <VendorSkeleton key={index} />
                  ))
                ) : filteredContacts.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">No matching vendors found.</div>
                ) : (
                  filteredContacts.map((contact) => (
                  <div key={contact.id} className="border rounded-[5px] border-[#AB9C95] p-4 flex flex-row items-center gap-4 relative">
                    {/* Left: Star, Name, Category, Email, Phone */}
                    <div className="flex flex-col flex-1 gap-1 pr-40">
                      <div className="flex items-center gap-2">
                        {officialByCategory[contact.category] === contact.id ? (
                          <button
                            className="text-[#A85C36] text-lg hover:text-[#AB9C95] transition-colors"
                            title="Unmark as Official Vendor"
                            disabled={isSaving}
                            onClick={() => setConfirmModal({ open: true, contact, action: 'unstar' })}
                          >
                            ★
                          </button>
                        ) : (
                          <button
                            className="text-[#AB9C95] text-lg hover:text-[#A85C36] transition-colors"
                            title="Set as Official Vendor"
                            disabled={isSaving}
                            onClick={() => setConfirmModal({ open: true, contact, action: 'star' })}
                          >
                            ☆
                          </button>
                        )}
                        <h4 className="text-[16px] font-medium text-[#332B42] leading-tight font-playfair mr-1">
                          {highlightText(contact.name, vendorSearch)}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {contact.category && <CategoryPill category={contact.category} />}
                        {contact.email && (
                          <button
                            type="button"
                            onClick={() => router.push(`/?contactId=${contact.id}`)}
                            className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1 focus:outline-none"
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                          >
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[100px] md:max-w-none">{highlightText(contact.email, vendorSearch)}</span>
                          </button>
                        )}
                        {contact.phone && (
                          <button
                            type="button"
                            onClick={() => router.push(`/?contactId=${contact.id}`)}
                            className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1 focus:outline-none"
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                          >
                            <Phone className="w-3 h-3" />
                            <span className="truncate max-w-[100px] md:max-w-none">{contact.phone}</span>
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Right: Edit and Contact buttons */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        className="btn-small-inverse flex items-center gap-1"
                        onClick={() => setEditModal({ open: true, contact })}
                        title="Edit Vendor"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z" /></svg>
                        Edit
                      </button>
                      <button
                        className="btn-small-inverse"
                        onClick={() => router.push(`/?contactId=${contact.id}`)}
                      >
                        Contact
                      </button>
                    </div>
                  </div>
                ))
                )}
              </div>
            </section>
          </div>
        </main>
        
        {/* Right Panel (Favorites and Comments) */}
        <aside className="md:w-[420px] w-full flex flex-col gap-6 min-h-full">
          {/* Favorites */}
          <div className="bg-white border border-[#AB9C95] rounded-[5px] p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="font-playfair text-[#332B42] text-base font-semibold">Favorites <span className="text-xs text-[#AB9C95]">12</span></span>
              <button className="text-xs text-[#A85C36] underline">View all</button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {/* Example Favorite Cards */}
              <div className="min-w-[180px] border rounded-[5px] border-[#AB9C95] p-2 flex flex-col items-start">
                <div className="w-full h-20 bg-[#F3F2F0] rounded mb-2 flex items-center justify-center">[Image]</div>
                <span className="text-xs text-[#A85C36] mb-1">Contacted Jan 14 2025</span>
                <span className="font-medium text-[#332B42] text-sm mb-1">The Milestone | Aubrey by Walters Wedding Estates</span>
                <span className="text-xs text-[#364257] mb-1">Dallas, TX</span>
                <span className="text-xs text-[#364257] mb-1">300+ Guests • $ • Outdoor Event Space</span>
                <span className="text-xs text-[#A85C36] underline mb-2">The Knot</span>
                <button className="border border-[#AB9C95] rounded px-2 py-1 text-xs text-[#332B42]">Contact</button>
              </div>
              <div className="min-w-[180px] border rounded-[5px] border-[#AB9C95] p-2 flex flex-col items-start">
                <div className="w-full h-20 bg-[#F3F2F0] rounded mb-2 flex items-center justify-center">[Image]</div>
                <span className="font-medium text-[#332B42] text-sm mb-1">The Aubrey Courtyard by the Grand Estates West Texas</span>
                <span className="text-xs text-[#364257] mb-1">Dallas, TX</span>
                <span className="text-xs text-[#364257] mb-1">300+ Guests • $ • Outdoor Event Space</span>
                <span className="text-xs text-[#A85C36] underline mb-2">The Knot</span>
                <button className="border border-[#AB9C95] rounded px-2 py-1 text-xs text-[#332B42]">Contact</button>
              </div>
              {/* ...more favorite cards... */}
            </div>
          </div>
          {/* Comments */}
          <div className="bg-white border border-[#AB9C95] rounded-[5px] p-4 flex flex-col flex-1 min-h-[200px]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-playfair text-[#332B42] text-base font-semibold">Comments <span className="text-xs text-[#AB9C95]">3 unread</span></span>
              <button className="text-xs text-[#A85C36] underline">View all</button>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto">
              {/* Example Comment Cards */}
              <div className="border rounded-[5px] border-[#AB9C95] p-2 flex flex-col">
                <span className="font-medium text-[#332B42] text-xs mb-1">The Milestone | Aubrey by Walters Wedding Estates</span>
                <span className="text-xs text-[#364257] mb-1">Meh, not bad</span>
                <span className="text-xs text-[#AB9C95] ml-auto">You • 2 days</span>
              </div>
              <div className="border rounded-[5px] border-[#AB9C95] p-2 flex flex-col">
                <span className="font-medium text-[#332B42] text-xs mb-1">The Aubrey Courtyard by the Grand Estates West Texas</span>
                <span className="text-xs text-[#364257] mb-1">Pretty nice area with an all inclusive setting!</span>
                <span className="text-xs text-[#AB9C95] ml-auto">Annie Borne • 4 days</span>
              </div>
              {/* ...more comment cards... */}
            </div>
          </div>
        </aside>
        <ConfirmOfficialModal
          open={confirmModal.open}
          onClose={() => setConfirmModal({ open: false, contact: null, action: 'star' })}
          onConfirm={() => {
            if (confirmModal.contact) {
              if (confirmModal.action === 'star') {
                handleSetOfficial(confirmModal.contact);
              } else {
                handleUnsetOfficial(confirmModal.contact);
              }
            }
          }}
          vendorName={confirmModal.contact?.name || ''}
          category={confirmModal.contact?.category || ''}
          action={confirmModal.action}
        />
        {/* EditContactModal overlay */}
        {editModal.open && editModal.contact && user?.uid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <EditContactModal
              contact={editModal.contact}
              userId={user.uid}
              onClose={() => setEditModal({ open: false, contact: null })}
              onSave={(updated) => {
                setContacts((prev) => prev.map((c) => c.id === updated.id ? updated : c));
                setEditModal({ open: false, contact: null });
              }}
              onDelete={(deletedId) => {
                setContacts((prev) => prev.filter((c) => c.id !== deletedId));
                setEditModal({ open: false, contact: null });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
} 