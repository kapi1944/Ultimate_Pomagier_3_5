from pathlib import Path
import zipfile, pypdf, io
for n in zipfile.ZipFile('wzorcowe_dokumenty/wzorcowe_dokumenty-ankiety.zip').namelist():
 r=pypdf.PdfReader(io.BytesIO(zipfile.ZipFile('wzorcowe_dokumenty/wzorcowe_dokumenty-ankiety.zip').read(n)))
 print(n, len(r.pages), ''.join(p.extract_text() for p in r.pages)[-2100:])
try:
 import fitz
 print('FITZ OK')
except ImportError: print('NO FITZ')
