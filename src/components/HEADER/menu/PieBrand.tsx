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
        // 2. Extraemos el nombre del mes en español
        const mes = fecha.toLocaleString("es-AR", {
          month: "long",
        });
        // 3. Capitalizamos sólo la primera letra y dejamos el resto en minúsculas
        const mesCapitalizado =
          mes.charAt(0).toUpperCase() + mes.slice(1).toLowerCase();
        // 4. Obtenemos el año numérico
        const año = fecha.getFullYear();
        // 5. Devolvemos la cadena formateada
        return `${mesCapitalizado} ${año}`;
      })()}
    </div>
  );
}
