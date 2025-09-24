'use client';

import React, { useState } from 'react';
import { X, Sparkles, CheckCircle, Calendar, Heart, Users, Palette, Utensils, Camera, Music, Car, Gift, MapPin, FileText, Bot, ChevronRight, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CategoryPill from './CategoryPill';
import UnifiedTodoItem from './UnifiedTodoItem';
import BadgeCount from './BadgeCount';
import { useUserProfileData } from '@/hooks/useUserProfileData';

interface TodoTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TodoTemplate, allowAIDeadlines?: boolean) => void;
  onCreateWithAI: () => void;
}

interface TodoTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  taskCount?: number;
  estimatedTime: string;
  tasks: Array<{ name: string; note?: string }>;
  isRecommended?: boolean;
  recommendedText?: string;
  allowAIDeadlines?: boolean; // New property for AI deadline setting
}

const TODO_TEMPLATES: TodoTemplate[] = [
  {
    id: 'venue-selection',
    name: 'Select Main Venue & Set Wedding Date',
    description: 'This is the first step to successful wedding prep!',
    icon: <MapPin className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-600',
    estimatedTime: 'Start ASAP',
    isRecommended: true,
    tasks: [
      // Discover & Shortlist
      { name: 'Browse and favorite venues on the Vendors page', note: 'Favorite promising venues with <3 in the catalog to build your Shortlist. Visit the venue website, take notes and leave comments on the venue page!' },
      { name: 'Set your venue budget cap on the Budget page', note: 'Go to the Budget page and add a category for Venue expenses to start tracking how much you\'re willing to spend on your selected venue' },
      { name: 'Confirm guest count', note: 'Go to the Settings page and navigate to the Wedding Details tab to confirm your guest count' },
      { name: 'Update your wedding vibe', note: 'Go to Moodboards and add images, and vibes to come up with the vibes for your big day' },
      { name: 'Pick 3–5 date windows that work for you' },
      { name: 'Add must-haves', note: 'e.g. do you have accessibility needs, do you need a Plan B room, do you need to bring in your own caterer, etc.' },
      
      // Inquire (from your Shortlist)
      { name: 'Send availability + full-pricing requests to your Shortlist', note: 'Use the Messages page to send inquiries to your shortlisted venues. Ask about availability for your date windows and request full pricing breakdowns including all fees, taxes, and required services' },
      { name: 'Keep tabs of the responses on the Messages page', note: 'Track all venue responses, pricing details, and availability in the Messages page. Compare responses side-by-side to make informed decisions' },
      
      // Tour Like a Pro
      { name: 'Schedule tours in with the venues and add them to your calendar!', note: 'Book tours for your top 3-5 venues. Schedule them close together if possible to compare while details are fresh' },
      { name: 'Take notes on guest path, Plan B room, catering rules, power/AV', note: 'During tours, document the guest flow, backup indoor spaces, catering restrictions, and technical requirements. Use the Notes feature in the Vendors page' },
      { name: 'Snap photos and upload them to unique folders in the Files page', note: 'Take photos of ceremony spaces, reception areas, bathrooms, parking, and any concerns. Organize by venue name in the Files page' },
      { name: 'Calculate "true cost" in Compare → Venue Cost Calc', note: 'Use the venue cost calculator to factor in all fees, required services, and hidden costs to get the real total price' },
      { name: 'Check true capacity (with dance floor) and log sunset/photo window', note: 'Verify actual capacity with dance floor and note the best lighting times for photos, especially for outdoor ceremonies' },
      { name: 'Take note of hotel/airport travel time', note: 'Consider guest convenience and transportation logistics when evaluating venue locations' },
      
      // Lock It In
      { name: 'Select your winner in the Vendors page and choose your Main Venue', note: 'Mark your chosen venue as the Main Venue in the Vendors page. This will be used for AI recommendations and other features' },
      { name: 'Set your official Wedding Date', note: 'This is crucial! Set your official wedding date in Settings → Wedding Details. This enables AI functionality and helps with timeline planning' },
      { name: 'Request a written proposal and upload to Files', note: 'Get a detailed written proposal from your chosen venue and upload it to the Files page for your records' },
      { name: 'Review & e-sign in Contracts (payments, cancellation, overtime, Plan B trigger), then Mark as Signed', note: 'Carefully review all contract terms including payment schedules, cancellation policies, overtime charges, and weather backup plans. Use the Contracts page to track and mark as signed' },
      { name: 'Pay deposit and record it in Budget', note: 'Make your venue deposit payment and record it in the Budget page under your Venue category to track your spending' }
    ]
  },
  {
    id: 'full-wedding-planning',
    name: 'Full Wedding Checklist',
    description: 'Complete checklist from engagement to honeymoon',
    icon: <Heart className="w-4 h-4" />,
    color: 'bg-pink-100 text-pink-600',
    estimatedTime: 'Start 12-18 months out',
    isRecommended: true,
    recommendedText: 'Recommended after Setting Wedding Date',
    tasks: [
      // Kickoff (ASAP)
      { name: 'Define budget, contributors, and decision style (who signs off on what)', note: 'Go to Budget page to set your max budget and track contributions. Use Settings → Wedding Details to note decision-makers.' },
      { name: 'Sketch guest count range and vibe', note: 'Update guest count in Settings → Wedding Details. Create mood boards in Moodboards page to define your vibe.' },
      { name: 'Choose 3–5 date windows', note: 'Note your preferred date windows in Settings → Wedding Details for planning purposes.' },
      { name: 'Create a shared email/folder/spreadsheet for planning', note: 'Set up your planning email in Settings → Account. Use Files page to organize all wedding documents.' },
      { name: 'List cultural/religious must-haves', note: 'Add cultural requirements in Settings → Wedding Details. Use Notes in Vendors page to track venue policies.' },
      
      // Lock Venue + Date (early)
      { name: 'Shortlist venues; request availability + full pricing; hold top dates', note: 'Use Vendors page to favorite venues and send inquiries via Messages. Track responses and pricing in Messages page.' },
      { name: 'Tour spaces; inspect Plan B; verify policies', note: 'Schedule tours via Messages page. Take photos during tours and upload to Files page organized by venue name.' },
      { name: 'Compare true cost; select venue; sign + pay deposit', note: 'Use Compare → Venue Cost Calculator to factor all fees. Mark chosen venue as Main Venue in Vendors page.' },
      { name: 'Block hotel rooms', note: 'Research hotels in Vendors page and book room blocks. Track booking details in Files page.' },
      
      // Core Team (9–12 months)
      { name: 'Book photographer, videographer, planner/coordinator (if using), entertainment, florist, officiant', note: 'Use Vendors page to research and favorite vendors. Send inquiries via Messages and track responses.' },
      { name: 'Start registry (can be private)', note: 'Research registry options and create accounts with your preferred retailers. Keep private until ready to share.' },
      { name: 'Launch simple wedding website', note: 'Create wedding website in Settings → Wedding Details. Start with basic info and expand later.' },
      { name: 'Collect guest addresses', note: 'Use Contacts page to build your guest list with addresses. Import from existing contacts or add manually.' },
      
      // Looks + Attire (8–10 months)
      { name: 'Shop outfits; schedule alterations', note: 'Research bridal shops in Vendors page. Schedule fittings and track appointments in your personal calendar.' },
      { name: 'Pick wedding party; select their attire', note: 'Add wedding party members in Contacts page. Research attire options in Vendors page.' },
      { name: 'Plan engagement shoot (optional)', note: 'Book engagement shoot with your photographer via Messages page. Schedule in your personal calendar.' },
      
      // Food + Flow (6–8 months)
      { name: 'Taste menus/cake; decide bar approach', note: 'Schedule tastings with caterers via Messages page. Track menu decisions in Files page.' },
      { name: 'Reserve rentals/lighting/photo booth if needed', note: 'Research rental companies in Vendors page. Book via Messages and track in your personal calendar.' },
      { name: 'Outline ceremony + reception flow', note: 'Create timeline and share with vendors via Messages for feedback.' },
      { name: 'Book transportation (party + guests if needed)', note: 'Research transportation in Vendors page. Book via Messages and add to your personal calendar.' },
      { name: 'Plan honeymoon basics (passports, time off)', note: 'Check passport requirements and book time off. Track honeymoon planning in Files page.' },
      
      // Paper + Details (4–6 months)
      { name: 'Order invitations + day-of stationery', note: 'Research stationery vendors in Vendors page. Order via Messages and track delivery in your personal calendar.' },
      { name: 'Book hair/makeup; schedule trials', note: 'Find hair/makeup artists in Vendors page. Book trials via Messages and schedule in your personal calendar.' },
      { name: 'Choose ceremony readings + music', note: 'Select readings and music. Share choices with officiant via Messages page.' },
      { name: 'Design décor plan and timeline with your florist/venue', note: 'Collaborate with florist via Messages. Upload inspiration images to Files page.' },
      
      // Send + Finalize (2–4 months)
      { name: 'Mail invitations (set RSVP ~3–4 weeks before)', note: 'Mail invitations and track RSVPs in Contacts page. Set RSVP deadline in your personal calendar.' },
      { name: 'Track RSVPs and meal preferences', note: 'Update guest responses in Contacts page. Track meal preferences for caterer.' },
      { name: 'Order rings + accessories', note: 'Research jewelers in Vendors page. Order via Messages and track delivery in your personal calendar.' },
      { name: 'Confirm officiant script + license requirements', note: 'Finalize ceremony script with officiant via Messages. Check license requirements in Files.' },
      { name: 'Reserve rehearsal-dinner space + after-party spot', note: 'Book venues in Vendors page. Reserve via Messages and add to your personal calendar.' },
      
      // Tighten Up (4–6 weeks)
      { name: 'Build seating chart; confirm headcount with caterer', note: 'Create seating chart in Contacts page. Confirm final headcount with caterer via Messages.' },
      { name: 'Share day-of timeline + contacts with vendors and wedding party', note: 'Share timeline via Messages with all vendors. Include contact list for wedding day.' },
      { name: 'Approve floor plan; confirm load-in/out and power/AV', note: 'Review floor plan with venue via Messages. Confirm technical requirements and timing.' },
      { name: 'Book final fittings; break in shoes', note: 'Schedule final fittings in your personal calendar. Break in shoes and track in Files page.' },
      { name: 'Prepare vendor meal list + allergies', note: 'Create vendor meal list in Files page. Include dietary restrictions and allergies.' },
      
      // Week Of
      { name: 'Walk the venue; verify Plan B and signage placement', note: 'Schedule final walk-through via Messages. Verify backup plans and signage locations.' },
      { name: 'Pack emergency kit (tape, steamer, meds, sewing kit, stain stick, chargers)', note: 'Create emergency kit checklist in Files page. Pack and organize by category.' },
      { name: 'Assemble tip envelopes + final payments; assign who hands them out', note: 'Prepare tip envelopes in Files page. Assign distribution to trusted wedding party members.' },
      { name: 'Organize décor/welcome bags; label boxes by area', note: 'Organize décor by venue area in Files page. Label boxes clearly for setup team.' },
      { name: 'Print extra timelines, shot list, and seating', note: 'Print backup copies of all documents. Store in Files page for easy access.' },
      
      // Day Before
      { name: 'Rehearse ceremony; confirm lineup and timing', note: 'Run through ceremony with officiant and wedding party. Confirm timing and positioning.' },
      { name: 'Stage flat-lay items (invites, rings, keepsakes)', note: 'Set up flat-lay items for photographer. Include invitation suite, rings, and special keepsakes.' },
      { name: 'Hydrate, eat, sleep', note: 'Take care of yourself! Get plenty of rest and stay hydrated for the big day.' },
      
      // Wedding Day
      { name: 'Start hair/makeup on schedule; buffer 15 mins before lineup', note: 'Follow your timeline. Build in buffer time for any delays.' },
      { name: 'Hand off rings, vows, license, and emergency kit to point people', note: 'Assign trusted people to handle important items. Use your emergency kit from Files page.' },
      { name: 'Sneak a plate + water during cocktail hour', note: 'Make sure to eat and stay hydrated! Delegate someone to bring you food and water.' },
      { name: 'Enjoy the moments—delegate everything else', note: 'Focus on enjoying your day. Let your wedding party and vendors handle the details.' },
      
      // After
      { name: 'Return rentals; tip/settle final invoices', note: 'Return all rentals and settle final vendor payments. Track in Files page for records.' },
      { name: 'Send thank-yous; review vendors online', note: 'Send thank-you notes to vendors via Messages. Leave reviews to help other couples.' },
      { name: 'Preserve attire; back up photos/videos', note: 'Get attire professionally cleaned and preserved. Back up all photos and videos in Files page.' },
      { name: 'Handle name changes (if applicable)', note: 'Start name change process if desired. Track required documents in Files page.' },
      
      // Tiny "Don't-Forget" Wins
      { name: 'Confirm accessibility, shade/heat, and quiet space', note: 'Verify venue accessibility and comfort options. Check with venue via Messages page.' },
      { name: 'Set rain/heat trigger time and who decides', note: 'Establish weather backup plan with venue. Document decision-makers in Files page.' },
      { name: 'Arrange kids\' plan (meals, activities, sitter)', note: 'Plan activities and meals for children. Coordinate with venue and parents via Messages.' },
      { name: 'Map local events that impact traffic/hotels', note: 'Check for local events that might affect traffic or hotel availability. Share with guests.' },
      { name: 'Print 10–15% extra stationery for mistakes/keepsakes', note: 'Order extra stationery for mistakes and keepsakes. Track quantities in Files page.' },
    ]
  }
];

// Helper function to get template sections
const getTemplateSections = (templateId: string, totalTasks: number) => {
  switch (templateId) {
    case 'full-wedding-planning':
      return [
        { name: 'Kickoff (ASAP)', start: 0, end: 5 },
        { name: 'Lock Venue + Date (early)', start: 5, end: 9 },
        { name: 'Core Team (9–12 months out)', start: 9, end: 13 },
        { name: 'Looks + Attire (8–10 months out)', start: 13, end: 16 },
        { name: 'Food + Flow (6–8 months out)', start: 16, end: 21 },
        { name: 'Paper + Details (4–6 months out)', start: 21, end: 25 },
        { name: 'Send + Finalize (2–4 months out)', start: 25, end: 30 },
        { name: 'Tighten Up (4–6 weeks out)', start: 30, end: 35 },
        { name: 'Week Of', start: 35, end: 40 },
        { name: 'Day Before', start: 40, end: 43 },
        { name: 'Wedding Day', start: 43, end: 47 },
        { name: 'After', start: 47, end: 51 },
        { name: 'Tiny "Don\'t-Forget" Wins', start: 51, end: totalTasks }
      ];
    case 'venue-selection':
      return [
        { name: 'Prep (ASAP)', start: 0, end: 4 },
        { name: 'Shortlist & Ask', start: 4, end: 7 },
        { name: 'Tour Like a Pro', start: 7, end: 10 },
        { name: 'Compare Apples to Apples', start: 10, end: 13 },
        { name: 'Lock It In', start: 13, end: totalTasks }
      ];
    default:
      // For templates without defined sections, create a single "All Tasks" section
      return [
        { name: 'All Tasks', start: 0, end: totalTasks }
      ];
  }
};

// Universal template rendering function
const renderTemplateWithSections = (
  template: TodoTemplate,
  openPlanningPhases: { [key: string]: boolean },
  togglePlanningPhase: (phaseName: string) => void,
  allowAIDeadlines: boolean,
  hasWeddingDate: boolean
) => {
  const sections = getTemplateSections(template.id, template.tasks.length);
  
  return sections.map((phase, phaseIndex) => {
    const phaseTasks = template.tasks.slice(phase.start, phase.end);
    if (phaseTasks.length === 0) return null;

    return (
      <div key={phaseIndex} className="mb-4">
        <button
          className="flex items-center w-full text-left gap-2 mb-2"
          onClick={() => togglePlanningPhase(phase.name)}
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform ${(openPlanningPhases[phase.name] ?? true) ? 'rotate-90' : ''}`}
            strokeWidth={2}
          />
          <h6 className="font-work text-sm font-medium text-[#332B42]">{phase.name}</h6>
          <BadgeCount count={phaseTasks.length} />
        </button>
        <div className={`${(openPlanningPhases[phase.name] ?? true) ? 'block' : 'hidden'}`}>
          {phaseTasks.map((task, index) => {
            const taskName = typeof task === 'string' ? task : task.name;
            const taskNote = typeof task === 'string' ? '' : (task.note || '');
            const mockTodo = {
              id: `template-task-${phaseIndex}-${index}`,
              name: taskName,
              note: taskNote,
              category: null, // No default category for template items
              deadline: null,
              endDate: null,
              isCompleted: false,
              assignedTo: null,
              contactId: null,
              completedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              listId: 'template-preview',
              order: index,
              orderIndex: index,
              userId: 'template-preview-user',
              justUpdated: false,
              allowAIDeadlines: allowAIDeadlines && hasWeddingDate && template.id === 'full-wedding-planning'
            };

            return (
              <div key={index} className="border-b border-[#E0DBD7] last:border-b-0">
                <UnifiedTodoItem
                  todo={mockTodo}
                  contacts={[]}
                  allCategories={['Planning', 'Photographer', 'Caterer', 'Florist', 'DJ', 'Venue']}
                  sortOption="myOrder"
                  draggedTodoId={null}
                  dragOverTodoId={null}
                  dropIndicatorPosition={{ id: null, position: null }}
                  currentUser={null}
                  handleToggleTodoComplete={() => {}}
                  handleUpdateTaskName={async () => {}}
                  handleUpdateDeadline={() => {}}
                  handleUpdateNote={() => {}}
                  handleUpdateCategory={() => {}}
                  handleCloneTodo={() => {}}
                  handleDeleteTodo={() => {}}
                  setTaskToMove={() => {}}
                  setShowMoveTaskModal={() => {}}
                  handleDragStart={() => {}}
                  handleDragEnter={() => {}}
                  handleDragLeave={() => {}}
                  handleItemDragOver={() => {}}
                  handleDragEnd={() => {}}
                  handleDrop={() => {}}
                  className=""
                  listName="Template Preview"
                  mode="editor"
                  onRemove={() => {}}
                  isJustMoved={false}
                  searchQuery=""
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  });
};

export default function TodoTemplatesModal({ isOpen, onClose, onSelectTemplate, onCreateWithAI }: TodoTemplatesModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TodoTemplate | null>(null);
  const [openPlanningPhases, setOpenPlanningPhases] = useState<{ [key: string]: boolean }>({});
  const [allowAIDeadlines, setAllowAIDeadlines] = useState(false);
  
  // Tight deadline confirmation state
  const [showTightDeadlineWarning, setShowTightDeadlineWarning] = useState(false);
  
  // Get user's wedding date to determine if AI deadlines should be enabled
  const { weddingDate } = useUserProfileData();
  const hasWeddingDate = weddingDate != null;

  // Set default checkbox state based on wedding date
  React.useEffect(() => {
    if (hasWeddingDate) {
      setAllowAIDeadlines(true);
    } else {
      setAllowAIDeadlines(false);
    }
  }, [hasWeddingDate]);

  const handleTemplateSelect = (template: TodoTemplate) => {
    setSelectedTemplate(template);
  };

  const handleConfirmSelection = () => {
    if (selectedTemplate) {
      // Check for tight deadlines if AI deadlines are enabled
      if (allowAIDeadlines && hasWeddingDate && weddingDate) {
        const wedding = new Date(weddingDate);
        const now = new Date();
        const daysUntilWedding = Math.ceil((wedding.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilWedding < 90) {
          // Show tight deadline warning banner
          setShowTightDeadlineWarning(true);
          
          // Scroll to top of the modal content so user can see the warning
          setTimeout(() => {
            const modalContent = document.querySelector('.modal-content-scrollable');
            if (modalContent) {
              modalContent.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }, 100);
          
          return;
        }
      }
      
      // Proceed with template selection
      onSelectTemplate(selectedTemplate, allowAIDeadlines && hasWeddingDate);
      onClose();
    }
  };

  const handleContinueAnyway = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate, allowAIDeadlines && hasWeddingDate);
      onClose();
    }
  };

  const handleCancelTightDeadline = () => {
    setShowTightDeadlineWarning(false);
  };

  const handleCreateWithAI = () => {
    onCreateWithAI();
    onClose();
  };

  const togglePlanningPhase = (phaseName: string) => {
    setOpenPlanningPhases(prev => ({
      ...prev,
      [phaseName]: !prev[phaseName]
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-white rounded-[5px] shadow-xl max-w-4xl w-full h-[80vh] md:h-[85vh] flex flex-col relative mx-2 md:mx-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#E0DBD7] flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="bg-[#A85C36] bg-opacity-10 rounded-full p-2">
                  <CheckCircle className="w-6 h-6 text-[#A85C36]" />
                </div>
                <h5 className="h5">Quick Start with Common To-Do Lists</h5>
              </div>
              <button
                onClick={onClose}
                className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full ml-auto"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 modal-content-scrollable">
              {!selectedTemplate ? (
                <>
                  <div className="mb-4">
                    {/* Purple AI Banner */}
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
                        <div className="flex-1">
                          <p className="text-sm text-purple-800 font-medium mb-1">
                            Want a hyper-personalized to-do list?
                          </p>
                          <p className="text-xs text-purple-600">
                            Generate a custom list tailored to your specific wedding needs and preferences
                          </p>
                        </div>
                        <button
                          onClick={handleCreateWithAI}
                          className="btn-gradient-purple flex items-center gap-2 w-full md:w-auto md:ml-4 flex-shrink-0 justify-center md:justify-start"
                        >
                          <Sparkles className="w-4 h-4" />
                          Generate with Paige (2 Credits)
                        </button>
                      </div>
                    </div>

                    {/* Separator Line */}
                    <div className="border-b border-gray-300 mb-4"></div>

                    <p className="text-sm text-gray-600 text-left mb-4">
                      Select to-do list templates below to get started quickly. You can customize tasks later.
                    </p>
                    
                  </div>

                  {/* Template Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                    {TODO_TEMPLATES.map((template) => (
                      <div
                        key={template.id}
                        className="p-3 md:p-4 rounded-lg border-2 transition-colors duration-200 text-left relative cursor-pointer border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100 flex flex-col h-full"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        {/* AI-powered pill in top right */}
                        {template.id === 'full-wedding-planning' && (
                          <div className="absolute top-3 right-3">
                            <span className="inline-flex items-center text-[10px] lg:text-xs font-medium rounded-full px-2 lg:px-2 py-0 lg:py-0.5 border bg-purple-100 text-purple-800 border-purple-200">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI-powered
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3 mb-2">
                          {template.icon}
                          <span className="font-semibold text-sm">{template.name}</span>
                        </div>
                        <div className="text-sm opacity-75 mb-4 flex-grow">
                          {template.description}
                        </div>
                        
                        <div className="mt-auto flex flex-col">
                          {/* Recommended pill above metadata */}
                          {template.isRecommended && (
                            <div className="mb-2">
                              <CategoryPill category={template.recommendedText || "Recommended"} />
                            </div>
                          )}
                          
                          <div className="text-xs font-normal">
                            {template.tasks.length} to-do items • {template.estimatedTime}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              </>
            ) : (
              /* Template Preview */
              <div className="space-y-6">
                          {/* Task List Preview - Using Planning Phase Sections */}
                          <div className="bg-white border border-[#E0DBD7] rounded-lg">
                            <div className="p-3 md:p-4 border-b border-[#E0DBD7]">
                              <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-2 md:gap-0">
                                <div className="flex items-center gap-2">
                                  <h6 className="font-work text-sm md:text-base">{selectedTemplate.name}</h6>
                                  <BadgeCount count={selectedTemplate.tasks.length} />
                                </div>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {selectedTemplate.estimatedTime}
                                </span>
                              </div>
                              <p className="font-work text-xs text-gray-600">{selectedTemplate.description}</p>
                              {selectedTemplate.id === 'full-wedding-planning' && (
                                <div className="flex items-center gap-2 mt-2">
                                  <CategoryPill category="Recommended after Setting Wedding Date" />
                                  <span className="inline-flex items-center text-[10px] lg:text-xs font-medium rounded-full px-2 lg:px-2 py-0 lg:py-0.5 border bg-purple-100 text-purple-800 border-purple-200">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI-powered
                                  </span>
                                </div>
                              )}
                              
                              {/* AI Deadline Setting Section - Only for Full Wedding Checklist */}
                              {selectedTemplate.id === 'full-wedding-planning' && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                                  <div className="flex items-start gap-2">
                                    <input
                                      type="checkbox"
                                      id="ai-deadlines-header"
                                      checked={allowAIDeadlines}
                                      onChange={(e) => setAllowAIDeadlines(e.target.checked)}
                                      disabled={!hasWeddingDate}
                                      className="mt-1 h-4 w-4 text-paige-purple border-gray-300 rounded focus:ring-paige-purple disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <div className="flex-1">
                                      <label 
                                        htmlFor="ai-deadlines-header" 
                                        className={`text-sm font-medium flex items-center gap-2 ${hasWeddingDate ? 'text-gray-700 cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}
                                      >
                                        <Sparkles className="w-4 h-4 text-purple-600" />
                                        Let Paige AI set deadlines for my to-do items (2 credits)
                                        <div className="relative group">
                                          <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                            Paige will set deadlines based on your wedding date
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                          </div>
                                        </div>
                                      </label>
                                      {!hasWeddingDate && (
                                        <p className="text-xs text-gray-400 mt-1">
                                          Set your wedding date in Settings → Wedding Details to enable this feature
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Tight Timeline Warning Banner */}
                              {showTightDeadlineWarning && selectedTemplate.id === 'full-wedding-planning' && (
                                <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                  <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <h6 className="text-sm font-medium text-amber-800 mb-2">Tight Timeline Warning</h6>
                                      <p className="text-sm text-amber-700 mb-3">
                                        Your wedding is only {weddingDate ? Math.ceil((new Date(weddingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 'a few'} days away, which may cause many to-do items to have deadlines that are really tight/hard to achieve.
                                      </p>
                                      <p className="text-xs text-amber-600 mb-4">
                                        Do you want to continue? If Yes, the list will still be generated with AI-generated deadlines, but some tasks may need to be prioritized or simplified.
                                      </p>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={handleCancelTightDeadline}
                                          className="btn-primaryinverse px-3 py-1.5 text-xs"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={handleContinueAnyway}
                                          className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1 bg-amber-600 hover:bg-amber-700"
                                        >
                                          <CheckCircle className="w-3 h-3" />
                                          Continue Anyway
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="max-h-[20rem] md:max-h-[24rem] overflow-y-auto px-3 md:px-4 py-3 md:py-4">
                              {renderTemplateWithSections(
                                selectedTemplate,
                                openPlanningPhases,
                                togglePlanningPhase,
                                allowAIDeadlines,
                                hasWeddingDate
                              )}
                            </div>
                          </div>
                          
                </div>
              )}
            </div>

            {/* Fixed Footer - Only show when template is selected */}
            {selectedTemplate && (
              <div className="border-t border-[#E0DBD7] p-4 md:p-6 flex-shrink-0">
                <div className="flex flex-col md:flex-row items-center justify-end gap-3 w-full">
                  <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="btn-primaryinverse w-full md:w-auto"
                    >
                      Back to Templates
                    </button>
                    {!showTightDeadlineWarning && (
                      <button
                        onClick={handleConfirmSelection}
                        className={`flex items-center gap-2 w-full md:w-auto ${
                          allowAIDeadlines && hasWeddingDate && selectedTemplate.id === 'full-wedding-planning'
                            ? 'btn-gradient-purple' 
                            : 'btn-primary'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        {allowAIDeadlines && hasWeddingDate && selectedTemplate.id === 'full-wedding-planning' ? 'Use This Template (2 Credits)' : 'Use This Template'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

    </AnimatePresence>
  );
}
