import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface VendorHubEmptyStateProps {
  variant: 'main' | 'my-vendors' | 'favorites';
  className?: string;
  imageSize?: 'w-80' | 'w-56';
}

export const VendorHubEmptyState: React.FC<VendorHubEmptyStateProps> = ({
  variant,
  className = '',
  imageSize = 'w-80'
}) => {
  const router = useRouter();
  
  const getContent = () => {
    switch (variant) {
      case 'main':
        return {
          title: 'Welcome to your Vendor Hub',
          description: 'This is where you can discover and build your perfect vendor team. Browse our curated selection of venues, photographers, caterers, and more. Save your favorites, add personal notes for you and your partner, and track vendor details all in one place.',
          buttonText: 'Browse Vendors',
          buttonAction: () => router.push('/vendors/catalog')
        };
      case 'my-vendors':
        return {
          title: '',
          description: 'You don\'t have any official vendors yet!',
          buttonText: 'Browse Vendor Catalog',
          buttonAction: () => router.push('/vendors/catalog')
        };
      case 'favorites':
        return {
          title: '',
          description: 'No Favorites yet!',
          buttonText: 'Browse Vendor Catalog',
          buttonAction: () => router.push('/vendors/catalog')
        };
    }
  };

  const content = getContent();
  
  return (
    <div className={`flex flex-col items-center justify-center w-full ${className}`}>
      {/* Image */}
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <img 
          src="/Vendor Hub bg.png" 
          alt="Vendor Hub Background" 
          className={`${imageSize} h-auto`}
        />
      </motion.div>

      {/* Content */}
      {content.title ? (
        <motion.div 
          className="text-center w-full mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        >
          <h4 className="mb-4">{content.title}</h4>
          <p className="text-base text-[#5A4A42] leading-relaxed max-w-2xl mx-auto">
            {content.description}
          </p>
        </motion.div>
      ) : (
        <motion.div 
          className="text-center w-full mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        >
          <p className="text-base text-[#5A4A42] leading-relaxed max-w-2xl mx-auto">
            {content.description}
          </p>
        </motion.div>
      )}

      {/* Button */}
      <motion.button 
        className="btn-primary text-lg px-8 py-4 hover:scale-105 transition-transform duration-200"
        onClick={content.buttonAction}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {content.buttonText}
      </motion.button>
    </div>
  );
};
