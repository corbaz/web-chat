import React, { useState } from "react";
import { ColorPalette } from "../../../interfaces/temas/temas";
import {
    createTitleEditHandlers,
    TITLE_LIMITS,
} from "../../../utils/titleUtils";

interface TitleProps {
    title: string;
    version: string;
    theme: ColorPalette;
    chatId?: string;
    onUpdateChatTitle?: (chatId: string, newTitle: string) => void;
    editable?: boolean;
}

const Title: React.FC<TitleProps> = ({
    title,
    version,
    theme,
    chatId,
    onUpdateChatTitle,
    editable = false,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(title);

    const { handleEditKeyDown, truncateTitle } = createTitleEditHandlers({
        maxLength: TITLE_LIMITS.TOOLBAR,
        onUpdateTitle: (id, newTitle) => {
            if (onUpdateChatTitle && id) {
                onUpdateChatTitle(id, newTitle);
            }
        },
    });

    const handleEditClick = () => {
        if (editable && chatId) {
            setIsEditing(true);
            setEditValue(title);
        }
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditValue(e.target.value);
    };

    const handleEditBlur = () => {
        if (isEditing && editValue.trim() && chatId && onUpdateChatTitle) {
            onUpdateChatTitle(chatId, editValue);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (chatId) {
            handleEditKeyDown(e, chatId, editValue, () => {
                setIsEditing(false);
                if (e.key === "Escape") {
                    setEditValue(title);
                }
            });
        }
    };

    return (
        <div className="flex items-end">
            {isEditing ? (
                <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChange}
                    onBlur={handleEditBlur}
                    onKeyDown={handleKeyDown}
                    className="text-2xl sm:text-3xl md:text-4xl font-bold bg-transparent border-b-2 text-center outline-none"
                    style={{
                        color: theme.title.color,
                        borderColor: theme.title.color,
                        width: `${Math.max(editValue.length * 0.8, 10)}ch`,
                    }}
                    autoFocus
                    maxLength={100} // Permitir ingresar hasta 100 caracteres
                />
            ) : (
                <h1
                    className={`text-2xl sm:text-3xl md:text-4xl font-bold text-center ${
                        editable && chatId
                            ? "cursor-pointer hover:opacity-80"
                            : ""
                    }`}
                    style={{ color: theme.title.color }}
                    onClick={handleEditClick}
                    title={
                        editable ? "Haz clic para editar el título" : undefined
                    }
                >
                    {truncateTitle(title, TITLE_LIMITS.TOOLBAR)}
                </h1>
            )}
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
