"""Tests for encryption utilities."""
import pytest

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
