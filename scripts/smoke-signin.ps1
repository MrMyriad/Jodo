$base = "http://localhost:3000"
$timeout = 180
$sw = [diagnostics.stopwatch]::StartNew()
Write-Host "Waiting up to $timeout seconds for $base..."
$ready = $false
while ($sw.Elapsed.TotalSeconds -lt $timeout) {
    try {
        $r = Invoke-WebRequest -Uri $base -Method Head -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-Host "Server responded: $($r.StatusCode)"
        $ready = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}
if (-not $ready) {
    Write-Host "ERROR: Server not ready within $timeout seconds."
    exit 2
}

# Quick check sign-in page for obvious errors
Write-Host "Checking /auth/signin page..."
try {
    $signin = Invoke-WebRequest -Uri "$base/auth/signin" -Method Get -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
    $body = $signin.Content
    if ($body -match "CALLBACK_CREDENTIALS_JWT_ERROR") {
        Write-Host "ERROR: Found CALLBACK_CREDENTIALS_JWT_ERROR in sign-in page."
        exit 3
    }
} catch {
    Write-Host "ERROR: Failed to GET /auth/signin: $_"
    exit 4
}

# Get CSRF token and session cookie
Write-Host "Requesting CSRF token..."
$websession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$tryCount = 0
while ($true) {
    try {
        $csrfResp = Invoke-WebRequest -Uri "$base/api/auth/csrf" -WebSession $websession -UseBasicParsing -ErrorAction Stop
        break
    } catch {
        $tryCount += 1
        if ($tryCount -gt 10) {
            Write-Host "ERROR: Failed to get CSRF token after retries: $_"
            exit 5
        }
        Start-Sleep -Seconds 1
    }
}
$csrfJson = $csrfResp.Content | ConvertFrom-Json
$csrf = $csrfJson.csrfToken
Write-Host "CSRF token received."

# Use development credentials provider
$email = "dev+test@example.com"
$callbackUrl = "$base/"
Write-Host "Posting credentials to sign-in with provider dev-email for $email..."
try {
    $postResp = Invoke-WebRequest -Uri "$base/api/auth/callback/dev-email" -Method POST -Body @{csrfToken=$csrf; email=$email; callbackUrl=$callbackUrl} -WebSession $websession -UseBasicParsing -ErrorAction Stop
    Write-Host "Sign-in POST status: $($postResp.StatusCode)"
    Write-Host "Response headers:"
    $postResp.Headers | Format-List | Out-String | Write-Host
    Write-Host "Cookies in session:"
    $websession.Cookies.GetCookies($base) | ForEach-Object { Write-Host ("{0}={1}; Path={2}" -f $_.Name, $_.Value, $_.Path) }
} catch {
    Write-Host "ERROR: sign-in POST failed: $_"
    exit 6
}

# After sign-in, check session
try {
    # allow a short wait for session to be available
    Start-Sleep -Seconds 1
    $sessionResp = Invoke-WebRequest -Uri "$base/api/auth/session" -Method Get -WebSession $websession -UseBasicParsing -ErrorAction Stop
    $sessionJson = $sessionResp.Content | ConvertFrom-Json
    if ($sessionJson.user -and $sessionJson.user.email) {
        Write-Host "SUCCESS: signed in as $($sessionJson.user.email) (id: $($sessionJson.user.id))"
        exit 0
    } else {
        Write-Host "ERROR: session did not contain user: $($sessionResp.Content)"
        exit 7
    }
} catch {
    Write-Host "ERROR: failed to fetch session: $_"
    exit 8
}
