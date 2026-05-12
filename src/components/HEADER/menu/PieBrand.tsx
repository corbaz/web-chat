import { useState } from "react";
import { APP_VERSION } from "../../../App.tsx";
import { ColorPalette } from "../../../interfaces/temas/temas.tsx";

function formatToday() {
  const fecha = new Date();
  const dia = fecha.getDate().toString().padStart(2, "0");
  const mesCorto = fecha
    .toLocaleString("es-AR", { month: "short" })
    .toUpperCase()
    .replace(".", "");
  const año = fecha.getFullYear();
  return `${dia}-${mesCorto}-${año}`;
}

export default function PieBrand({
  theme,
  isDarkTheme,
}: {
  theme: ColorPalette;
  isDarkTheme: boolean;
}) {
  const [today] = useState(formatToday);

  return (
    <div
      className="p-4 border-t text-center text-sm"
      style={{
        borderColor: theme.accent,
        color: isDarkTheme ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
      }}
    >
      © PROMPTING {APP_VERSION} {"- "}
      {today}
    </div>
  );
}
