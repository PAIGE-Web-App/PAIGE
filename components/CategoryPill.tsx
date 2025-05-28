import React from 'react';
import { getCategoryStyle } from '../utils/categoryStyle';

interface CategoryPillProps {
    category: string;
}

const CategoryPill: React.FC<CategoryPillProps> = ({ category }) => {
    return (
        <span
            className={`inline-block text-xs font-medium rounded-full px-2 py-0.5 border ${getCategoryStyle(
                category
            )}`}
        >
            {category}
        </span>
    );
};

export default CategoryPill;
