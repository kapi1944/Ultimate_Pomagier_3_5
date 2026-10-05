$ErrorActionPreference = 'Stop'
$katalogProjektu = Split-Path -Parent $PSScriptRoot
$katalogStanu = Join-Path $katalogProjektu '.launcher'
$bledy = $null
$tokeny = $null
$drzewo = [Management.Automation.Language.Parser]::ParseFile((Join-Path $katalogProjektu 'launcher/launch.ps1'), [ref]$tokeny, [ref]$bledy)
if ($bledy.Count) { throw ($bledy -join "`n") }
$drzewo.FindAll({ param($wezel) $wezel -is [Management.Automation.Language.FunctionDefinitionAst] }, $false) | ForEach-Object { Invoke-Expression $_.Extent.Text }

function Potwierdz($warunek, $opis) { if (-not $warunek) { throw $opis } }
$script:wywolania = @()
$script:liczniki = '0 0'
$script:zmiany = ''
$script:wybor = 'U'
$script:czyScalono = $false
function Wywolaj-Git([string[]]$argumenty) {
    $tekst = $argumenty -join ' '
    $script:wywolania += $tekst
    switch ($tekst) {
        'rev-parse --show-toplevel' { return $katalogProjektu }
        'status --porcelain --untracked-files=all --ignore-submodules=none' { return $script:zmiany }
        'remote get-url origin' { return 'https://github.com/kapi1944/Ultimate_Pomagier_3_5.git' }
        'rev-parse HEAD' { if ($script:czyScalono) { return 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }; return 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }
        'rev-parse origin/main' { return 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }
        'rev-list --left-right --count HEAD...origin/main' { return $script:liczniki }
        'branch --show-current' { return 'main' }
        'log -5 --format=%h %s HEAD..origin/main' { return 'bbbbbbbb Nowa wersja' }
        default {
            if ($argumenty -contains 'merge') { $script:czyScalono = $true; return 'Fast-forward' }
            throw "Nieoczekiwana operacja Git: $tekst"
        }
    }
}
function Wybierz-Opcje { return $script:wybor }
function Start-Process {
    $proces = [pscustomobject]@{ ExitCode = 0 }
    $proces | Add-Member ScriptMethod WaitForExit { if ($args.Count) { return $true } }
    return $proces
}
$script:zmiany = '?? ważny plik.txt'
Sprawdz-Aktualizacje
Potwierdz ($script:wywolania.Count -eq 2) 'Lokalne zmiany muszą wstrzymać fetch i aktualizację.'
$script:zmiany = ''
foreach ($liczniki in @('0 0', '2 0', '2 3', '0 3')) {
    $script:liczniki = $liczniki
    $script:wywolania = @()
    Sprawdz-Aktualizacje
    Potwierdz ($script:wywolania -contains 'rev-list --left-right --count HEAD...origin/main') 'Test musi dojść do porównania historii Git.'
    Potwierdz (-not ($script:wywolania | Where-Object { $_ -match 'merge|pull' })) 'Nie wolno aktualizować bez decyzji A ani przy rozbieżności.'
}

$katalogTestu = Join-Path ([IO.Path]::GetTempPath()) ("Pomagier test ą (launcher)-" + [guid]::NewGuid())
try {
    $katalogProjektu = $katalogTestu
    $katalogStanu = Join-Path $katalogTestu '.launcher'
    New-Item -ItemType Directory -Path (Join-Path $katalogTestu 'node_modules/.bin'), $katalogStanu | Out-Null
    Set-Content -LiteralPath (Join-Path $katalogTestu 'package-lock.json') -Value '{}'
    foreach ($plik in @('vite.cmd', 'tsc.cmd')) { Set-Content -LiteralPath (Join-Path $katalogTestu "node_modules/.bin/$plik") -Value '' }
    $skrot = Oblicz-SkrotPliku (Join-Path $katalogTestu 'package-lock.json')
    Set-Content -LiteralPath (Join-Path $katalogStanu 'package-lock.sha256') -Value $skrot
    function npm.cmd { throw 'Nie należy ponownie instalować niezmienionych zależności.' }
    Zapewnij-Zaleznosci
    $script:instalacje = 0
    function npm.cmd { $script:instalacje += 1; $global:LASTEXITCODE = 0 }
    Add-Content -LiteralPath (Join-Path $katalogTestu 'package-lock.json') -Value ' '
    Zapewnij-Zaleznosci
    Potwierdz ($script:instalacje -eq 1) 'Zmiana lockfile musi uruchomić npm ci.'
    $zapisanySkrot = Get-Content -LiteralPath (Join-Path $katalogStanu 'package-lock.sha256') -Raw
    function npm.cmd { $global:LASTEXITCODE = 1 }
    Add-Content -LiteralPath (Join-Path $katalogTestu 'package-lock.json') -Value '  '
    $czyBladInstalacji = $false
    try { Zapewnij-Zaleznosci } catch { $czyBladInstalacji = $true }
    Potwierdz $czyBladInstalacji 'Błąd npm ci musi być zgłoszony.'
    Potwierdz ((Get-Content -LiteralPath (Join-Path $katalogStanu 'package-lock.sha256') -Raw) -eq $zapisanySkrot) 'Nieudana instalacja nie może oznaczać zależności jako aktualnych.'
    $script:wybor = 'A'
    $script:wywolania = @()
    Sprawdz-Aktualizacje
    $aktualizacja = @($script:wywolania | Where-Object { $_ -match ' merge ' })
    Potwierdz ($aktualizacja.Count -eq 1 -and $aktualizacja[0] -match 'merge --ff-only --no-autostash --no-overwrite-ignore bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb$') 'Aktualizacja musi użyć sprawdzonego SHA i chronić stash oraz ignorowane pliki.'
    Potwierdz (Test-Path -LiteralPath (Join-Path $katalogStanu 'build-wymagany.txt')) 'Aktualizacja musi pozostawić wymaganie builda przed startem.'
    $script:wywolania = @()
    $script:zmiany = ' M plik.ts'
    Sprawdz-Aktualizacje
    Potwierdz (-not ($script:wywolania | Where-Object { $_ -match 'merge|pull' })) 'Nawet decyzja A nie może aktualizować brudnego repozytorium.'
    Write-Host 'OK: zabezpieczenia Git, składnia PowerShell i pomijanie npm ci.'
} finally {
    # Usuwany jest wyłącznie własny, jawnie sprawdzony katalog testowy.
    $pelnyKatalog = [IO.Path]::GetFullPath($katalogTestu)
    $katalogTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if (-not $pelnyKatalog.StartsWith($katalogTemp) -or (Split-Path -Leaf $pelnyKatalog) -notlike 'Pomagier test ą (launcher)-*') { throw 'Nieprawidłowy katalog testowy.' }
    Remove-Item -LiteralPath $pelnyKatalog -Recurse -Force
}
