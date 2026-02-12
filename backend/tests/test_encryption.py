"""Tests for encryption utilities."""
import base64
import os
import pytest
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.encryption import Encryption, encryption


class TestEncryption:
    """Test AES-256-GCM encryption."""

    def test_encrypt_decrypt_roundtrip(self):
        """Encrypted data should decrypt to original."""
        enc = Encryption("test-key-that-is-32-bytes-long!!")
        original = "my-secret-api-key-12345"

        encrypted = enc.encrypt(original)
        decrypted = enc.decrypt(encrypted)

        assert decrypted == original
        assert encrypted != original

    def test_different_encryptions_are_unique(self):
        """Each encryption should produce different ciphertext (due to random nonce)."""
        enc = Encryption("test-key-that-is-32-bytes-long!!")
        original = "my-secret-api-key"

        encrypted1 = enc.encrypt(original)
        encrypted2 = enc.encrypt(original)

        assert encrypted1 != encrypted2  # Different nonces
        assert enc.decrypt(encrypted1) == enc.decrypt(encrypted2)  # Same plaintext

    def test_empty_string_raises_error(self):
        """Empty string should raise ValueError."""
        enc = Encryption("test-key-that-is-32-bytes-long!!")

        with pytest.raises(ValueError):
            enc.encrypt("")

        with pytest.raises(ValueError):
            enc.decrypt("")

    def test_invalid_ciphertext_raises_error(self):
        """Invalid ciphertext should raise ValueError."""
        enc = Encryption("test-key-that-is-32-bytes-long!!")

        with pytest.raises(ValueError):
            enc.decrypt("invalid-not-base64")

    def test_wrong_key_fails_decryption(self):
        """Wrong key should fail to decrypt."""
        enc1 = Encryption("test-key-one-that-is-32-bytes!!")
        enc2 = Encryption("test-key-two-that-is-32-bytes!!")

        encrypted = enc1.encrypt("secret")

        with pytest.raises(ValueError):
            enc2.decrypt(encrypted)

    def test_short_key_is_padded(self):
        """Short keys should be padded to 32 bytes."""
        enc = Encryption("short")
        original = "test-value"

        encrypted = enc.encrypt(original)
        decrypted = enc.decrypt(encrypted)

        assert decrypted == original

    def test_long_key_is_truncated(self):
        """Long keys should be truncated to 32 bytes."""
        enc = Encryption("this-is-a-very-long-key-that-exceeds-32-bytes-limit")
        original = "test-value"

        encrypted = enc.encrypt(original)
        decrypted = enc.decrypt(encrypted)

        assert decrypted == original

    def test_special_characters_in_plaintext(self):
        """Should handle special characters and unicode."""
        enc = Encryption("test-key-that-is-32-bytes-long!!")
        original = "api-key-with-special-chars!@#$%^&*()_+émojis🎉"

        encrypted = enc.encrypt(original)
        decrypted = enc.decrypt(encrypted)

        assert decrypted == original

    def test_global_encryption_instance(self):
        """Global encryption instance should work."""
        original = "test-api-key"

        encrypted = encryption.encrypt(original)
        decrypted = encryption.decrypt(encrypted)

        assert decrypted == original

    def test_strict_mode_rejects_invalid_key_format(self):
        """Strict mode should fail fast for invalid key material."""
        with pytest.raises(ValueError):
            Encryption("short", allow_legacy_fallback=False)

    def test_strict_mode_accepts_base64_key(self):
        """Strict mode should accept URL-safe base64 keys for 32-byte values."""
        raw = b"0123456789abcdef0123456789abcdef"
        strict_key = base64.urlsafe_b64encode(raw).decode("utf-8")
        enc = Encryption(strict_key, allow_legacy_fallback=False)

        encrypted = enc.encrypt("secret")
        assert enc.decrypt(encrypted) == "secret"

    def test_legacy_truncated_key_can_still_decrypt_with_base64_key(self):
        """Compatibility mode should decrypt payloads written by legacy truncation logic."""
        raw = b"0123456789abcdef0123456789abcdef"
        base64_key = base64.urlsafe_b64encode(raw).decode("utf-8")

        # Legacy releases treated configured keys as raw bytes and truncated to 32 bytes.
        legacy_key = base64_key.encode("utf-8")[:32]
        legacy_aes = AESGCM(legacy_key)
        nonce = os.urandom(12)
        ciphertext = legacy_aes.encrypt(nonce, b"secret", associated_data=None)
        legacy_payload = base64.b64encode(nonce + ciphertext).decode("utf-8")

        enc = Encryption(base64_key, allow_legacy_fallback=True)
        assert enc.decrypt(legacy_payload) == "secret"

    def test_strict_mode_rejects_legacy_truncated_ciphertext(self):
        """Strict mode should not silently accept legacy-truncated key ciphertext."""
        raw = b"0123456789abcdef0123456789abcdef"
        base64_key = base64.urlsafe_b64encode(raw).decode("utf-8")
        legacy_key = base64_key.encode("utf-8")[:32]
        legacy_aes = AESGCM(legacy_key)
        nonce = os.urandom(12)
        ciphertext = legacy_aes.encrypt(nonce, b"secret", associated_data=None)
        legacy_payload = base64.b64encode(nonce + ciphertext).decode("utf-8")

        enc = Encryption(base64_key, allow_legacy_fallback=False)
        with pytest.raises(ValueError):
            enc.decrypt(legacy_payload)
