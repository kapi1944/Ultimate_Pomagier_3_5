param([Parameter(Mandatory = $true)][string]$Katalog, [switch]$CzyZrzuty)
$ErrorActionPreference = 'Stop'
$prezentacja = $null
$powerpoint = $null
try {
    $powerpoint = New-Object -ComObject PowerPoint.Application
    $powerpoint.AutomationSecurity = 3
    $powerpoint.DisplayAlerts = 1
    $prezentacja = $powerpoint.Presentations.Open((Join-Path $Katalog 'zrodlo.pptx'), -1, 0, 0)
    $uwagi = [System.Collections.Generic.List[string]]::new()
    foreach ($slajd in $prezentacja.Slides) {
        $slajd.SlideShowTransition.Hidden = 0
        if ($CzyZrzuty) { $slajd.Export((Join-Path $Katalog ("slajd-" + $slajd.SlideIndex + ".png")), 'PNG', 1400, [int](1400 * $prezentacja.PageSetup.SlideHeight / $prezentacja.PageSetup.SlideWidth)) }
        foreach ($obiekt in $slajd.Shapes) {
            if ($obiekt.HasTextFrame -eq -1 -and $obiekt.TextFrame2.HasText -eq -1) {
                $wysokoscTekstu = $obiekt.TextFrame2.TextRange.BoundHeight
                $dostepnaWysokosc = $obiekt.Height - $obiekt.TextFrame2.MarginTop - $obiekt.TextFrame2.MarginBottom
                if ($wysokoscTekstu -gt $dostepnaWysokosc + 2) {
                    $uwagi.Add("Slajd $($slajd.SlideIndex): tekst w obiekcie '$($obiekt.Name)' moze wychodzic poza pole.")
                }
            }
        }
    }
    # Ukryte slajdy ujawniamy tylko w pamieci kopii otwartej do odczytu.
    $prezentacja.SaveAs((Join-Path $Katalog 'wynik.pdf'), 32)
    [IO.File]::WriteAllText((Join-Path $Katalog 'uwagi.json'), (ConvertTo-Json -InputObject @($uwagi) -Compress), [Text.UTF8Encoding]::new($false))
} catch {
    [Console]::Error.WriteLine('Nie udalo sie wyrenderowac PPTX w lokalnym PowerPoint: ' + $_.Exception.Message)
    exit 1
} finally {
    if ($null -ne $prezentacja) { $prezentacja.Saved = -1; $prezentacja.Close(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($prezentacja) }
    if ($null -ne $powerpoint) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($powerpoint) }
}
