# Build Portable/SFX version of Personal Timesheet Assistant
# This script bundles the app with a portable Python environment

$ErrorActionPreference = "Stop"

Write-Host "=============================================="
Write-Host "  Building Portable PTA Installation Package"
Write-Host "=============================================="

$distDir = "dist\PortablePTA"

# Clean up previous build
if (Test-Path "dist") {
    Write-Host "Cleaning previous build..."
    Remove-Item -Recurse -Force "dist"
}
New-Item -ItemType Directory -Force -Path $distDir | Out-Null

Write-Host "1. Copying App Files..."
$appDir = "$distDir\App"
New-Item -ItemType Directory -Force -Path $appDir | Out-Null

Copy-Item "backend" -Destination "$appDir\backend" -Recurse
Copy-Item "frontend" -Destination "$appDir\frontend" -Recurse
Copy-Item "requirements.txt" -Destination $appDir
Copy-Item "migrate_database.py" -Destination $appDir
Copy-Item "README.md" -Destination $appDir

Write-Host "2. Downloading Python 3.11 Embeddable..."
$pythonZip = "dist\python-embed.zip"
Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.11.8/python-3.11.8-embed-amd64.zip" -OutFile $pythonZip
Expand-Archive -Path $pythonZip -DestinationPath "$distDir\Python" -Force
Remove-Item $pythonZip -Force

Write-Host "3. Configuring Portable Python..."
# Enable pip in embeddable by uncommenting 'import site'
$pthFile = "$distDir\Python\python311._pth"
(Get-Content $pthFile) -replace '#import site', 'import site' | Set-Content $pthFile

Write-Host "4. Downloading and Installing PIP..."
$getPip = "dist\get-pip.py"
Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile $getPip
Start-Process -FilePath "$distDir\Python\python.exe" -ArgumentList "dist\get-pip.py" -Wait -NoNewWindow
Remove-Item $getPip -Force

Write-Host "5. Installing App Dependencies natively into portable Python..."
Start-Process -FilePath "$distDir\Python\Scripts\pip.exe" -ArgumentList "install -r App\requirements.txt" -Wait -NoNewWindow -WorkingDirectory $distDir

Write-Host "6. Creating launch script..."
Copy-Item "launch_portable.bat" -Destination "$distDir\launch_portable.bat"

Write-Host "7. Compressing to SFX with 7-Zip..."
$7zPath = "C:\Program Files\7-Zip\7z.exe"
if (Test-Path $7zPath) {
    # Create the SFX Archive
    $sfxName = "dist\PTA_Portable_Setup.exe"
    Start-Process -FilePath $7zPath -ArgumentList "a -sfx7z.sfx $sfxName .\$distDir\*" -Wait -NoNewWindow
    Write-Host ""
    Write-Host "=============================================="
    Write-Host "SUCCESS! Your SFX package is ready at:"
    Write-Host (Resolve-Path $sfxName).Path
    Write-Host "=============================================="
} else {
    Write-Host "WARN: 7-Zip not found at $7zPath"
    Write-Host "The portable folder is ready at: dist\PortablePTA"
    Write-Host "You can manually zip it or create an SFX using your archiver of choice."
}
