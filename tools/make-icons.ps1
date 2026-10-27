# Renders the PNG app icons with System.Drawing (Windows only). Run from the repo root:
#   pwsh tools/make-icons.ps1
# The design matches icons/icon.svg: dark tile, green shield, white tick.
Add-Type -AssemblyName System.Drawing

function New-Icon([int]$size, [string]$path, [double]$inset) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::FromArgb(255, 15, 23, 32))
  $s = $size / 512.0 * (1 - 2 * $inset)
  $o = $size * $inset
  function P([double]$x, [double]$y) { New-Object System.Drawing.PointF ([float]($o + $x * $s)), ([float]($o + $y * $s)) }

  $shield = New-Object System.Drawing.Drawing2D.GraphicsPath
  $shield.AddLine((P 256 84), (P 400 136))
  $shield.AddLine((P 400 136), (P 400 240))
  $shield.AddBezier((P 400 240), (P 400 332), (P 340 404), (P 256 432))
  $shield.AddBezier((P 256 432), (P 172 404), (P 112 332), (P 112 240))
  $shield.AddLine((P 112 240), (P 112 136))
  $shield.CloseFigure()
  $green = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 63, 182, 139)), ([float](28 * $s))
  $green.LineJoin = 'Round'
  $g.DrawPath($green, $shield)

  $white = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 232, 238, 244)), ([float](30 * $s))
  $white.StartCap = 'Round'; $white.EndCap = 'Round'; $white.LineJoin = 'Round'
  $g.DrawLines($white, [System.Drawing.PointF[]]@((P 196 262), (P 238 304), (P 320 214)))

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

$out = Join-Path $PSScriptRoot "..\icons" | Resolve-Path
New-Icon 192 (Join-Path $out "icon-192.png") 0
New-Icon 512 (Join-Path $out "icon-512.png") 0
New-Icon 512 (Join-Path $out "icon-maskable-512.png") 0.1
