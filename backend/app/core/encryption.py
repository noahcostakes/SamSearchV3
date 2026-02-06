"""AES-256-GCM encryption for sensitive data at rest."""
import base64
import os
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class Encryption:
    """AES-256-GCM encryption for sensitive data."""

    def __init__(self, master_key: str):
        """Initialize with master encryption key."""
        # Ensure key is 32 bytes for AES-256
        key_bytes = master_key.encode("utf-8")
        if len(key_bytes) < 32:
            # Pad key if too short (for development)
            key_bytes = key_bytes.ljust(32, b"\0")
        elif len(key_bytes) > 32:
            # Truncate if too long
            key_bytes = key_bytes[:32]
        self._aesgcm = AESGCM(key_bytes)

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext using AES-256-GCM.

        Returns base64-encoded string: nonce + ciphertext + tag
        """
        if not plaintext:
            raise ValueError("Cannot encrypt empty string")

        # Generate random 12-byte nonce
        nonce = os.urandom(12)

        # Encrypt
        ciphertext = self._aesgcm.encrypt(
            nonce, plaintext.encode("utf-8"), associated_data=None
        )

        # Combine nonce + ciphertext and base64 encode
        encrypted = nonce + ciphertext
        return base64.b64encode(encrypted).decode("utf-8")

    def decrypt(self, encrypted_data: str) -> str:
        """
        Decrypt base64-encoded encrypted data.

        Expects format: base64(nonce + ciphertext + tag)
        """
        if not encrypted_data:
            raise ValueError("Cannot decrypt empty string")

        try:
            # Decode from base64
            encrypted_bytes = base64.b64decode(encrypted_data)

            # Extract nonce (first 12 bytes) and ciphertext
            nonce = encrypted_bytes[:12]
            ciphertext = encrypted_bytes[12:]

            # Decrypt
            plaintext = self._aesgcm.decrypt(nonce, ciphertext, associated_data=None)
            return plaintext.decode("utf-8")

        except Exception as e:
            logger.error(f"Decryption failed: {type(e).__name__}")
            raise ValueError("Decryption failed") from e


def get_encryption() -> Encryption:
    """Get encryption instance with master key from settings."""
    return Encryption(settings.ENCRYPTION_MASTER_KEY)


# Global encryption instance
encryption = get_encryption()
