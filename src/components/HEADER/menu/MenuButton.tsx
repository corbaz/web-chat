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
            className="text-base touch-manipulation min-w-[44px] min-h-[44px] p-2 rounded-lg transition-colors duration-200 hover:bg-opacity-20 hover:bg-white flex items-center justify-center"
            onClick={onClick}
            aria-label={ariaLabel}
            style={{ color: theme.title.color }}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
        </button>
    );
};

export default MenuButton;
