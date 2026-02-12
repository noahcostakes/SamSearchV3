"""Tests for security utilities."""


from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_tokens,
    decode_token,
    hash_password,
    verify_password,
    verify_token_type,
)


class TestPasswordHashing:
    """Test password hashing with Argon2id."""

    def test_hash_password_produces_hash(self):
        """Hashing should produce a hash different from original."""
        password = "SecurePassword123!"
        hashed = hash_password(password)

        assert hashed != password
        assert len(hashed) > 50  # Argon2 hashes are long

    def test_verify_correct_password(self):
        """Correct password should verify."""
        password = "SecurePassword123!"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True

    def test_verify_wrong_password(self):
        """Wrong password should not verify."""
        password = "SecurePassword123!"
        wrong_password = "WrongPassword456!"
        hashed = hash_password(password)

        assert verify_password(wrong_password, hashed) is False

    def test_same_password_produces_different_hashes(self):
        """Same password should produce different hashes (due to salt)."""
        password = "SecurePassword123!"
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        assert hash1 != hash2
        # Both should still verify
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestJWTTokens:
    """Test JWT token creation and verification."""

    def test_create_access_token(self):
        """Access token should be created with correct claims."""
        user_id = "test-user-123"
        token = create_access_token(user_id)

        assert token is not None
        payload = decode_token(token)
        assert payload["sub"] == user_id
        assert payload["type"] == "access"

    def test_create_refresh_token(self):
        """Refresh token should be created with correct claims."""
        user_id = "test-user-123"
        token = create_refresh_token(user_id)

        assert token is not None
        payload = decode_token(token)
        assert payload["sub"] == user_id
        assert payload["type"] == "refresh"

    def test_create_tokens_returns_pair(self):
        """create_tokens should return both access and refresh tokens."""
        user_id = "test-user-123"
        access, refresh = create_tokens(user_id)

        assert access is not None
        assert refresh is not None
        assert access != refresh

        access_payload = decode_token(access)
        refresh_payload = decode_token(refresh)

        assert access_payload["type"] == "access"
        assert refresh_payload["type"] == "refresh"

    def test_decode_invalid_token_returns_none(self):
        """Invalid token should return None."""
        payload = decode_token("invalid-token")
        assert payload is None

    def test_verify_token_type_correct(self):
        """Token type verification should pass for correct type."""
        user_id = "test-user-123"
        access_token = create_access_token(user_id)
        refresh_token = create_refresh_token(user_id)

        access_payload = decode_token(access_token)
        refresh_payload = decode_token(refresh_token)

        assert verify_token_type(access_payload, "access") is True
        assert verify_token_type(refresh_payload, "refresh") is True

    def test_verify_token_type_incorrect(self):
        """Token type verification should fail for wrong type."""
        user_id = "test-user-123"
        access_token = create_access_token(user_id)
        refresh_token = create_refresh_token(user_id)

        access_payload = decode_token(access_token)
        refresh_payload = decode_token(refresh_token)

        assert verify_token_type(access_payload, "refresh") is False
        assert verify_token_type(refresh_payload, "access") is False

    def test_token_contains_issued_at(self):
        """Token should contain 'iat' claim."""
        user_id = "test-user-123"
        token = create_access_token(user_id)
        payload = decode_token(token)

        assert "iat" in payload

    def test_token_contains_expiration(self):
        """Token should contain 'exp' claim."""
        user_id = "test-user-123"
        token = create_access_token(user_id)
        payload = decode_token(token)

        assert "exp" in payload
