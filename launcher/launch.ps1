# UTF-8 z BOM zapewnia polskie komunikaty także w Windows PowerShell 5.1.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$OutputEncoding = [Console]::OutputEncoding
$katalogProjektu = Split-Path -Parent $PSScriptRoot
$katalogStanu = Join-Path $katalogProjektu '.launcher'
$skryptStanu = Join-Path $PSScriptRoot 'sprawdzStan.mjs'
$blokada = $null
$czyPosiadamBlokade = $false
$poprzedniSha = $null
$czyAktualizowano = $false

function Wybierz-Opcje([string]$komunikat, [string[]]$dozwolone) {
    do { $wybor = (Read-Host $komunikat).Trim().ToUpperInvariant() } while ($dozwolone -notcontains $wybor)
    return $wybor
}

function Wywolaj-Git([string[]]$argumenty) {
    $preferencja = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $wynik = & git @argumenty 2>&1
        $kod = $LASTEXITCODE
        if ($kod -ne 0) { throw "Git ($($argumenty -join ' ')): $wynik" }
        return ($wynik -join "`n").Trim()
    } finally { $ErrorActionPreference = $preferencja }
}

function Pobierz-StanSerwera {
    $wynik = & node $skryptStanu serwer
    if ($LASTEXITCODE -ne 0) { throw 'Nie udało się odczytać konfiguracji Vite.' }
    return $wynik | ConvertFrom-Json
}

function Oblicz-SkrotPliku([string]$sciezka) {
    $algorytm = [Security.Cryptography.SHA256]::Create()
    $strumien = [IO.File]::OpenRead($sciezka)
    try { return [BitConverter]::ToString($algorytm.ComputeHash($strumien)).Replace('-', '') }
    finally { $strumien.Dispose(); $algorytm.Dispose() }
}

function Zapewnij-Zaleznosci {
    $plikLock = Join-Path $katalogProjektu 'package-lock.json'
    if (-not (Test-Path -LiteralPath $plikLock)) { throw 'Brak package-lock.json. Nie można bezpiecznie wykonać npm ci.' }
    $skrot = Oblicz-SkrotPliku $plikLock
    $plikSkrotu = Join-Path $katalogStanu 'package-lock.sha256'
    $zapisanySkrot = if (Test-Path -LiteralPath $plikSkrotu) { (Get-Content -LiteralPath $plikSkrotu -Raw).Trim() } else { '' }
    $czyZaleznosci = (Test-Path -LiteralPath (Join-Path $katalogProjektu 'node_modules/.bin/vite.cmd')) -and (Test-Path -LiteralPath (Join-Path $katalogProjektu 'node_modules/.bin/tsc.cmd'))
    if (-not $czyZaleznosci -or $skrot -ne $zapisanySkrot) {
        Write-Host '[NPM] Instalowanie zależności z package-lock.json (npm ci)...'
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci nie powiodło się. Sprawdź połączenie i komunikaty npm; kod oraz dane aplikacji pozostają zachowane.' }
        Set-Content -LiteralPath $plikSkrotu -Value $skrot -Encoding ASCII
    } else { Write-Host '[OK] Zależności są dostępne.' }
}

function Sprawdz-Aktualizacje {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Write-Host '[GIT] Brak Git — uruchamiam lokalną wersję.'; return }
    try {
        $korzenGit = Wywolaj-Git @('rev-parse', '--show-toplevel')
        if ([IO.Path]::GetFullPath($korzenGit).TrimEnd('\', '/') -ne $katalogProjektu.TrimEnd('\', '/')) { throw 'Katalog projektu nie jest korzeniem repozytorium.' }
        $zmiany = Wywolaj-Git @('status', '--porcelain', '--untracked-files=all', '--ignore-submodules=none')
        if ($zmiany) {
            Write-Host 'Wykryto lokalne zmiany w repozytorium. Automatyczna aktualizacja została wstrzymana, aby ich nie nadpisać.'
            do {
                $wybor = Wybierz-Opcje '[U] Uruchom lokalną wersję  [I] Informacje o zmianach  [Z] Zakończ' @('U', 'I', 'Z')
                if ($wybor -eq 'I') { Write-Host $zmiany }
            } while ($wybor -eq 'I')
            if ($wybor -eq 'Z') { exit 0 }
            return
        }
        $zdalny = Wywolaj-Git @('remote', 'get-url', 'origin')
        if ($zdalny -notmatch '^(https://github\.com/kapi1944/Ultimate_Pomagier_3_5(?:\.git)?/?|git@github\.com:kapi1944/Ultimate_Pomagier_3_5(?:\.git)?|ssh://git@github\.com/kapi1944/Ultimate_Pomagier_3_5(?:\.git)?)$') { throw 'origin nie wskazuje repozytorium kapi1944/Ultimate_Pomagier_3_5.' }
        $staryPrompt = $env:GIT_TERMINAL_PROMPT
        $starySsh = $env:GIT_SSH_COMMAND
        try {
            $env:GIT_TERMINAL_PROMPT = '0'
            $env:GIT_SSH_COMMAND = 'ssh -o BatchMode=yes -o ConnectTimeout=10'
            $proces = Start-Process -FilePath (Get-Command git).Source -ArgumentList @('-c', 'credential.interactive=false', 'fetch', 'origin', 'main') -WorkingDirectory $katalogProjektu -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $katalogStanu 'fetch.log') -RedirectStandardError (Join-Path $katalogStanu 'fetch-blad.log')
            if (-not $proces.WaitForExit(20000)) { $proces.Kill(); throw 'Upłynął czas sprawdzania GitHub.' }
            $proces.WaitForExit()
            if ($proces.ExitCode -ne 0) { throw 'GitHub jest niedostępny lub fetch nie powiódł się (szczegóły: .launcher/fetch-blad.log).' }
        } finally { $env:GIT_TERMINAL_PROMPT = $staryPrompt; $env:GIT_SSH_COMMAND = $starySsh }
        $obecny = Wywolaj-Git @('rev-parse', 'HEAD')
        $najnowszy = Wywolaj-Git @('rev-parse', 'origin/main')
        $liczniki = (Wywolaj-Git @('rev-list', '--left-right', '--count', 'HEAD...origin/main')) -split '\s+'
        $lokalne = [int]$liczniki[0]; $nowe = [int]$liczniki[1]
        Write-Host "[GIT] Lokalna wersja: $($obecny.Substring(0, 8)); origin/main: $($najnowszy.Substring(0, 8))."
        if ($lokalne -gt 0) {
            if ($nowe -gt 0) { Write-Host '[GIT] Historie się rozeszły. Aktualizacja wstrzymana.' }
            else { Write-Host "[GIT] Lokalna wersja ma $lokalne własnych commitów. Aktualizacja wstrzymana." }
            return
        }
        if ($nowe -eq 0) { Write-Host '[OK] Lokalna wersja jest zgodna z origin/main.'; return }
        if ((Wywolaj-Git @('branch', '--show-current')) -ne 'main') { Write-Host '[GIT] Aktualizacja tylko na gałęzi main. Uruchamiam lokalną wersję.'; return }
        Write-Host "Dostępna jest nowsza wersja Ultimate Pomagiera ($nowe nowych commitów)."
        Write-Host (Wywolaj-Git @('log', '-5', '--format=%h %s', 'HEAD..origin/main'))
        $wybor = Wybierz-Opcje '[A] Aktualizuj i uruchom  [U] Uruchom obecną wersję  [Z] Zakończ' @('A', 'U', 'Z')
        if ($wybor -eq 'Z') { exit 0 }
        if ($wybor -ne 'A') { return }
        # Ponowna kontrola chroni zmiany wykonane podczas oczekiwania na decyzję.
        if ((Wywolaj-Git @('status', '--porcelain', '--untracked-files=all', '--ignore-submodules=none')) -or (Wywolaj-Git @('rev-parse', 'HEAD')) -ne $obecny -or (Wywolaj-Git @('rev-parse', 'origin/main')) -ne $najnowszy -or (Wywolaj-Git @('branch', '--show-current')) -ne 'main') { throw 'Stan repozytorium zmienił się. Aktualizacja wstrzymana.' }
        $script:poprzedniSha = $obecny
        $katalogHookow = Join-Path $katalogStanu 'bez-hookow'
        New-Item -ItemType Directory -Path $katalogHookow -Force | Out-Null
        Set-Content -LiteralPath (Join-Path $katalogStanu 'build-wymagany.txt') -Value $obecny -Encoding ASCII
        Write-Host (Wywolaj-Git @('-c', "core.hooksPath=$katalogHookow", 'merge', '--ff-only', '--no-autostash', '--no-overwrite-ignore', $najnowszy))
        if ((Wywolaj-Git @('rev-parse', 'HEAD')) -ne $najnowszy) { throw 'HEAD po aktualizacji nie odpowiada sprawdzonej wersji. Wymagany preflight pozostaje aktywny.' }
        $script:czyAktualizowano = $true
        Set-Content -LiteralPath (Join-Path $katalogStanu 'poprzedni-HEAD.txt') -Value $obecny -Encoding ASCII
    } catch {
        Write-Host "[GIT] $($_.Exception.Message)"
        if ((Wybierz-Opcje '[U] Uruchom aktualną lokalną wersję  [Z] Zakończ' @('U', 'Z')) -eq 'Z') { exit 0 }
    }
}

Push-Location -LiteralPath $katalogProjektu
try {
    Write-Host "============================================`n       ULTIMATE POMAGIER — LAUNCHER`n============================================"
    Write-Host '[1/5] Sprawdzanie środowiska...'
    if (-not (Test-Path -LiteralPath (Join-Path $katalogProjektu 'package.json'))) { throw 'Nieprawidłowy katalog projektu: brak package.json.' }
    foreach ($polecenie in @('node', 'npm.cmd')) {
        if (-not (Get-Command $polecenie -ErrorAction SilentlyContinue)) { throw "Nie znaleziono $polecenie. Zainstaluj Node.js albo sprawdź konfigurację PATH." }
        & $polecenie --version
        if ($LASTEXITCODE -ne 0) { throw "Nie można uruchomić $polecenie." }
    }
    $algorytm = [Security.Cryptography.SHA256]::Create()
    try { $skrotKatalogu = [BitConverter]::ToString($algorytm.ComputeHash([Text.Encoding]::UTF8.GetBytes($katalogProjektu.ToLowerInvariant()))).Replace('-', '') } finally { $algorytm.Dispose() }
    $blokada = New-Object Threading.Mutex($false, "Local\UltimatePomagier-$skrotKatalogu")
    try { $czyPosiadamBlokade = $blokada.WaitOne(0) } catch [Threading.AbandonedMutexException] { $czyPosiadamBlokade = $true }
    if (-not $czyPosiadamBlokade) {
        $stan = Pobierz-StanSerwera
        if ($stan.dziala) { Start-Process $stan.adres; Write-Host '[OK] Otwarto działającą aplikację.' }
        else { Write-Host '[INFO] Inny launcher już pracuje. Poczekaj na zakończenie jego uruchamiania.' }
        exit 0
    }
    New-Item -ItemType Directory -Path $katalogStanu -Force | Out-Null
    if (Test-Path -LiteralPath (Join-Path $katalogProjektu 'node_modules/vite')) {
        $stan = Pobierz-StanSerwera
        if ($stan.dziala) { Start-Process $stan.adres; Write-Host '[OK] Otwarto działającą aplikację; aktualizacja wymaga zatrzymania serwera.'; exit 0 }
    }
    Write-Host '[2/5] Sprawdzanie danych...'
    $dane = & node $skryptStanu dane
    if ($LASTEXITCODE -ne 0) { Write-Host '[DANE] Kontrola niedostępna. Sprawdź dane w aplikacji.' }
    else { ($dane | ConvertFrom-Json).warnings | ForEach-Object { Write-Host "[DANE] $_" } }
    Write-Host '[3/5] Sprawdzanie aktualizacji...'
    Sprawdz-Aktualizacje
    Write-Host '[4/5] Sprawdzanie zależności...'
    Zapewnij-Zaleznosci
    $plikPreflightu = Join-Path $katalogStanu 'build-wymagany.txt'
    if ($czyAktualizowano -or (Test-Path -LiteralPath $plikPreflightu)) {
        if (-not $poprzedniSha) { $poprzedniSha = (Get-Content -LiteralPath $plikPreflightu -Raw).Trim() }
        Write-Host '[BUILD] Sprawdzanie zaktualizowanej aplikacji...'
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw 'Build po aktualizacji nie powiódł się. Serwer nie zostanie uruchomiony.' }
        Remove-Item -LiteralPath $plikPreflightu
    }
    $stan = Pobierz-StanSerwera
    if ($stan.dziala) { Start-Process $stan.adres; exit 0 }
    Write-Host '[5/5] Uruchamianie Ultimate Pomagiera...'
    Write-Host "Adres: $($stan.adres). Pozostaw to okno otwarte. Ctrl+C zatrzymuje serwer."
    $czyOtwarto = $false
    # Vite czyta istniejącą konfigurację. strictPort chroni origin localStorage.
    $ErrorActionPreference = 'Continue'
    & npm.cmd run dev -- --strictPort --host localhost 2>&1 | ForEach-Object {
        Write-Host $_
        if (-not $czyOtwarto -and "$_" -match 'https?://localhost:\d+') {
            $gotowy = Pobierz-StanSerwera
            if ($gotowy.dziala) { Start-Process $gotowy.adres; $czyOtwarto = $true }
        }
    }
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -ne 0) { throw 'Serwer zakończył się błędem. Port może być zajęty przez inny program; launcher nie zmienia portu ani nie zabija procesów Node.' }
} catch {
    Write-Host "[BŁĄD] $($_.Exception.Message)" -ForegroundColor Red
    if ($poprzedniSha) {
        Write-Host "Poprzedni HEAD: $poprzedniSha (również .launcher/poprzedni-HEAD.txt)."
        Write-Host "Bezpieczny ręczny powrót: po zatrzymaniu serwera utwórz osobny katalog poleceniem git worktree add --detach ../Pomagier-poprzedni $poprzedniSha i uruchom tam npm ci oraz npm run dev. Nie nadpisuje to bieżących plików."
    }
    Read-Host 'Naciśnij Enter, aby zakończyć' | Out-Null
    exit 1
} finally {
    if ($czyPosiadamBlokade) { $blokada.ReleaseMutex() }
    if ($blokada) { $blokada.Dispose() }
    Pop-Location
}
