import urllib.request
try:
    req = urllib.request.Request('http://localhost:8000/api/v1/workcenter?page_size=200')
    # Need a real token to not get 401, but let's see what happens
    res = urllib.request.urlopen(req)
    print(res.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code}")
    print(e.read().decode())
except Exception as e:
    print(f"Error: {e}")
