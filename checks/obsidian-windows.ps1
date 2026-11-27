$ErrorActionPreference = 'Stop'
if ($env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:RUNNER_OS -ne 'Windows') {
    throw 'Use a disposable GitHub-hosted Windows runner for this desktop trial.'
}

$trial = Join-Path $env:RUNNER_TEMP ('obsidian-trial-' + [guid]::NewGuid())
$profileDir = Join-Path $trial 'client'
$vault = Join-Path $trial 'Synthetic Vault'
$desk = Join-Path $trial 'desk'
$bundle = Join-Path $vault 'Work'
New-Item -ItemType Directory -Path $profileDir, (Join-Path $vault '.obsidian') -Force | Out-Null
node workspace/cli.mjs $desk init | Out-Null
if ($LASTEXITCODE) { throw 'Workspace initialization failed.' }
node workspace/cli.mjs $desk register pilot 'Synthetic pilot' $vault | Out-Null
if ($LASTEXITCODE) { throw 'Project registration failed.' }
node workspace/cli.mjs $desk apply workspace/examples/meeting.json | Out-Null
if ($LASTEXITCODE) { throw 'Synthetic intake failed.' }
node workspace/cli.mjs $desk okf $bundle pilot | Out-Null
if ($LASTEXITCODE) { throw 'Bundle export failed.' }

$installer = Join-Path $trial 'Obsidian.exe'
Invoke-WebRequest -Uri 'https://github.com/obsidianmd/obsidian-releases/releases/download/v1.13.4/Obsidian-1.13.4.exe' -OutFile $installer
$digest = (Get-FileHash -Algorithm SHA256 $installer).Hash
if ($digest -ne '8c761aaa40310d339b6936092e91e99a9886daf1fd655f4c8d59e9f7fa46e7a0') { throw 'Unexpected vendor asset digest.' }
if ((Get-AuthenticodeSignature $installer).Status -ne 'Valid') { throw 'Vendor signature verification failed.' }

$packed = Join-Path $trial 'packed'
$program = Join-Path $trial 'app'
7z x $installer "-o$packed" '$PLUGINSDIR/app-64.7z' -y | Out-Null
if ($LASTEXITCODE) { throw 'Installer archive extraction failed.' }
7z x (Join-Path $packed '$PLUGINSDIR/app-64.7z') "-o$program" -y | Out-Null
if ($LASTEXITCODE) { throw 'Desktop application extraction failed.' }
$binary = Join-Path $program 'Obsidian.exe'
if ((Get-AuthenticodeSignature $binary).Status -ne 'Valid') { throw 'Desktop signature verification failed.' }

# This fresh client profile contains only our synthetic vault.
$registry = @{ vaults = @{ '0123456789abcdef' = @{ path = $vault; ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); open = $true } } }
$registry | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $profileDir 'obsidian.json') -Encoding utf8NoBOM
function Open-TrialNote($relativePath) {
    $start = [System.Diagnostics.ProcessStartInfo]::new($binary)
    $start.UseShellExecute = $false
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $start.ArgumentList.Add("--user-data-dir=$profileDir")
    $destination = [uri]::EscapeDataString((Join-Path $vault $relativePath))
    $start.ArgumentList.Add("obsidian://open?path=$destination")
    $client = [System.Diagnostics.Process]::Start($start)
    $client.BeginOutputReadLine()
    $client.BeginErrorReadLine()
}
function Find-TrialLeaf($node, $activeId) {
    if ($node.id -eq $activeId -and $node.state.type -eq 'markdown') { return $node.state.state.file }
    foreach ($child in $node.children) {
        $found = Find-TrialLeaf $child $activeId
        if ($found) { return $found }
    }
}
function Confirm-TrialNote($relativePath) {
    $workspaceFile = Join-Path $vault '.obsidian/workspace.json'
    $stem = [IO.Path]::GetFileNameWithoutExtension($relativePath)
    $deadline = [datetime]::UtcNow.AddSeconds(55)
    $repeatAt = [datetime]::UtcNow.AddSeconds(12)
    $resent = $false
    do {
        $windows = @(Get-Process Obsidian -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $binary -and $_.MainWindowHandle -ne 0 })
        foreach ($window in $windows) {
            if ($window.MainWindowTitle.StartsWith("$stem - Synthetic Vault - ")) { return }
        }
        if (!$resent -and [datetime]::UtcNow -gt $repeatAt) {
            Open-TrialNote $relativePath
            $resent = $true
        }
        if (Test-Path $workspaceFile) {
            try {
                $state = Get-Content -LiteralPath $workspaceFile -Raw | ConvertFrom-Json -AsHashtable
                if ((Find-TrialLeaf $state.main $state.active) -eq $relativePath) { return }
            } catch [System.IO.IOException] {}
        }
        Start-Sleep -Seconds 1
    } while ([datetime]::UtcNow -lt $deadline)
    $hasWorkspace = Test-Path $workspaceFile
    $trialTitles = @($windows | ForEach-Object { $_.MainWindowTitle })
    Write-Output "Synthetic client windows: $($windows.Count). Persisted workspace: $hasWorkspace. Trial titles: $($trialTitles -join ', ')"
    throw "The desktop client did not report an active Markdown leaf for $relativePath."
}

foreach ($note in 'Work/index.md', 'Work/p-pilot_i-reader-test.md') {
    Open-TrialNote $note
    Confirm-TrialNote $note
    Write-Output "Verified active Markdown note: $note"
}
