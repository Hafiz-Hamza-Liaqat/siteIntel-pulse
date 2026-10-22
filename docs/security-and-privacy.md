# SiteIntel Pulse — Security, Privacy, and Ethical Boundaries

## 1. Safe Crawling & SSRF Protection
SiteIntel Pulse is built with comprehensive safeguards to prevent the scanner from being weaponized as an open network proxy or SSRF vector.

### 1.1 IP Address & Host Validation
Before initiating any HTTP request:
1. The target hostname is resolved using Node's DNS resolver to all IPv4 and IPv6 addresses.
2. Every returned IP is checked against strict CIDR blacklists:
   - **IPv4 Loopback:** `127.0.0.0/8`
   - **IPv4 Private:** `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
   - **IPv4 Link-Local:** `169.254.0.0/16`
   - **Cloud Metadata Services:** `169.254.169.254`, `metadata.google.internal`, `100.100.100.200`
   - **IPv4 Broadcast / Multicast / Reserved:** `0.0.0.0/8`, `224.0.0.0/4`, `240.0.0.0/4`, `255.255.255.255/32`
   - **IPv6 Loopback & Unspecified:** `::1`, `::`
   - **IPv6 Unique Local (ULA):** `fc00::/7`
   - **IPv6 Link-Local:** `fe80::/10`
   - **IPv4-Mapped IPv6:** `::ffff:0:0/96`
   - **IPv6 Multicast / Documentation:** `ff00::/8`, `2001:db8::/32`
3. Prohibited schemes (`file:`, `gopher:`, `ftp:`, `data:`, `javascript:`) and user-credential URLs (`https://user:pass@domain`) are rejected immediately.
4. Allowed ports are strictly restricted to HTTP (`80`) and HTTPS (`443`).

### 1.2 DNS Rebinding & Redirect Defense
- Redirect destinations are captured and re-validated through the full DNS safety filter before following.
- Maximum redirect hops are capped at 5.
- Redirect loops are detected and halted immediately with partial evidence preserved.

### 1.3 Streaming Resource Limits
- **Per-Page HTML Budget:** Streaming decompression aborts as soon as the response body exceeds 2 MiB.
- **Per-Scan Byte Budget:** The entire crawl aborts when cumulative fetched data exceeds 50 MiB.
- **Request Timeout:** Fixed 10-second timeout per request.
- **Concurrency & Rate Limit:** Max 3 concurrent requests per host with an identifiable user-agent (`SiteIntelPulse-Bot/1.0`).

## 2. Non-Invasive Public Testing Boundary
SiteIntel Pulse strictly limits itself to non-invasive, passive, and low-volume discovery:
- **No Brute-Forcing:** The scanner never performs directory fuzzing, password guessing, or credential stuffing.
- **No Exploitation:** The scanner never executes injection payloads (SQLi, XSS, command injection), path traversal, or remote code execution tests.
- **No Destructive Actions:** No forms are submitted with mutating side effects; shopping carts are not checked out; state-altering endpoints are ignored.
- **No Node.js Code Execution:** Downloaded JavaScript files, styles, and templates are never executed inside the Node.js runtime.

## 3. Data Privacy & Owner View Projection
- **Sanitized Output:** All scraped page titles, descriptions, and text snippets are treated as untrusted strings and safely rendered to avoid cross-site scripting (XSS).
- **Redaction of Sensitive Findings:** The Company A Website Owner Report summarizes findings at a business impact level and suppresses detailed exploit paths, server software internal stack traces, and internal URLs.
- **Provider Credentials:** Third-party credentials (PageSpeed API keys, Search Console tokens) remain exclusively on the server and are never delivered to the client browser.
