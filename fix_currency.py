import os, re
dirs=['app', 'components']
for d in dirs:
 for root,_,files in os.walk(d):
  for f in files:
   if f.endswith('.tsx') or f.endswith('.ts'):
    p=os.path.join(root,f)
    with open(p,'r',encoding='utf-8') as file: c=file.read()
    n=c.replace('USD','INR').replace('en-US','en-IN')
    if n!=c:
     with open(p,'w',encoding='utf-8') as file: file.write(n)
     print('Updated', p)
