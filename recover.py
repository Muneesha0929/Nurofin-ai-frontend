import json
path = r'C:\Users\Muneesha\.gemini\antigravity\brain\8d5f3968-9ad8-47dc-a63d-e71b2278e101\.system_generated\logs\transcript_full.jsonl'
code = ""
with open(path, 'r', encoding='utf-8') as f:
    for line in f:
        if not line.strip(): continue
        try:
            d = json.loads(line)
            if d.get('source') == 'SYSTEM' and 'ff759125-969c-4926-9e12-b0ed6e33f625' in str(d):
                code += str(d.get('content', '')) + '\n'
        except: pass

with open(r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\app\dashboard\page.tsx', 'w', encoding='utf-8') as f:
    if len(code) > 100:
        f.write(code)
        print("Success")
    else:
        print("Failed to find")
