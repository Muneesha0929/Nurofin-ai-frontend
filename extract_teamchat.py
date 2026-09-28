import json

path = r'C:\Users\Muneesha\.gemini\antigravity\brain\8d5f3968-9ad8-47dc-a63d-e71b2278e101\.system_generated\logs\transcript_full.jsonl'
output_path = r'C:\Users\Muneesha\Desktop\Nurofin Executive AI\Nurofin-ai-frontend\teamchat_recovered.tsx'

found = False
with open(path, 'r', encoding='utf-8') as f:
    for line in f:
        if not line.strip(): continue
        try:
            data = json.loads(line)
            if data.get('source') == 'MODEL' and 'tool_calls' in data:
                for call in data['tool_calls']:
                    if call['name'] == 'write_to_file' or call['name'] == 'replace_file_content':
                        args = call.get('args', {})
                        target = args.get('TargetFile', '')
                        if 'team-chat' in target:
                            if call['name'] == 'write_to_file':
                                code = args.get('CodeContent', '')
                                with open(output_path, 'w', encoding='utf-8') as out:
                                    out.write(code)
                                print("SUCCESS: wrote", len(code), "bytes")
                                found = True
                            elif call['name'] == 'replace_file_content':
                                print("FOUND replace_file_content for team-chat!")
        except Exception as e:
            pass

if not found:
    print("FAILED to find write_to_file for team-chat")
