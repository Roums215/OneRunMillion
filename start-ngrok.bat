@echo off
echo ===================================================
echo   OneRun - Lancement du tunnel ngrok
echo ===================================================
echo.
echo Cette commande va créer un tunnel sécurisé vers
echo votre backend local sur le port 8080
echo.
echo Le lien HTTPS généré devra être utilisé dans 
echo le fichier config.js du frontend
echo ===================================================
echo.

:: Vérifier si ngrok est dans le PATH ou utiliser le chemin par défaut
WHERE ngrok >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo ngrok n'est pas dans votre PATH.
    echo Essai avec le chemin par défaut...
    IF EXIST "C:\ngrok\ngrok.exe" (
        "C:\ngrok\ngrok.exe" http 8080
    ) ELSE (
        echo.
        echo ngrok n'a pas été trouvé. Veuillez spécifier le chemin complet:
        echo.
        SET /P NGROK_PATH="Chemin vers ngrok.exe: "
        "%NGROK_PATH%" http 8080
    )
) ELSE (
    ngrok http 8080
)

pause
