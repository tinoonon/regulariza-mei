@echo off
echo =============================================
echo  REGULARIZA MEI — Servidor local
echo =============================================
echo.
echo Iniciando servidor HTTP na porta 8080...
echo Acesse: http://localhost:8080
echo.
echo Pressione Ctrl+C para encerrar.
echo.

:: Tenta Python 3 primeiro
python -m http.server 8080 2>nul
if %errorlevel% neq 0 (
  :: Tenta Python 2
  python -m SimpleHTTPServer 8080 2>nul
  if %errorlevel% neq 0 (
    echo ERRO: Python nao encontrado.
    echo.
    echo Instale Python em https://www.python.org/downloads/
    echo Ou use a extensao "Live Server" no VS Code.
    pause
  )
)
