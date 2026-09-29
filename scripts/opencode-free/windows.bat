@echo off
rem Instalador de OpenCode Free para Windows (sin Bun ni el repo).
rem
rem   windows.bat                 instala (o reinstala) y deja el servidor corriendo
rem   windows.bat password        copia la contrasena al portapapeles
rem   windows.bat password CLAVE  cambia la contrasena y reinicia el servidor
rem   windows.bat uninstall       quita el arranque automatico y detiene el servidor
rem
rem Usa la misma carpeta y los mismos archivos que "bun run opencode:free:install".
setlocal

set "PORT=4096"
rem Rutas completas: un powershell.cmd u otro atajo en el PATH puede tomar el
rem control del .bat y cortarlo (visto 2026-09-27).
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "DIR=%LOCALAPPDATA%\prompting\opencode-free"
set "PWFILE=%DIR%\password.txt"
set "VBS=%DIR%\launch.vbs"
set "STARTUP_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\PromptingOpenCodeFree.vbs"

if /i "%~1"=="uninstall" goto :uninstall
if /i "%~1"=="password" goto :password
if "%~1"=="" goto :install
echo Uso: windows.bat [install ^| password [CLAVE] ^| uninstall]
exit /b 1

:install
where.exe opencode >nul 2>nul
if errorlevel 1 (
  echo OpenCode no esta instalado. Instalalo desde https://opencode.ai
  echo Abrilo una vez, manda un mensaje con un modelo gratis y volve a correr este archivo.
  exit /b 1
)
if not exist "%DIR%\config-home" mkdir "%DIR%\config-home"
call :write_config
if not exist "%PWFILE%" call :generate_password
set /p PW=<"%PWFILE%"
%PS% -NoProfile -Command "if ('%PW%' -cmatch '^[A-Za-z0-9._*@#+=?-]{6,}$') { exit 0 } else { exit 1 }" >nul 2>nul
if errorlevel 1 (
  echo La contrasena guardada tiene caracteres no permitidos.
  echo Elegi otra con: windows.bat password NUEVA_CLAVE
  exit /b 1
)
call :write_launcher
copy /y "%VBS%" "%STARTUP_VBS%" >nul
call :stop_server
start "" "%SystemRoot%\System32\wscript.exe" "%VBS%"
call :wait_health
if errorlevel 1 (
  echo El servidor no respondio en http://127.0.0.1:%PORT%.
  echo Proba correr a mano desde "%DIR%": opencode serve --port %PORT%
  exit /b 1
)
echo.
echo OpenCode Free instalado y corriendo (arranca solo al iniciar sesion).
echo Servidor: http://127.0.0.1:%PORT%
call :copy_password
echo En la app: elegi OpenCode Free, pega la contrasena y toca Guardar contrasena.
exit /b 0

:password
if "%~2"=="" goto :password_copy
%PS% -NoProfile -Command "if ('%~2' -cmatch '^[A-Za-z0-9._*@#+=?-]{6,}$') { exit 0 } else { exit 1 }" >nul 2>nul
if errorlevel 1 (
  echo La contrasena debe tener al menos 6 caracteres: letras, numeros o . _ - * @ # + = ?
  exit /b 1
)
if not exist "%DIR%" mkdir "%DIR%"
<nul set /p "=%~2" > "%PWFILE%"
goto :install

:password_copy
if not exist "%PWFILE%" (
  echo Todavia no hay contrasena. Corre primero: windows.bat
  exit /b 1
)
set /p PW=<"%PWFILE%"
call :copy_password
exit /b 0

:uninstall
if exist "%STARTUP_VBS%" del /q "%STARTUP_VBS%"
call :stop_server
echo OpenCode Free quitado: ya no arranca al iniciar sesion y el servidor se detuvo.
echo La carpeta "%DIR%" se conserva.
exit /b 0

rem ---------------------------------------------------------------------------

:write_config
> "%DIR%\opencode.json" (
  echo {
  echo   "$schema": "https://opencode.ai/config.json",
  echo   "default_agent": "chat",
  echo   "agent": {
  echo     "chat": {
  echo       "mode": "primary",
  echo       "description": "Asistente de chat general",
  echo       "prompt": "Sos un asistente de chat general dentro de una app web. Responde directamente con tu conocimiento, en el idioma del usuario. No ejecutes comandos, no leas ni edites archivos y no uses herramientas: el usuario no esta programando en esta maquina. Si algo requiere informacion que no tenes, decilo. Si el usuario pide un mapa, una ubicacion o una direccion, inclui un link de Google Maps en markdown con esa direccion en la busqueda: la app lo muestra como mapa dentro del chat. No podes generar imagenes ni capturas de pantalla; si tenes la URL directa de una imagen publica real, mostrala como imagen markdown. Nunca inventes URLs de imagenes.",
  echo       "permission": { "bash": "ask", "edit": "ask", "webfetch": "ask", "external_directory": "ask" }
  echo     }
  echo   },
  echo   "permission": { "bash": "ask", "edit": "ask", "webfetch": "ask", "external_directory": "ask" }
  echo }
)
exit /b 0

:generate_password
for /f %%i in ('%PS% -NoProfile -Command "[guid]::NewGuid().ToString('N')"') do <nul set /p "=%%i" > "%PWFILE%"
exit /b 0

:write_launcher
> "%VBS%" (
  echo Dim shell
  echo Set shell = CreateObject^("WScript.Shell"^)
  echo shell.CurrentDirectory = "%DIR%"
  echo shell.Environment^("Process"^)^("OPENCODE_SERVER_PASSWORD"^) = "%PW%"
  echo shell.Environment^("Process"^)^("XDG_CONFIG_HOME"^) = "%DIR%\config-home"
  echo shell.Run "opencode serve --port %PORT% --hostname 127.0.0.1 --cors https://localhost:5173 --cors https://prompting-chat.vercel.app", 0, False
)
exit /b 0

:stop_server
for /f "tokens=5" %%p in ('netstat.exe -ano -p tcp ^| findstr.exe /r /c:"127.0.0.1:%PORT% .*LISTENING"') do (
  tasklist.exe /fi "PID eq %%p" /fo csv /nh | findstr.exe /i "opencode" >nul && taskkill.exe /pid %%p /f >nul
)
exit /b 0

:wait_health
%PS% -NoProfile -Command "$p = (Get-Content -Raw '%PWFILE%').Trim(); $h = @{ Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes('opencode:' + $p)) }; for ($i = 0; $i -lt 30; $i++) { try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:%PORT%/global/health' -Headers $h; if ($r.healthy) { exit 0 } } catch {}; Start-Sleep -Seconds 1 }; exit 1"
exit /b %errorlevel%

:copy_password
<nul set /p "=%PW%" | clip.exe
echo Contrasena copiada al portapapeles. Pegala en la app con Ctrl+V.
exit /b 0
