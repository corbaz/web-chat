import React from "react";
import { ColorPalette } from "../../../interfaces/temas/temas";

interface MenuButtonProps {
  onClick: () => void;
  ariaLabel: string;
  theme: ColorPalette;
}

const MenuButton: React.FC<MenuButtonProps> = ({ onClick, ariaLabel, theme }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="nm-press p-2.5 rounded-xl flex items-center justify-center"
      style={{
        backgroundColor: theme.background,
        boxShadow: theme.shadow.outer,
        color: theme.text,
        minWidth: "44px",
        minHeight: "44px",
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
        className="w-5 h-5"
        style={{ color: theme.title.color }}
      >
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6"  x2="21" y2="6"  />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
};

export default MenuButton;
