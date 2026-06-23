import React from 'react';
import { icons } from 'lucide-react';

export interface AssetCategory {
  id: number;
  asset_type: 'DIGITAL' | 'PHYSICAL';
  category_code: string;
  display_name: string;
  icon: string;
  description: string;
  requires_escrow: boolean;
}

interface CategorySelectorProps {
  categories: AssetCategory[];
  selectedCategoryCode: string;
  onSelect: (category: AssetCategory) => void;
}

const toPascalCase = (str: string) =>
  str.replace(/(^\w|-\w)/g, (clearAndUpper) => clearAndUpper.replace(/-/, '').toUpperCase());

const DynamicIcon = ({ name, size = 20, className = '' }: { name: string; size?: number; className?: string }) => {
  const iconName = toPascalCase(name);
  const Icon = (icons as any)[iconName];
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
};

const CategorySelector: React.FC<CategorySelectorProps> = ({ categories, selectedCategoryCode, onSelect }) => {
  const digitalCategories = categories.filter((c) => c.asset_type === 'DIGITAL');
  const physicalCategories = categories.filter((c) => c.asset_type === 'PHYSICAL');

  return (
    <div className="category-selector">
      <div className="category-group">
        <h4>Tài sản Số (Digital) - Không yêu cầu Escrow</h4>
        <div className="category-grid">
          {digitalCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`category-item ${selectedCategoryCode === cat.category_code ? 'selected' : ''}`}
              onClick={() => onSelect(cat)}
            >
              <DynamicIcon name={cat.icon} />
              <span>{cat.display_name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="category-group mt-4">
        <h4>Tài sản Vật lý (Physical) - Yêu cầu Escrow</h4>
        <div className="category-grid">
          {physicalCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`category-item ${selectedCategoryCode === cat.category_code ? 'selected' : ''}`}
              onClick={() => onSelect(cat)}
            >
              <DynamicIcon name={cat.icon} />
              <span>{cat.display_name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategorySelector;
