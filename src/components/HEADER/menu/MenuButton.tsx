import React from "react";
import { ColorPalette } from "../../../interfaces/temas/temas";

interface MenuButtonProps {
  onClick: () => void;
  ariaLabel: string;
  theme: ColorPalette;
}

const MenuButton: React.FC<MenuButtonProps> = ({
  onClick,
  ariaLabel,
  theme,
}) => {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="p-2.5 rounded-lg hover:opacity-60 transition-opacity duration-150"
      style={{
        backgroundColor: theme.button.background,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
        style={{
          color: theme.title.color,
        }}
      >
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    </button>
  );
};

export default MenuButton;
