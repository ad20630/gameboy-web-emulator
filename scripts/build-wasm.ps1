$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not $env:EMSDK) {
    throw "EMSDK environment variable not set. Run emsdk_env.ps1 from your emsdk install in this shell first (see README.md)."
}

# Prefer a native Windows cmake over an MSYS-flavored one (e.g. devkitPro's
# bundled cmake). MSYS cmake mishandles Windows-style absolute paths passed
# via -DCMAKE_TOOLCHAIN_FILE and doesn't support the MinGW Makefiles
# generator, so if one happens to be first on PATH, configuration fails.
# `pip install cmake` installs a native one under %APPDATA%\Python.
$cmakeExe = "cmake"
$pipCmake = Get-ChildItem -Path "$env:APPDATA\Python" -Filter "cmake.exe" -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1
if ($pipCmake) {
    $cmakeExe = $pipCmake.FullName
}

# MinGW Makefiles needs mingw32-make specifically (not msys2's plain "make").
$makeProgram = $null
$mingwMakeCmd = Get-Command mingw32-make -ErrorAction SilentlyContinue
if ($mingwMakeCmd) {
    $makeProgram = $mingwMakeCmd.Source
} elseif (Test-Path "C:\msys64\mingw64\bin\mingw32-make.exe") {
    $makeProgram = "C:\msys64\mingw64\bin\mingw32-make.exe"
}

$toolchainFile = Join-Path $env:EMSDK "upstream\emscripten\cmake\Modules\Platform\Emscripten.cmake"

$configureArgs = @(
    "-S", "core",
    "-B", "core/build-wasm",
    "-DCMAKE_TOOLCHAIN_FILE=$toolchainFile",
    "-DCMAKE_BUILD_TYPE=Release"
)

if ($makeProgram) {
    $configureArgs += @("-G", "MinGW Makefiles", "-DCMAKE_MAKE_PROGRAM=$makeProgram")
}

& $cmakeExe @configureArgs
& $cmakeExe --build core/build-wasm
