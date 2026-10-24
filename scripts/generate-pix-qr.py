# Gera public/pix-qr.svg a partir do BR Code Pix. Uso (uma vez, quando a chave mudar):
#   python3 -m venv /tmp/qr && /tmp/qr/bin/pip install ./qrcode-8.2-py3-none-any.whl
#   npx tsx -e 'import {pixPayload} from "./src/domain/pix"; console.log(pixPayload())' \
#     | /tmp/qr/bin/python scripts/generate-pix-qr.py > public/pix-qr.svg
# Não é dependência do projeto: o QR é um arquivo fixo.
import sys

import qrcode
import qrcode.constants

payload = sys.stdin.read().strip()
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=4)
qr.add_data(payload)
qr.make(fit=True)
matrix = qr.get_matrix()  # já inclui a margem de silêncio de 4 módulos
side = len(matrix)
path = "".join(
    f"M{c} {r}h1v1h-1z" for r, row in enumerate(matrix) for c, dark in enumerate(row) if dark
)
# ink sobre paper, como o QrCode da sala; o payload vai em <desc> para o teste conferir
print(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {side} {side}" '
    f'role="img" aria-labelledby="t d" shape-rendering="crispEdges">'
    f'<title id="t">QR code Pix do Kinne</title><desc id="d">{payload}</desc>'
    f'<rect width="{side}" height="{side}" fill="#f2f2ee"/>'
    f'<path d="{path}" fill="#020202"/></svg>'
)
