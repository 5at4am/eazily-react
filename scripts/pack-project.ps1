param([string]$OutputPath)
$ErrorActionPreference = 'Stop'
$ProjectRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$WorkspaceRoot = [IO.Path]::GetFullPath((Split-Path -Parent $ProjectRoot))
if (-not $OutputPath) { $OutputPath = Join-Path $WorkspaceRoot 'Eazily-google-email-source-v1.0.3.zip' }
$ZipPath = [IO.Path]::GetFullPath($OutputPath)
if (-not $ZipPath.StartsWith($WorkspaceRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'The ZIP must stay inside the project workspace.'
}
if (Test-Path -LiteralPath $ZipPath) { throw 'Choose a new output filename; the ZIP already exists.' }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$ExcludedDirectories = @('node_modules', '.git', '.tmp', '.gradle', 'backups')
$ExcludedFiles = @('.DS_Store', 'local.properties', '.env', '.env.staging', '.env.production')
$Archive = [IO.Compression.ZipFile]::Open($ZipPath, [IO.Compression.ZipArchiveMode]::Create)
$script:PackedFiles = 0
function Add-ProjectFolder([string]$Folder) {
  foreach ($Item in Get-ChildItem -LiteralPath $Folder -Force) {
    $Relative = $Item.FullName.Substring($ProjectRoot.Length + 1).Replace('\', '/')
    if ($Item.PSIsContainer) {
      if ($Item.Name -in $ExcludedDirectories) { continue }
      if ($Relative -match '^android/(?:.*/)?build$') { continue }
      if ($Relative -eq 'android/app/src/main/assets/public') { continue }
      Add-ProjectFolder $Item.FullName
    } else {
      if ($Item.Name -in $ExcludedFiles -or $Item.Extension -in @('.dump', '.backup', '.apk', '.zip', '.log')) { continue }
      if ($Relative -match '^supabase/\.temp/' -or $Item.Name -in @('capacitor.plugins.json')) { continue }
      if ($Relative -eq 'android/app/src/main/assets/capacitor.config.json') { continue }
      [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($Archive, $Item.FullName, 'eazily-react/' + $Relative, [IO.Compression.CompressionLevel]::Optimal)
      $script:PackedFiles++
    }
  }
}
try { Add-ProjectFolder $ProjectRoot } finally { $Archive.Dispose() }
$Inspect = [IO.Compression.ZipFile]::OpenRead($ZipPath)
try {
  $Names = @($Inspect.Entries | ForEach-Object FullName)
  if ($Names -match '(^|/)node_modules/' -or $Names -match '(^|/)\.tmp/') { throw 'Excluded build files were packaged.' }
  foreach ($Required in @('package.json', 'package-lock.json', '.env.local', 'src/main.jsx', 'android/app/build.gradle', 'docs/GOOGLE-EMAIL-AUTH-SETUP.md')) {
    if ('eazily-react/' + $Required -notin $Names) { throw "Missing required file: $Required" }
  }
} finally { $Inspect.Dispose() }
Write-Output ("Packed {0} files into {1} ({2:N2} MB)" -f $script:PackedFiles, $ZipPath, ((Get-Item -LiteralPath $ZipPath).Length / 1MB))
