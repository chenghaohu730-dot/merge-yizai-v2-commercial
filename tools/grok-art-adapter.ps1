[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Prompt,

    [string]$PromptFile,

    [ValidateSet('1:1', '16:9', '9:16', '4:3', '3:4', 'auto')]
    [string]$AspectRatio = '1:1',

    [string]$OutputDirectory,

    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._-]*$')]
    [string]$BaseName = 'grok-art',

    [ValidateRange(2, 8)]
    [int]$MaxTurns = 4,

    [ValidateRange(1, 5)]
    [int]$MaxAttempts = 3,

    [switch]$SelfCheck
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-GrokRuntime {
    $command = Get-Command grok -CommandType Application -ErrorAction Stop
    $versionText = (& $command.Source --version 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "grok --version failed: $versionText"
    }

    $helpText = (& $command.Source --help 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0 -or $helpText -notmatch '(?m)--single') {
        throw 'The installed Grok CLI does not expose the verified --single headless option.'
    }

    [pscustomobject]@{
        Path = $command.Source
        Version = $versionText
        SupportsSingle = $true
    }
}

function Get-SessionImageSnapshot {
    param([Parameter(Mandatory = $true)][string]$SessionRoot)

    $snapshot = @{}
    if (-not (Test-Path -LiteralPath $SessionRoot -PathType Container)) {
        return $snapshot
    }

    Get-ChildItem -LiteralPath $SessionRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Extension -match '^\.(png|jpe?g|webp)$' } |
        ForEach-Object { $snapshot[$_.FullName] = $_.Length }
    return $snapshot
}

$repoRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$runtime = Get-GrokRuntime

if ($SelfCheck) {
    [pscustomobject]@{
        ok = $true
        cliPath = $runtime.Path
        cliVersion = $runtime.Version
        verifiedMode = 'grok --single'
        supportedOperation = 'image_gen'
        unsupportedUntilProbed = @('image_edit', 'image_to_video', 'reference_to_video')
    } | ConvertTo-Json -Depth 4
    exit 0
}

if ([string]::IsNullOrWhiteSpace($Prompt) -eq [string]::IsNullOrWhiteSpace($PromptFile)) {
    throw 'Provide exactly one of -Prompt or -PromptFile.'
}

if (-not [string]::IsNullOrWhiteSpace($PromptFile)) {
    $resolvedPromptFile = (Resolve-Path -LiteralPath $PromptFile).Path
    $Prompt = Get-Content -LiteralPath $resolvedPromptFile -Raw -Encoding UTF8
}

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $repoRoot 'art\generated\v2-commercial\grok-adapter'
} elseif (-not [IO.Path]::IsPathRooted($OutputDirectory)) {
    $OutputDirectory = Join-Path $repoRoot $OutputDirectory
}

$sessionRoot = Join-Path 'C:\Users\Administrator\.grok\sessions' ([Uri]::EscapeDataString($repoRoot))
$request = @"
Use the native image_gen tool exactly once to generate one new image.
Aspect ratio: $AspectRatio
Production prompt:
$Prompt

Do not create the image with code. Do not edit project files. After image_gen succeeds, return only the generated image path.
"@

$arguments = @(
    '--cwd', $repoRoot,
    '--single', $request,
    '--output-format', 'plain',
    '--max-turns', $MaxTurns.ToString(),
    '--no-subagents',
    '--no-memory',
    '--disable-web-search',
    '--tools', 'read_file,image_gen',
    '--always-approve'
)

$sourceImage = $null
$attemptUsed = 0
$cliText = ''
for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    $attemptUsed = $attempt
    $before = Get-SessionImageSnapshot -SessionRoot $sessionRoot
    $startedUtc = [DateTime]::UtcNow
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        # Windows PowerShell turns native stderr into ErrorRecord objects. Keep it
        # capturable here so the adapter can distinguish transient API failures.
        $ErrorActionPreference = 'Continue'
        $cliOutput = & $runtime.Path @arguments 2>&1
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    $cliText = ($cliOutput | Out-String).Trim()

    $after = Get-SessionImageSnapshot -SessionRoot $sessionRoot
    $newImages = foreach ($path in $after.Keys) {
        if (-not $before.ContainsKey($path)) {
            $item = Get-Item -LiteralPath $path
            if ($item.LastWriteTimeUtc -ge $startedUtc.AddSeconds(-2)) {
                $item
            }
        }
    }
    $newImages = @($newImages | Sort-Object LastWriteTimeUtc, FullName)

    if ($newImages.Count -eq 1) {
        $sourceImage = $newImages[0]
        break
    }

    $isTransient = $cliText -match '(?i)(execution_failure|api\.x\.ai/v1/images/generations|timed?\s*out|too many requests|\b429\b|\b5\d\d\b)'
    if ($attempt -ge $MaxAttempts -or ($exitCode -ne 0 -and -not $isTransient)) {
        throw "Grok image generation failed after ${attempt} attempt(s), exit code ${exitCode}, new images $($newImages.Count):`n$cliText"
    }

    $delaySeconds = [Math]::Min(5, $attempt * 2)
    Write-Warning "Grok image API attempt $attempt did not produce an image; retrying in $delaySeconds second(s)."
    Start-Sleep -Seconds $delaySeconds
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$destination = Join-Path $OutputDirectory ("{0}-{1}{2}" -f $BaseName, $stamp, $sourceImage.Extension.ToLowerInvariant())
Copy-Item -LiteralPath $sourceImage.FullName -Destination $destination

$destinationItem = Get-Item -LiteralPath $destination
$imageHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
$promptBytes = [Text.Encoding]::UTF8.GetBytes($Prompt)
$promptStream = [IO.MemoryStream]::new($promptBytes)
try {
    $promptHash = (Get-FileHash -InputStream $promptStream -Algorithm SHA256).Hash
} finally {
    $promptStream.Dispose()
}

$manifestPath = [IO.Path]::ChangeExtension($destination, '.json')
$manifest = [ordered]@{
    schemaVersion = 1
    generatedAtUtc = [DateTime]::UtcNow.ToString('o')
    adapter = 'tools/grok-art-adapter.ps1'
    grokCli = [ordered]@{
        path = $runtime.Path
        version = $runtime.Version
        mode = '--single'
        tool = 'image_gen'
        attempts = $attemptUsed
    }
    request = [ordered]@{
        aspectRatio = $AspectRatio
        prompt = $Prompt
        promptSha256 = $promptHash
    }
    artifact = [ordered]@{
        sourceSessionPath = $sourceImage.FullName
        outputPath = $destinationItem.FullName
        bytes = $destinationItem.Length
        sha256 = $imageHash
    }
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

[pscustomobject]@{
    ok = $true
    imagePath = $destinationItem.FullName
    manifestPath = (Get-Item -LiteralPath $manifestPath).FullName
    bytes = $destinationItem.Length
    sha256 = $imageHash
    grokVersion = $runtime.Version
    attempts = $attemptUsed
} | ConvertTo-Json -Depth 4
