@echo off
cd /d "%~dp0"

echo Iniciando servidor local em http://localhost:8080 ...
start "Servidor local - Curriculo (feche esta janela para parar)" cmd /c "python -m http.server 8080 --directory public"

timeout /t 2 /nobreak >nul
start "" http://localhost:8080/

echo.
echo O site esta rodando em http://localhost:8080
echo Para parar, feche a janela "Servidor local - Curriculo".
pause >nul
