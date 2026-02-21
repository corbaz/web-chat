import { APP_VERSION } from "../../../App.tsx";
import { ColorPalette } from "../../../interfaces/temas/temas.tsx";

export default function PieBrand({
  theme,
  isDarkTheme,
}: {
  theme: ColorPalette;
  isDarkTheme: boolean;
}) {
  return (
    <div
      className="p-4 border-t text-center text-sm"
      style={{
        borderColor: theme.accent, // Color del borde según el tema
        color: isDarkTheme
          ? "rgba(255,255,255,0.5)" // Texto semitransparente en tema oscuro
          : "rgba(0,0,0,0.5)", // Texto semitransparente en tema claro
      }}
    >
      © PROMPTING {APP_VERSION} {"- "}
      {(() => {
        // 1. Creamos un objeto Date con la fecha actual
        const fecha = new Date();
        // 2. Extraemos el día
        const dia = fecha.getDate().toString().padStart(2, "0");
        // 3. Extraemos las primeras 3 letras del mes en mayúsculas
        const mesCorto = fecha
          .toLocaleString("es-AR", { month: "short" })
          .toUpperCase()
          .replace(".", "");
        // 4. Obtenemos el año numérico
        const año = fecha.getFullYear();
        // 5. Devolvemos la cadena formateada
        return `${dia}-${mesCorto}-${año}`;
      })()}
    </div>
  );
}
