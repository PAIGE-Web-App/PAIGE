import React from 'react';
import { Star } from 'lucide-react';
import { getCategoryHexColor } from '../utils/categoryStyle';

interface CategoryPillProps {
    category: string;
}

const CategoryPill: React.FC<CategoryPillProps> = ({ category }) => {
    const color = getCategoryHexColor(category);
    const isRecommendedPill = category.toLowerCase().includes('recommended');
    
    return (
        <span
            className={`inline-flex items-center text-[10px] lg:text-xs font-medium rounded-full px-2 lg:px-2 py-0 lg:py-0.5 border text-white`}
            style={{ backgroundColor: color, borderColor: color }}
        >
            {isRecommendedPill && <Star className="w-3 h-3 mr-1" />}
            {category}
        </span>
    );
};

export default CategoryPill;
