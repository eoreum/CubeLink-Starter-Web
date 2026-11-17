$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
$build=Join-Path $root 'build'
New-Item -ItemType Directory -Path $build -Force | Out-Null
$bitmap=[Drawing.Bitmap]::new(256,256)
$g=[Drawing.Graphics]::FromImage($bitmap)
$g.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([Drawing.Color]::FromArgb(19,119,124))
$white=[Drawing.Pen]::new([Drawing.Color]::White,12)
$vertices=[Drawing.Point[]]@([Drawing.Point]::new(128,38),[Drawing.Point]::new(210,84),[Drawing.Point]::new(210,174),[Drawing.Point]::new(128,220),[Drawing.Point]::new(46,174),[Drawing.Point]::new(46,84))
$g.DrawPolygon($white,$vertices)
$g.DrawLine($white,46,84,128,132);$g.DrawLine($white,128,132,210,84);$g.DrawLine($white,128,132,128,220)
$imageStream=[IO.MemoryStream]::new();$bitmap.Save($imageStream,[Drawing.Imaging.ImageFormat]::Png);$bytes=$imageStream.ToArray()
$iconStream=[IO.File]::Create((Join-Path $build 'icon.ico'));$writer=[IO.BinaryWriter]::new($iconStream)
$writer.Write([uint16]0);$writer.Write([uint16]1);$writer.Write([uint16]1)
$writer.Write([byte]0);$writer.Write([byte]0);$writer.Write([byte]0);$writer.Write([byte]0);$writer.Write([uint16]1);$writer.Write([uint16]32);$writer.Write([uint32]$bytes.Length);$writer.Write([uint32]22);$writer.Write($bytes)
$writer.Dispose();$imageStream.Dispose();$white.Dispose();$g.Dispose();$bitmap.Dispose()
