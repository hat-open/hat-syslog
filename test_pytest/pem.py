import datetime

import cryptography.x509
import cryptography.hazmat.backends
import cryptography.hazmat.primitives.asymmetric.rsa
import cryptography.hazmat.primitives.serialization
import cryptography.hazmat.primitives.hashes


def create_pem_file(path):
    default_backend = cryptography.hazmat.backends.default_backend()
    rsa = cryptography.hazmat.primitives.asymmetric.rsa
    serialization = cryptography.hazmat.primitives.serialization
    hashes = cryptography.hazmat.primitives.hashes
    x509 = cryptography.x509

    subject = issuer = x509.Name([])

    private_key = rsa.generate_private_key(public_exponent=65537,
                                           key_size=2048,
                                           backend=default_backend)
    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        private_key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.datetime.utcnow()
    ).not_valid_after(
        datetime.datetime.utcnow() + datetime.timedelta(days=1)
    ).sign(private_key, hashes.SHA256(), default_backend)

    private_key_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption())
    cert_bytes = cert.public_bytes(serialization.Encoding.PEM)

    with open(path, 'wb') as f:
        f.write(private_key_bytes)
        f.write(cert_bytes)
