import json

path = r'C:\Users\Muneesha\.gemini\antigravity\brain\8d5f3968-9ad8-47dc-a63d-e71b2278e101\.system_generated\logs\transcript_full.jsonl'
output_path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\recovered_dashboard.tsx'

with open(path, 'r', encoding='utf-8') as f:
    for line in f:
        if not line.strip(): continue
        try:
            data = json.loads(line)
            if data.get('source') == 'MODEL' and 'tool_calls' in data:
                for call in data['tool_calls']:
                    if call['name'] == 'write_to_file':
                        args = call.get('args', {})
                        code = args.get('CodeContent', '')
                        if 'Business Risk' in code:
                            with open(output_path, 'w', encoding='utf-8') as out:
                                out.write(code)
                            print("SUCCESS: wrote", len(code), "bytes")
                            exit(0)
        except Exception as e:
            pass
print("FAILED to find")
