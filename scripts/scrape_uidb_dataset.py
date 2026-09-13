#!/usr/bin/env python3
"""
MP Police Citizen Portal UIDB (Unidentified Dead Bodies / Persons) Scraper & Translator.
Extracts records, downloads photos, transliterates/translates Hindi fields to English,
and outputs clean JSON datasets for NyayaGraph 3D Forensic Sphere Gallery.
"""

import os
import re
import ssl
import json
import time
import urllib.request
import urllib.parse
from html.parser import HTMLParser

# Setup SSL context with legacy server connect flag (0x4) required for Indian .gov.in domains
ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE
ssl_ctx.options |= 0x4  # OP_LEGACY_SERVER_CONNECT

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://citizen.mppolice.gov.in/UIDBSearch.aspx",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
}

BASE_URL = "https://citizen.mppolice.gov.in/UIDBSearch.aspx"
IMG_HANDLER_BASE = "https://citizen.mppolice.gov.in/"

# Known police stations and district mappings in MP
PS_MAP = {
    "सोहागपुर": "Sohagpur",
    "भीकनगांव": "Bhikangaon",
    "तलैया": "Talaiya",
    "कोहेफिजा": "Kohefiza",
    "दमोह कोतवाली": "Damoh Kotwali",
    "देवास": "Dewas",
    "नेमावर": "Nemawar",
    "टोंकखुर्द": "Tonk Khurd",
    "इंदौर": "Indore",
    "उज्जैन": "Ujjain",
    "भोपाल": "Bhopal",
    "जबलपुर": "Jabalpur",
    "ग्वालियर": "Gwalior",
    "रीवा": "Rewa",
    "सागर": "Sagar",
    "सतना": "Satna",
    "रतलाम": "Ratlam",
    "कटनी": "Katni",
    "मुरैना": "Morena",
    "खरगोन": "Khargone",
    "खंडवा": "Khandwa",
    "इटारसी": "Itarsi",
    "होशंगाबाद": "Hoshangabad",
    "नर्मदापुरम": "Narmadapuram",
    "सीहोर": "Sehore",
    "रायसेन": "Raisen",
    "विदिशा": "Vidisha",
    "राजगढ़": "Rajgarh",
    "ब्यावरा": "Biaora",
    "मंदसौर": "Mandsaur",
    "नीमच": "Neemuch",
    "धार": "Dhar",
    "झाबुआ": "Jhabua",
    "बड़वानी": "Barwani",
    "गुना": "Guna",
    "अशोकनगर": "Ashoknagar",
    "दतिया": "Datia",
    "शिवपुरी": "Shivpuri",
    "श्योपुर": "Sheopur",
    "भिंड": "Bhind",
    "छतरपुर": "Chhatarpur",
    "टीकमगढ़": "Tikamgarh",
    "पन्ना": "Panna",
    "दमोह": "Damoh",
    "सीधी": "Sidhi",
    "सिंगरौली": "Singrauli",
    "शहडोल": "Shahdol",
    "अनूपपुर": "Anuppur",
    "उमरिया": "Umaria",
    "डिंडोरी": "Dindori",
    "मंडला": "Mandla",
    "बालाघाट": "Balaghat",
    "सिवनी": "Seoni",
    "छिंदवाड़ा": "Chhindwara",
    "बैतूल": "Betul",
    "हरदा": "Harda",
}

STATUS_MAP = {
    "अज्ञात": "Unidentified / Unknown",
    "ज्ञात": "Identified",
    "सत्यापित": "Verified",
    "लंबित": "Pending",
}

# Devanagari to Latin phonetics table for general transliteration
VOWELS = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah'
}

MATRAS = {
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', 'ः': 'h', '्': ''
}

CONSONANTS = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
    'ष': 'sh', 'स': 's', 'ह': 'h', 'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gy'
}

def transliterate_hindi(text: str) -> str:
    """Accurate transliteration of Hindi words to English Latin script."""
    if not text or not text.strip():
        return ""
    text = text.strip()
    
    # Check direct dictionary match first
    for hi, en in PS_MAP.items():
        if hi in text:
            text = text.replace(hi, en)
    
    res = []
    i = 0
    chars = list(text)
    n = len(chars)
    
    while i < n:
        ch = chars[i]
        
        if ch in VOWELS:
            res.append(VOWELS[ch])
            i += 1
        elif ch in CONSONANTS:
            cons = CONSONANTS[ch]
            # Check next character for matra or halant
            if i + 1 < n and chars[i + 1] in MATRAS:
                matra = MATRAS[chars[i + 1]]
                res.append(cons + matra)
                i += 2
            elif i + 1 < n and chars[i + 1] == '्':
                res.append(cons)
                i += 2
            else:
                # Add default inherent 'a' unless at end of word or next is space
                if i + 1 == n or chars[i + 1] == ' ':
                    res.append(cons)
                else:
                    res.append(cons + 'a')
                i += 1
        elif ch == ' ':
            res.append(' ')
            i += 1
        elif ch.isascii():
            res.append(ch)
            i += 1
        else:
            i += 1
            
    out = "".join(res)
    # Clean up double spaces or awkward patterns
    out = re.sub(r'\s+', ' ', out).strip()
    return out.title()

def extract_hidden_inputs(html: str) -> dict:
    """Extract ASP.NET hidden fields: __VIEWSTATE, __EVENTVALIDATION, etc."""
    fields = {}
    for match in re.finditer(r'<input[^>]+type=[\"\']hidden[\"\'][^>]*>', html, re.I):
        tag = match.group(0)
        name_m = re.search(r'name=[\"\']([^\"\']+)[\"\']', tag, re.I)
        val_m = re.search(r'value=[\"\']([^\"\']*)[\"\']', tag, re.I)
        if name_m:
            fields[name_m.group(1)] = val_m.group(1) if val_m else ""
    return fields

def parse_records_from_html(html: str) -> list:
    """Parse records from HTML table / datalist."""
    records = []
    # Match each item block having an ImageID
    pattern = re.compile(
        r'<img[^>]+src=[\"\'](UIDBHandler\.ashx\?ImageID=([0-9]+))[\"\'][^>]*>([\s\S]*?)(?=(?:<img[^>]+src=[\"\']UIDBHandler\.ashx|$))',
        re.I
    )
    
    for match in pattern.finditer(html):
        img_rel = match.group(1)
        image_id = match.group(2)
        chunk = match.group(3)
        
        # Strip HTML tags
        clean_text = re.sub(r'<[^>]+>', '\n', chunk)
        lines = [line.strip() for line in clean_text.split('\n') if line.strip()]
        
        rec = {
            "image_id": image_id,
            "original_image_url": f"{IMG_HANDLER_BASE}{img_rel}",
            "name_hi": "",
            "age": None,
            "police_station_hi": "",
            "reg_number": "",
            "status_hi": "",
        }
        
        # Parse fields from lines
        for j, line in enumerate(lines):
            if "नाम" in line and j + 2 < len(lines):
                val = lines[j + 2] if lines[j + 1] == ":" else lines[j + 1]
                if val not in [":", "उम्र", "थाना", "पंजीकरण संख्या", "स्थिति"]:
                    rec["name_hi"] = val
            elif "उम्र" in line and j + 2 < len(lines):
                val = lines[j + 2] if lines[j + 1] == ":" else lines[j + 1]
                if val.isdigit():
                    rec["age"] = int(val)
            elif "थाना" in line and j + 2 < len(lines):
                val = lines[j + 2] if lines[j + 1] == ":" else lines[j + 1]
                if val not in [":", "उम्र", "थाना", "पंजीकरण संख्या", "स्थिति"]:
                    rec["police_station_hi"] = val
            elif "पंजीकरण संख्या" in line and j + 2 < len(lines):
                val = lines[j + 2] if lines[j + 1] == ":" else lines[j + 1]
                if val not in [":", "उम्र", "थाना", "पंजीकरण संख्या", "स्थिति"]:
                    rec["reg_number"] = val
            elif "स्थिति" in line and j + 2 < len(lines):
                val = lines[j + 2] if lines[j + 1] == ":" else lines[j + 1]
                if val not in [":", "उम्र", "थाना", "पंजीकरण संख्या", "स्थिति"]:
                    rec["status_hi"] = val
                    
        # If reg_number is missing, use image_id prefix
        if not rec["reg_number"] and len(image_id) >= 15:
            rec["reg_number"] = image_id[:15]
            
        records.append(rec)
        
    return records

def download_image(url: str, dest_path: str) -> bool:
    """Download image with retry and legacy SSL support."""
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ssl_ctx, timeout=15) as res:
            data = res.read()
            if len(data) > 200:  # valid image
                with open(dest_path, "wb") as f:
                    f.write(data)
                return True
    except Exception as e:
        print(f"    [Warning] Failed to download {url}: {e}")
    return False

def main():
    print("=" * 70)
    print("  MP POLICE CCTNS UIDB (UNIDENTIFIED DOSSIER) SCRAPER & TRANSLATOR")
    print("=" * 70)

    # Directories
    img_out_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "data", "uidb_images")
    json_fe_out = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "data", "uidb_dataset.json")
    json_be_out = os.path.join(os.path.dirname(__file__), "..", "backend", "data", "uidb_dataset.json")

    os.makedirs(img_out_dir, exist_ok=True)
    os.makedirs(os.path.dirname(json_fe_out), exist_ok=True)
    os.makedirs(os.path.dirname(json_be_out), exist_ok=True)

    # 1. Fetch Initial Page (Page 1)
    print("\n[Step 1] Fetching Page 1 from MP Police portal...")
    req = urllib.request.Request(BASE_URL, headers=HEADERS)
    with urllib.request.urlopen(req, context=ssl_ctx, timeout=25) as res:
        current_html = res.read().decode("utf-8", errors="ignore")

    all_raw_records = []
    page1_recs = parse_records_from_html(current_html)
    print(f"  -> Page 1: Extracted {len(page1_recs)} records.")
    all_raw_records.extend(page1_recs)

    # Check total pages
    page_matches = re.findall(r'Page 1 of ([0-9]+)', current_html)
    total_pages = int(page_matches[0]) if page_matches else 8
    print(f"  -> Total pages detected: {total_pages}")

    # 2. Iterate through subsequent pages (Page 2 to total_pages)
    current_fields = extract_hidden_inputs(current_html)

    for p in range(2, min(total_pages + 1, 9)):
        print(f"\n[Step 2.{p}] Requesting Page {p} via ASP.NET PostBack...")
        # Target format: ctl00$ContentPlaceHolder1$dlPaging$ctl01$lnkbtnPaging for p=2 (0-indexed ctl01)
        ctl_idx = f"ctl{p - 1:02d}"
        target = f"ctl00$ContentPlaceHolder1$dlPaging${ctl_idx}$lnkbtnPaging"

        post_fields = dict(current_fields)
        post_fields["__EVENTTARGET"] = target
        post_fields["__EVENTARGUMENT"] = ""

        post_data = urllib.parse.urlencode(post_fields).encode("utf-8")
        p_req = urllib.request.Request(BASE_URL, data=post_data, headers=HEADERS)

        try:
            with urllib.request.urlopen(p_req, context=ssl_ctx, timeout=25) as p_res:
                p_html = p_res.read().decode("utf-8", errors="ignore")
                current_fields = extract_hidden_inputs(p_html)
                p_recs = parse_records_from_html(p_html)
                print(f"  -> Page {p}: Extracted {len(p_recs)} records.")
                all_raw_records.extend(p_recs)
        except Exception as e:
            print(f"  -> [Error] Page {p} postback failed: {e}")
            break

        time.sleep(0.5)  # respectful polite delay

    # De-duplicate by image_id
    seen_ids = set()
    unique_records = []
    for r in all_raw_records:
        if r["image_id"] not in seen_ids:
            seen_ids.add(r["image_id"])
            unique_records.append(r)

    print(f"\n[Step 3] Total unique records harvested: {len(unique_records)}")

    # 3. Download Images & Translate/Enrich Records
    print("\n[Step 4] Downloading images & translating Hindi to English...")
    final_dataset = []

    for i, r in enumerate(unique_records):
        img_filename = f"{r['image_id']}.jpg"
        local_img_rel = f"/data/uidb_images/{img_filename}"
        local_img_disk = os.path.join(img_out_dir, img_filename)

        # Download if not already present
        has_local = False
        if os.path.exists(local_img_disk) and os.path.getsize(local_img_disk) > 200:
            has_local = True
        else:
            has_local = download_image(r["original_image_url"], local_img_disk)

        # Translate / transliterate fields
        raw_name = r.get("name_hi", "").strip()
        if raw_name:
            name_en = transliterate_hindi(raw_name)
        else:
            name_en = "Unidentified Person"

        raw_ps = r.get("police_station_hi", "").strip()
        if raw_ps in PS_MAP:
            ps_en = PS_MAP[raw_ps]
        elif raw_ps:
            ps_en = transliterate_hindi(raw_ps)
        else:
            ps_en = "State Police Jurisdiction"

        raw_status = r.get("status_hi", "").strip()
        status_en = STATUS_MAP.get(raw_status, "Unidentified / Unknown")

        district_en = ps_en.split()[0]  # rough district attribution

        item = {
            "id": f"UIDB_{r['image_id']}",
            "image_id": r["image_id"],
            "reg_number": r.get("reg_number") or r["image_id"][:15],
            "name_en": name_en,
            "name_hi": raw_name or "अज्ञात",
            "age": r.get("age"),
            "police_station_en": ps_en,
            "police_station_hi": raw_ps or "अज्ञात थाना",
            "district_en": district_en,
            "state_en": "Madhya Pradesh",
            "status_en": status_en,
            "status_hi": raw_status or "अज्ञात",
            "image_url": local_img_rel if has_local else r["original_image_url"],
            "has_local_photo": has_local,
            "source": "Madhya Pradesh Police CCTNS State Crime Records Bureau",
            "portal_url": "https://citizen.mppolice.gov.in/UIDBSearch.aspx",
        }
        final_dataset.append(item)

        if (i + 1) % 10 == 0 or (i + 1) == len(unique_records):
            print(f"  -> Processed {i + 1}/{len(unique_records)}: {item['name_en']} ({item['police_station_en']})")

    # 4. Save JSON Datasets
    print("\n[Step 5] Saving structured JSON datasets...")
    with open(json_fe_out, "w", encoding="utf-8") as f:
        json.dump(final_dataset, f, ensure_ascii=False, indent=2)
    print(f"  -> Saved to frontend: {json_fe_out}")

    with open(json_be_out, "w", encoding="utf-8") as f:
        json.dump(final_dataset, f, ensure_ascii=False, indent=2)
    print(f"  -> Saved to backend:  {json_be_out}")

    print("\n" + "=" * 70)
    print(f"  SCRAPING & TRANSLATION COMPLETE! Total records: {len(final_dataset)}")
    print("=" * 70)

if __name__ == "__main__":
    main()
