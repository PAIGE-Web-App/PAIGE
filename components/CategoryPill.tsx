import React from 'react';
import { getCategoryHexColor } from '../utils/categoryStyle';

interface CategoryPillProps {
    category: string;
}

const CategoryPill: React.FC<CategoryPillProps> = ({ category }) => {
    const color = getCategoryHexColor(category);
    return (
        <span
            className={`inline-block text-[10px] lg:text-xs font-medium rounded-full px-2 lg:px-2 py-0.5 lg:py-0.5 py-[2px] border text-white`}
            style={{ backgroundColor: color, borderColor: color }}
        >
            {category}
        </span>
    );
};

export default CategoryPill;
