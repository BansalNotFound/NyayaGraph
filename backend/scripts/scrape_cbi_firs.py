"""
CBI Archived FIR Scraper for NyayaGraph
Scrapes large multi-page scanned FIR PDFs (>= 2 MB) from cbi.gov.in
"""
import os
import re
import json
import time
import argparse
import hashlib
import requests
from urllib3.exceptions import InsecureRequestWarning

requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)

CBI_ARCHIVE_URL = "https://cbi.gov.in/view-fir/archived"
DEFAULT_OUTPUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data", "cbi_firs"
)
DEFAULT_MANIFEST = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data", "cbi_firs_manifest.json"
)


def parse_size_to_mb(size_str: str) -> float:
    match = re.search(r'\[([\d\.]+)\s*(MB|KB)\]', size_str, re.IGNORECASE)
    if not match:
        return 0.0
    val, unit = float(match.group(1)), match.group(2).upper()
    return val if unit == 'MB' else val / 1024.0


def scrape_cbi_firs(min_size_mb: float = 2.0, max_files: int = 3, output_dir: str = DEFAULT_OUTPUT_DIR):
    os.makedirs(output_dir, exist_ok=True)
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    print(f"[*] Fetching CBI Archive Directory from {CBI_ARCHIVE_URL}...")
    resp = requests.get(CBI_ARCHIVE_URL, headers=headers, verify=False, timeout=30)
    if resp.status_code != 200:
        print(f"[!] Failed to fetch CBI archive page (HTTP {resp.status_code})")
        return []

    # Regex to extract each table row's fields
    row_pattern = re.compile(
        r'<td>.*?Location Of Registration</span>(.*?)</td>.*?'
        r'href=[\'\"]([^\'\"]+)[\'\"].*?>([A-Z0-9]+)</a>.*?'
        r'Size/Format</span>\s*([^<]+)</span>.*?'
        r'Date of Registration</span>\s*([^<]+)</td>',
        re.DOTALL | re.IGNORECASE
    )

    matches = row_pattern.findall(resp.text)
    print(f"[+] Total archived cases found in CBI directory: {len(matches)}")
    print(f"[+] Filtering for large scanned FIRs (>= {min_size_mb} MB)...")

    manifest = []
    downloaded = 0

    for loc, link, case_no, size_str, reg_date in matches:
        if downloaded >= max_files:
            break

        size_mb = parse_size_to_mb(size_str)
        if size_mb < min_size_mb:
            continue

        loc_clean = re.sub(r'[^A-Za-z0-9]', '_', loc.strip()).strip('_')
        filename = f"{case_no}_{loc_clean}_{int(size_mb)}MB.pdf"
        filepath = os.path.join(output_dir, filename)

        print(f"\n--> [{downloaded + 1}/{max_files}] Downloading {case_no} ({loc.strip()}) | Declared Size: {size_str.strip()}...")

        if not os.path.exists(filepath):
            try:
                with requests.get(link, headers=headers, verify=False, stream=True, timeout=60) as r:
                    r.raise_for_status()
                    hasher = hashlib.sha256()
                    bytes_written = 0
                    with open(filepath, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=65536):
                            if chunk:
                                f.write(chunk)
                                hasher.update(chunk)
                                bytes_written += len(chunk)
                file_hash = hasher.hexdigest()
                actual_mb = bytes_written / (1024 * 1024)
                print(f"    [+] Saved: {filename} ({actual_mb:.2f} MB) | SHA-256: {file_hash[:16]}...")
            except Exception as e:
                print(f"    [!] Error downloading {case_no}: {e}")
                if os.path.exists(filepath):
                    os.remove(filepath)
                continue
        else:
            file_hash = hashlib.sha256(open(filepath, 'rb').read()).hexdigest()
            print(f"    [+] Already downloaded: {filename}")

        manifest.append({
            "case_id": f"CBI_{case_no}",
            "case_number": case_no,
            "location": loc.strip(),
            "registration_date": reg_date.strip(),
            "declared_size": size_str.strip(),
            "size_mb": size_mb,
            "file_path": filepath,
            "filename": filename,
            "sha256": file_hash,
            "source_url": link
        })
        downloaded += 1
        time.sleep(1.0)  # Polite delay

    with open(DEFAULT_MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"\n[OK] Successfully downloaded and indexed {downloaded} CBI FIRs into {output_dir}")
    print(f"[OK] Manifest saved to {DEFAULT_MANIFEST}")
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape large scanned FIR PDFs from CBI Archive")
    parser.add_argument("--min-size", type=float, default=2.0, help="Minimum file size in MB (default: 2.0)")
    parser.add_argument("--max-files", type=int, default=3, help="Max files to download (default: 3)")
    parser.add_argument("--output-dir", type=str, default=DEFAULT_OUTPUT_DIR, help="Destination directory")
    args = parser.parse_args()

    scrape_cbi_firs(min_size_mb=args.min_size, max_files=args.max_files, output_dir=args.output_dir)
