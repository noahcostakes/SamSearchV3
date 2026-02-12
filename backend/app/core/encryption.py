"""AES-256-GCM encryption for sensitive data at rest."""
import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class Encryption:
    """AES-256-GCM encryption for sensitive data."""

    def __init__(self, master_key: str, allow_legacy_fallback: bool = True):
        """Initialize with master encryption key."""
        key_bytes, decrypt_keys = self._derive_keys(
            master_key,
            allow_legacy_fallback=allow_legacy_fallback,
        )
        self._aesgcm = AESGCM(key_bytes)
        self._decrypt_aesgcm = [AESGCM(key) for key in decrypt_keys]

    @staticmethod
    def _decode_base64_key(master_key: str) -> bytes | None:
        """Decode a URL-safe base64 key and validate byte length."""
        try:
            padded = master_key + "=" * (-len(master_key) % 4)
            decoded = base64.urlsafe_b64decode(padded.encode("utf-8"))
        except Exception:
            return None
        if len(decoded) == 32:
            return decoded
        return None

    @staticmethod
    def _legacy_key(raw_key: bytes) -> bytes:
        """Legacy key derivation (pad/truncate) used by older releases."""
        if len(raw_key) < 32:
            return raw_key.ljust(32, b"\0")
        return raw_key[:32]

    def _derive_keys(
        self, master_key: str, allow_legacy_fallback: bool
    ) -> tuple[bytes, list[bytes]]:
        """Derive primary encrypt key plus compatibility decrypt keys."""
        normalized = master_key.strip() if master_key else ""
        if not normalized:
            raise ValueError("ENCRYPTION_MASTER_KEY cannot be empty")

        # Preferred format: URL-safe base64 string that decodes to 32 bytes.
        decoded = self._decode_base64_key(normalized)
        raw = normalized.encode("utf-8")
        decrypt_keys: list[bytes] = []

        def add_key(candidate: bytes) -> None:
            if all(candidate != existing for existing in decrypt_keys):
                decrypt_keys.append(candidate)

        if decoded is not None:
            add_key(decoded)
            if allow_legacy_fallback:
                legacy = self._legacy_key(raw)
                if legacy != decoded:
                    logger.warning(
                        "Encryption key supports legacy decrypt fallback. "
                        "Re-save encrypted values to migrate to strict key material."
                    )
                    add_key(legacy)
            return decoded, decrypt_keys

        if len(raw) == 32:
            add_key(raw)
            return raw, decrypt_keys

        if allow_legacy_fallback:
            logger.warning(
                "Using legacy encryption key fallback (pad/truncate). "
                "Set a strict 32-byte or base64-encoded key to remove this warning.",
                extra={"configured_key_length": len(raw)},
            )
            legacy = self._legacy_key(raw)
            add_key(legacy)
            return legacy, decrypt_keys

        raise ValueError(
            "Invalid ENCRYPTION_MASTER_KEY format. Provide a 32-byte string or "
            "URL-safe base64 that decodes to 32 bytes."
        )

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

            # Decrypt with primary key, then compatibility keys if configured.
            last_error = None
            for idx, aesgcm in enumerate(self._decrypt_aesgcm):
                try:
                    plaintext = aesgcm.decrypt(nonce, ciphertext, associated_data=None)
                    if idx > 0:
                        logger.warning(
                            "Decrypted value using compatibility key. "
                            "Consider re-saving the value to migrate encryption format."
                        )
                    return plaintext.decode("utf-8")
                except Exception as e:  # noqa: PERF203
                    last_error = e

            logger.error(
                "Decryption failed with all configured keys",
                extra={"attempted_key_count": len(self._decrypt_aesgcm)},
            )
            raise ValueError("Decryption failed") from last_error

        except Exception as e:
            logger.error(f"Decryption failed: {type(e).__name__}")
            raise ValueError("Decryption failed") from e


def get_encryption() -> Encryption:
    """Get encryption instance with master key from settings."""
    return Encryption(
        settings.ENCRYPTION_MASTER_KEY,
        allow_legacy_fallback=settings.ENCRYPTION_ALLOW_LEGACY_FALLBACK,
    )


# Global encryption instance
encryption = get_encryption()
