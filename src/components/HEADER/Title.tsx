import React from "react";
import { ColorPalette } from "../../interfaces/temas/temas";

interface TitleProps {
    title: string;
    version: string;
    theme: ColorPalette;
}

const Title: React.FC<TitleProps> = ({ title, version, theme }) => {
    return (
        <div className="flex items-end">
            <h1
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-center"
                style={{ color: theme.title.color }}
            >
                {title}
            </h1>
            <span
                className="text-sm ml-2 mb-1"
                style={{ color: theme.title.color }}
            >
                {version}
            </span>
        </div>
    );
};

export default Title;
